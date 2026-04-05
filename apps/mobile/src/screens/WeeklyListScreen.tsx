import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useListStore } from '../store/listStore';
import { useAuthStore } from '../store/authStore';
import { compareApi, productsApi, type CompareResult, type Product } from '../api/client';
import { radius, shadow, spacing, theme } from '../constants/theme';
import { LoadingSpinner } from '../components/LoadingSpinner';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList, TabParamList } from '../../App';
import type { Item } from '../api/client';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList>;
};

const CATEGORY_EMOJI: Record<string, string> = {
  dairy: '🥛',
  bread: '🍞',
  meat: '🥩',
  'fruit & veg': '🥦',
  pantry: '🥫',
  drinks: '🥤',
  household: '🧴',
};

function getCategoryEmoji(cat?: string | null) {
  return CATEGORY_EMOJI[cat?.toLowerCase() ?? ''] ?? '🛒';
}

// ── Compare banner ─────────────────────────────────────────────────────────────

function CompareBanner({
  listId,
  itemCount,
  onPress,
}: {
  listId: string;
  itemCount: number;
  onPress: (result: CompareResult) => void;
}) {
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (itemCount === 0) return;
    setLoading(true);
    compareApi.compare(listId)
      .then(setResult)
      .catch(() => setResult(null))
      .finally(() => setLoading(false));
  }, [listId, itemCount]);

  if (itemCount === 0) return null;

  if (loading) {
    return (
      <View style={bannerStyles.wrap}>
        <LoadingSpinner color="#fff" />
        <Text style={bannerStyles.loadingText}>Comparing prices…</Text>
      </View>
    );
  }

  if (!result) return null;

  const cheaper = result.cheaperStore ?? 'Coles';
  const fm = result.coles.total.toFixed(2);
  const vg = result.woolworths.total.toFixed(2);
  const saving = result.saving.amount.toFixed(2);

  return (
    <Pressable
      style={({ pressed }) => [bannerStyles.wrap, pressed && { opacity: 0.9 }]}
      onPress={() => onPress(result)}
    >
      <View style={bannerStyles.left}>
        <Text style={bannerStyles.storeLabel}>Best: {cheaper}</Text>
        <Text style={bannerStyles.prices}>
          FM ${fm}  ·  VG ${vg}
        </Text>
      </View>
      <View style={bannerStyles.right}>
        <Text style={bannerStyles.saveLabel}>You save</Text>
        <Text style={bannerStyles.saveAmount}>${saving}</Text>
      </View>
      <Text style={bannerStyles.arrow}>›</Text>
    </Pressable>
  );
}

const bannerStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.20)',
    borderRadius: radius.md,
    padding: 12,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  loadingText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginLeft: 8 },
  left: { flex: 1 },
  storeLabel: { color: '#fff', fontWeight: '700', fontSize: 14 },
  prices: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  saveLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11 },
  saveAmount: { color: '#fff', fontWeight: '800', fontSize: 20, letterSpacing: -0.5 },
  arrow: { color: 'rgba(255,255,255,0.6)', fontSize: 22 },
});

// ── Item row ───────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  fmPrice,
  vgPrice,
  onToggle,
  onDelete,
}: {
  item: Item;
  fmPrice?: number;
  vgPrice?: number;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const cheaperPrice = fmPrice !== undefined && vgPrice !== undefined
    ? Math.min(fmPrice, vgPrice)
    : fmPrice ?? vgPrice;
  const cheaperStore = fmPrice !== undefined && vgPrice !== undefined
    ? (fmPrice <= vgPrice ? 'FM' : 'VG')
    : undefined;

  return (
    <View style={itemStyles.row}>
      <Pressable onPress={onToggle} hitSlop={8} style={itemStyles.checkWrap}>
        <View style={[itemStyles.checkbox, item.checked && itemStyles.checkboxChecked]}>
          {item.checked && <Text style={itemStyles.checkmark}>✓</Text>}
        </View>
      </Pressable>
      <Text style={itemStyles.emoji}>{getCategoryEmoji(item.category)}</Text>
      <View style={itemStyles.body}>
        <Text style={[itemStyles.name, item.checked && itemStyles.nameDone]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={itemStyles.qty}>{item.quantity} {item.unit}</Text>
      </View>
      {cheaperPrice !== undefined && (
        <View style={itemStyles.priceWrap}>
          <Text style={itemStyles.price}>${(cheaperPrice * item.quantity).toFixed(2)}</Text>
          {cheaperStore && <Text style={itemStyles.storeTag}>{cheaperStore}</Text>}
        </View>
      )}
      <Pressable onPress={onDelete} hitSlop={8} style={itemStyles.del}>
        <Text style={itemStyles.delIcon}>✕</Text>
      </Pressable>
    </View>
  );
}

const itemStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: 8,
    backgroundColor: theme.surface,
  },
  checkWrap: { padding: 2 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: theme.primary, borderColor: theme.primary },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  emoji: { fontSize: 18, width: 26, textAlign: 'center' },
  body: { flex: 1 },
  name: { fontSize: 15, fontWeight: '500', color: theme.textPrimary },
  nameDone: { textDecorationLine: 'line-through', color: theme.textHint },
  qty: { fontSize: 12, color: theme.textSecondary, marginTop: 1 },
  priceWrap: { alignItems: 'flex-end' },
  price: { fontSize: 13, fontWeight: '700', color: theme.textPrimary },
  storeTag: { fontSize: 10, color: theme.primary, fontWeight: '600' },
  del: { padding: 4 },
  delIcon: { color: theme.textHint, fontSize: 13 },
});

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({
  category,
  total,
  checked,
}: {
  category: string;
  total: number;
  checked: number;
}) {
  return (
    <View style={sectionStyles.header}>
      <Text style={sectionStyles.emoji}>{getCategoryEmoji(category)}</Text>
      <Text style={sectionStyles.title}>{category.charAt(0).toUpperCase() + category.slice(1)}</Text>
      <Text style={sectionStyles.progress}>{checked}/{total}</Text>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: theme.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: 8,
  },
  emoji: { fontSize: 16 },
  title: { flex: 1, fontSize: 13, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  progress: { fontSize: 12, color: theme.textHint, fontWeight: '600' },
});

// ── Search / Add panel ─────────────────────────────────────────────────────────

function AddPanel({
  listId,
  onClose,
}: {
  listId: string;
  onClose: () => void;
}) {
  const { addItem } = useListStore();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const CATEGORIES = [
    { key: 'dairy', label: 'Dairy', emoji: '🥛' },
    { key: 'bread', label: 'Bread', emoji: '🍞' },
    { key: 'meat', label: 'Meat', emoji: '🥩' },
    { key: 'fruit & veg', label: 'Produce', emoji: '🥦' },
    { key: 'pantry', label: 'Pantry', emoji: '🥫' },
    { key: 'drinks', label: 'Drinks', emoji: '🥤' },
    { key: 'household', label: 'Home', emoji: '🧴' },
    { key: 'cleaning', label: 'Cleaning', emoji: '🧹' },
    { key: 'confectionery', label: 'Confectionary', emoji: '🍫' },
  ];

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() && !activeCategory) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await productsApi.search(
          query.trim() || undefined,
          activeCategory ?? undefined,
        );
        setResults(data ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
  }, [query, activeCategory]);

  // Load category immediately on tap
  const handleCategory = (key: string) => {
    setActiveCategory(prev => prev === key ? null : key);
    setQuery('');
  };

  const handleAddProduct = async (product: Product) => {
    setAddingId(product.id);
    try {
      await addItem(listId, {
        name: product.name,
        quantity: 1,
        unit: product.unit,
        productId: product.id,
        category: product.category,
      });
    } finally {
      setAddingId(null);
    }
  };

  const handleAddCustom = async () => {
    const n = query.trim();
    if (!n) return;
    setAddingId('custom');
    try {
      await addItem(listId, { name: n, quantity: 1, unit: 'each' });
      setQuery('');
      setResults([]);
      onClose();
    } finally {
      setAddingId(null);
    }
  };

  const STORE_BRANDS: Record<string, { label: string; bg: string }> = {
    'Coles':      { label: 'Coles',   bg: '#E31837' },
    'Woolworths': { label: 'Woolies', bg: '#007B40' },
    'IGA':        { label: 'IGA',     bg: '#EF5A0E' },
    'ALDI':       { label: 'ALDI',    bg: '#004A97' },
  };
  const getStorePrices = (p: Product) =>
    ['Coles', 'Woolworths', 'IGA', 'ALDI']
      .map(s => ({ store: s, amount: p.prices.find(x => x.store === s)?.amount }))
      .filter(x => x.amount !== undefined) as { store: string; amount: number }[];

  return (
    <View style={addStyles.panel}>
      {/* Handle */}
      <View style={addStyles.handle} />

      {/* Search bar */}
      <View style={addStyles.searchRow}>
        <Text style={addStyles.searchIcon}>🔍</Text>
        <TextInput
          style={addStyles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search products or type custom item…"
          placeholderTextColor={theme.textHint}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleAddCustom}
          clearButtonMode="while-editing"
        />
        <Pressable onPress={onClose} hitSlop={8}>
          <Text style={addStyles.closeBtn}>✕</Text>
        </Pressable>
      </View>

      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={addStyles.categoryScroll}
        contentContainerStyle={addStyles.categoryContent}
      >
        {CATEGORIES.map(cat => (
          <Pressable
            key={cat.key}
            style={[addStyles.catPill, activeCategory === cat.key && addStyles.catPillActive]}
            onPress={() => handleCategory(cat.key)}
          >
            <Text style={addStyles.catEmoji}>{cat.emoji}</Text>
            <Text style={[addStyles.catLabel, activeCategory === cat.key && addStyles.catLabelActive]}>
              {cat.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Results */}
      {searching ? (
        <View style={addStyles.center}>
          <LoadingSpinner color={theme.primary} />
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={p => p.id}
          style={addStyles.results}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item: product }) => {
            const storePrices = getStorePrices(product);
            return (
              <Pressable
                style={({ pressed }) => [addStyles.resultRow, pressed && addStyles.resultRowPressed]}
                onPress={() => handleAddProduct(product)}
                disabled={addingId === product.id}
              >
                <Text style={addStyles.resultEmoji}>{product.categoryEmoji || getCategoryEmoji(product.category)}</Text>
                <View style={addStyles.resultInfo}>
                  <Text style={addStyles.resultName} numberOfLines={1}>{product.name}</Text>
                  <View style={addStyles.resultPrices}>
                    {storePrices.map(sp => {
                      const brand = STORE_BRANDS[sp.store];
                      return (
                        <View key={sp.store} style={{ flexDirection: 'row', borderRadius: 4, overflow: 'hidden', marginRight: 4 }}>
                          <View style={{ backgroundColor: brand.bg, paddingHorizontal: 4, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff' }}>{brand.label}</Text>
                          </View>
                          <View style={{ backgroundColor: '#EFEFEF', paddingHorizontal: 4, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 9, fontWeight: '600', color: '#333' }}>${sp.amount.toFixed(2)}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
                {addingId === product.id ? (
                  <LoadingSpinner color={theme.primary} />
                ) : (
                  <View style={addStyles.addChip}>
                    <Text style={addStyles.addChipText}>+</Text>
                  </View>
                )}
              </Pressable>
            );
          }}
          ListFooterComponent={
            query.trim() ? (
              <Pressable style={addStyles.customRow} onPress={handleAddCustom} disabled={addingId === 'custom'}>
                <Text style={addStyles.customText}>
                  Add <Text style={addStyles.customBold}>"{query.trim()}"</Text> as custom item
                </Text>
                {addingId === 'custom' ? <LoadingSpinner color={theme.textSecondary} /> : (
                  <View style={[addStyles.addChip, addStyles.addChipOutline]}>
                    <Text style={[addStyles.addChipText, addStyles.addChipOutlineText]}>+</Text>
                  </View>
                )}
              </Pressable>
            ) : null
          }
        />
      ) : (query.trim() || activeCategory) ? (
        query.trim() ? (
          <Pressable style={addStyles.noResultRow} onPress={handleAddCustom} disabled={addingId === 'custom'}>
            <View style={{ flex: 1 }}>
              <Text style={addStyles.resultName}>"{query.trim()}"</Text>
              <Text style={[addStyles.resultName, { fontSize: 12, color: theme.textSecondary, fontWeight: '400' }]}>Custom item · tap to add</Text>
            </View>
            {addingId === 'custom' ? <LoadingSpinner color={theme.primary} /> : (
              <View style={addStyles.addChip}><Text style={addStyles.addChipText}>+</Text></View>
            )}
          </Pressable>
        ) : (
          <Text style={addStyles.hint}>No products in this category</Text>
        )
      ) : (
        <Text style={addStyles.hint}>Search above or pick a category</Text>
      )}
    </View>
  );
}

const addStyles = StyleSheet.create({
  panel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: theme.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: 480,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    ...shadow.md,
  },
  handle: { width: 36, height: 4, backgroundColor: theme.border, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.textPrimary,
    paddingVertical: 4,
  },
  closeBtn: { fontSize: 16, color: theme.textSecondary, padding: 4 },

  categoryScroll: { flexGrow: 0 },
  categoryContent: { paddingHorizontal: spacing.md, paddingVertical: 10, gap: 8 },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.background,
  },
  catPillActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  catEmoji: { fontSize: 14 },
  catLabel: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
  catLabelActive: { color: '#fff' },

  results: { maxHeight: 300 },
  center: { padding: spacing.lg, alignItems: 'center' },
  hint: { padding: spacing.lg, textAlign: 'center', color: theme.textHint, fontSize: 14 },

  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: 10,
  },
  resultRowPressed: { backgroundColor: theme.background },
  resultEmoji: { fontSize: 22, width: 32, textAlign: 'center' },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
  resultPrices: { flexDirection: 'row', gap: 8, marginTop: 2 },
  fmPrice: { fontSize: 12, color: theme.primary, fontWeight: '600' },
  vgPrice: { fontSize: 12, color: theme.textSecondary },

  addChip: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: theme.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  addChipText: { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 22 },
  addChipOutline: { backgroundColor: 'transparent', borderWidth: 2, borderColor: theme.primary },
  addChipOutlineText: { color: theme.primary },

  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: theme.primaryLight,
    gap: 10,
  },
  customText: { flex: 1, fontSize: 14, color: theme.textSecondary },
  customBold: { fontWeight: '700', color: theme.textPrimary },

  noResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: theme.primaryLight,
    borderRadius: radius.md,
    gap: 10,
  },
});

// ── Main screen ────────────────────────────────────────────────────────────────

function displayName(email?: string | null) {
  if (!email) return '';
  const prefix = email.split('@')[0];
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

export function WeeklyListScreen({ navigation }: Props) {
  const {
    currentWeekList, carriedCount, carriedFrom,
    isLoadingWeek, items, isLoadingItems,
    fetchCurrentWeek, fetchItems,
    toggleItem, deleteItem,
  } = useListStore();
  const user = useAuthStore(s => s.user);

  const [showAdd, setShowAdd] = useState(false);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);

  useEffect(() => {
    fetchCurrentWeek();
  }, []);

  useEffect(() => {
    if (currentWeekList) {
      fetchItems(currentWeekList.id);
    }
  }, [currentWeekList?.id]);

  // Group items by category for SectionList
  const sections = React.useMemo(() => {
    if (!items.length) return [];
    const groups: Record<string, Item[]> = {};
    for (const item of items) {
      const cat = item.category ?? 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return Object.entries(groups).map(([cat, data]) => ({ title: cat, data }));
  }, [items]);

  // Price lookup from compare result
  const getPrices = useCallback((itemName: string) => {
    if (!compareResult) return {};
    const found = compareResult.items.find(i => i.name.toLowerCase() === itemName.toLowerCase());
    return {
      fm: found?.coles?.unitPrice,
      vg: found?.woolworths?.unitPrice,
    };
  }, [compareResult]);

  const checkedCount = items.filter(i => i.checked).length;
  const weekLabel = currentWeekList?.name ?? 'This Week';

  // Estimated total from compare
  const estTotal = compareResult
    ? Math.min(compareResult.coles.total, compareResult.woolworths.total).toFixed(2)
    : null;

  if (isLoadingWeek && !currentWeekList) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.greenHeader}>
          <Text style={styles.headerTitle}>This Week</Text>
        </View>
        <LoadingSpinner fullScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Green header */}
      <View style={styles.greenHeader}>
        <View style={styles.headerTop}>
          <View>
            {user?.email ? (
              <Text style={styles.headerGreeting}>Hey, {displayName(user.email)}</Text>
            ) : null}
            <Text style={styles.headerWeekLabel}>This Week</Text>
            <Text style={styles.headerWeekName} numberOfLines={1}>{weekLabel}</Text>
          </View>
          <Pressable
            style={styles.historyBtn}
            onPress={() => navigation.navigate('History')}
          >
            <Text style={styles.historyBtnText}>History</Text>
          </Pressable>
        </View>

        {/* Stats row */}
        {items.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{items.length}</Text>
              <Text style={styles.statLabel}>Items</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{checkedCount}</Text>
              <Text style={styles.statLabel}>Ticked</Text>
            </View>
            {estTotal && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>${estTotal}</Text>
                  <Text style={styles.statLabel}>Est. total</Text>
                </View>
              </>
            )}
            {compareResult?.saving.amount ? (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, styles.statSaving]}>
                    ${compareResult.saving.amount.toFixed(2)}
                  </Text>
                  <Text style={styles.statLabel}>You save</Text>
                </View>
              </>
            ) : null}
          </View>
        )}

        {/* Compare banner */}
        {currentWeekList && (
          <CompareBanner
            listId={currentWeekList.id}
            itemCount={items.length}
            onPress={(r) => {
              setCompareResult(r);
              navigation.navigate('Compare', { listId: currentWeekList.id });
            }}
          />
        )}
      </View>

      {/* Carried forward banner */}
      {carriedCount > 0 && carriedFrom && (
        <View style={styles.carriedBanner}>
          <Text style={styles.carriedText}>
            ↩ {carriedCount} items carried from {carriedFrom.name}
          </Text>
        </View>
      )}

      {/* Items */}
      {isLoadingItems && items.length === 0 ? (
        <LoadingSpinner fullScreen />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>Start your week</Text>
          <Text style={styles.emptySubtitle}>Tap + Add item to build your list</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => (
            <SectionHeader
              category={section.title}
              total={section.data.length}
              checked={section.data.filter(i => i.checked).length}
            />
          )}
          renderItem={({ item }) => {
            const { fm, vg } = getPrices(item.name);
            return (
              <ItemRow
                item={item}
                fmPrice={fm}
                vgPrice={vg}
                onToggle={() => toggleItem(currentWeekList!.id, item.id, !item.checked)}
                onDelete={() => deleteItem(currentWeekList!.id, item.id)}
              />
            );
          }}
        />
      )}

      {/* Add panel or FAB */}
      {currentWeekList && showAdd ? (
        <AddPanel
          listId={currentWeekList.id}
          onClose={() => setShowAdd(false)}
        />
      ) : (
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
          onPress={() => setShowAdd(true)}
        >
          <Text style={styles.fabText}>+ Add item</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },

  greenHeader: {
    backgroundColor: theme.primary,
    paddingTop: 4,
    paddingBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerGreeting: { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 2 },
  headerTitle: { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  headerWeekLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  headerWeekName: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.8, maxWidth: 220 },
  historyBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 4,
  },
  historyBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: 0,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  statSaving: { color: theme.secondary },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },

  carriedBanner: {
    backgroundColor: theme.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  carriedText: { fontSize: 13, color: theme.primary, fontWeight: '600' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 56, marginBottom: spacing.md },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: theme.textPrimary, marginBottom: spacing.sm },
  emptySubtitle: { fontSize: 15, color: theme.textSecondary, textAlign: 'center' },

  fab: {
    position: 'absolute', bottom: spacing.xl, right: spacing.md,
    backgroundColor: theme.primary,
    borderRadius: radius.full,
    paddingVertical: 14, paddingHorizontal: spacing.lg,
    ...shadow.md,
  },
  pressed: { opacity: 0.85 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
