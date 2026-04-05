import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const STORE_BRANDS: Record<string, { label: string; bg: string; text: string }> = {
  'Coles':      { label: 'Coles',   bg: '#E31837', text: '#fff' },
  'Woolworths': { label: 'Woolies', bg: '#007B40', text: '#fff' },
  'IGA':        { label: 'IGA',     bg: '#EF5A0E', text: '#fff' },
  'ALDI':       { label: 'ALDI',    bg: '#004A97', text: '#fff' },
};

function StorePricePill({ store, amount }: { store: string; amount: number }) {
  const brand = STORE_BRANDS[store];
  if (!brand) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 4, overflow: 'hidden', marginRight: 4, marginTop: 3 }}>
      <View style={{ backgroundColor: brand.bg, paddingHorizontal: 5, paddingVertical: 2 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: brand.text }}>{brand.label}</Text>
      </View>
      <View style={{ backgroundColor: '#F0F0F0', paddingHorizontal: 5, paddingVertical: 2 }}>
        <Text style={{ fontSize: 10, fontWeight: '600', color: '#333' }}>${amount.toFixed(2)}</Text>
      </View>
    </View>
  );
}
import { SafeAreaView } from 'react-native-safe-area-context';
import { productsApi, type Product } from '../api/client';
import { useListStore } from '../store/listStore';
import { radius, shadow, spacing, theme } from '../constants/theme';
import { LoadingSpinner } from '../components/LoadingSpinner';

const CATEGORIES = [
  { key: 'dairy', label: 'Dairy', emoji: '🥛' },
  { key: 'bread', label: 'Bread', emoji: '🍞' },
  { key: 'meat', label: 'Meat', emoji: '🥩' },
  { key: 'fruit & veg', label: 'Produce', emoji: '🥦' },
  { key: 'pantry', label: 'Pantry', emoji: '🥫' },
  { key: 'drinks', label: 'Drinks', emoji: '🥤' },
  { key: 'household', label: 'Home', emoji: '🧴' },
  { key: 'cleaning', label: 'Cleaning', emoji: '🧹' },
  { key: 'confectionery', label: 'Confect.', emoji: '🍫' },
];

export function BrowseScreen() {
  const { currentWeekList, addItem } = useListStore();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await productsApi.search(
          query.trim() || undefined,
          activeCategory ?? undefined,
        );
        setProducts(data ?? []);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, [query, activeCategory]);

  const handleAdd = async (product: Product) => {
    if (!currentWeekList) return;
    setAddingId(product.id);
    try {
      await addItem(currentWeekList.id, {
        name: product.name,
        quantity: 1,
        unit: product.unit,
        productId: product.id,
        category: product.category,
      });
      setAddedIds(prev => new Set(prev).add(product.id));
    } finally {
      setAddingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>Browse</Text>
        {currentWeekList && (
          <Text style={styles.subheading}>Adding to {currentWeekList.name}</Text>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search products…"
          placeholderTextColor={theme.textHint}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catScroll}
        contentContainerStyle={styles.catContent}
      >
        {CATEGORIES.map(cat => (
          <Pressable
            key={cat.key}
            style={[styles.catPill, activeCategory === cat.key && styles.catPillActive]}
            onPress={() => setActiveCategory(prev => prev === cat.key ? null : cat.key)}
          >
            <Text style={styles.catEmoji}>{cat.emoji}</Text>
            <Text style={[styles.catLabel, activeCategory === cat.key && styles.catLabelActive]}>
              {cat.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Products */}
      {loading ? (
        <LoadingSpinner fullScreen />
      ) : (
        <FlatList
          data={products}
          keyExtractor={p => p.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>No products found</Text>
            </View>
          }
          renderItem={({ item: product }) => {
            const added = addedIds.has(product.id);
            const storePrices = ['Coles', 'Woolworths', 'IGA', 'ALDI']
              .map(s => ({ store: s, amount: product.prices.find(p => p.store === s)?.amount }))
              .filter(x => x.amount !== undefined) as { store: string; amount: number }[];

            return (
              <View style={styles.productCard}>
                <Text style={styles.productEmoji}>{product.categoryEmoji}</Text>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                  <View style={styles.priceRow}>
                    {storePrices.map(sp => (
                      <StorePricePill key={sp.store} store={sp.store} amount={sp.amount} />
                    ))}
                  </View>
                </View>
                <Pressable
                  style={[styles.addBtn, added && styles.addBtnDone]}
                  onPress={() => handleAdd(product)}
                  disabled={addingId === product.id || added || !currentWeekList}
                >
                  {addingId === product.id ? (
                    <LoadingSpinner color="#fff" />
                  ) : (
                    <Text style={styles.addBtnText}>{added ? '✓' : '+'}</Text>
                  )}
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  header: { padding: spacing.md, paddingBottom: spacing.sm },
  heading: { fontSize: 28, fontWeight: '800', color: theme.textPrimary, letterSpacing: -0.5 },
  subheading: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: theme.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1.5,
    borderColor: theme.border,
    ...shadow.sm,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 15, color: theme.textPrimary },

  catScroll: { flexGrow: 0, marginBottom: spacing.sm },
  catContent: { paddingHorizontal: spacing.md, gap: 8 },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  catPillActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  catEmoji: { fontSize: 14 },
  catLabel: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
  catLabelActive: { color: '#fff' },

  list: { paddingHorizontal: spacing.md, gap: spacing.xs, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: spacing.sm },
  emptyText: { fontSize: 15, color: theme.textSecondary },

  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 10,
    ...shadow.sm,
  },
  productEmoji: { fontSize: 26, width: 36, textAlign: 'center' },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '600', color: theme.textPrimary },
  priceRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 },

  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnDone: { backgroundColor: theme.primaryDark },
  addBtnText: { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 24 },
});
