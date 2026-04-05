import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useListStore } from '../store/listStore';
import { productsApi } from '../api/client';
import { radius, shadow, spacing, theme } from '../constants/theme';
import { LoadingSpinner } from '../components/LoadingSpinner';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { ListsStackParamList, MainStackParamList } from '../../App';
import type { Item, Product } from '../api/client';

type Props = {
  navigation: NativeStackNavigationProp<ListsStackParamList, 'ListDetail'>;
  route: RouteProp<ListsStackParamList, 'ListDetail'>;
};

// ── Item row ──────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  onToggle,
  onDelete,
}: {
  item: Item;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.itemRow}>
      <Pressable style={styles.checkbox} onPress={onToggle} hitSlop={8}>
        <View style={[styles.checkboxBox, item.checked && styles.checkboxChecked]}>
          {item.checked && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </Pressable>
      <View style={styles.itemBody}>
        <Text style={[styles.itemName, item.checked && styles.itemNameDone]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.itemMeta}>
          {item.quantity} {item.unit}
          {item.notes ? ` · ${item.notes}` : ''}
        </Text>
      </View>
      <Pressable onPress={onDelete} hitSlop={8} style={styles.deleteBtn}>
        <Text style={styles.deleteIcon}>✕</Text>
      </Pressable>
    </View>
  );
}

// ── Search result row ─────────────────────────────────────────────────────────

function SearchResultRow({
  product,
  onAdd,
  adding,
}: {
  product: Product;
  onAdd: () => void;
  adding: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
      onPress={onAdd}
      disabled={adding}
    >
      <View style={styles.resultBody}>
        <Text style={styles.resultName} numberOfLines={1}>{product.name}</Text>
        <Text style={styles.resultMeta}>{product.category} · {product.unit}</Text>
      </View>
      {adding ? (
        <LoadingSpinner color={theme.primary} />
      ) : (
        <View style={styles.addChip}>
          <Text style={styles.addChipText}>+ Add</Text>
        </View>
      )}
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function ListDetailScreen({ navigation, route }: Props) {
  const { list } = route.params;
  const { items, isLoadingItems, fetchItems, addItem, deleteItem, toggleItem } = useListStore();

  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [customQty, setCustomQty] = useState('1');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: list.name });
    fetchItems(list.id);
  }, [list.id]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await productsApi.search(query.trim());
        setResults(data ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [query]);

  const checkedCount = items.filter((i) => i.checked).length;

  const handleAddProduct = async (product: Product) => {
    setAddingId(product.id);
    try {
      await addItem(list.id, {
        name: product.name,
        quantity: 1,
        unit: product.unit,
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
      await addItem(list.id, {
        name: n,
        quantity: parseFloat(customQty) || 1,
        unit: 'each',
      });
      setQuery('');
      setResults([]);
      setCustomQty('1');
      setShowAdd(false);
    } finally {
      setAddingId(null);
    }
  };

  const closeAdd = () => {
    setShowAdd(false);
    setQuery('');
    setResults([]);
    setCustomQty('1');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
      {/* Compare CTA */}
      <Pressable
        style={({ pressed }) => [styles.compareBtn, pressed && styles.pressed, items.length === 0 && styles.compareBtnDisabled]}
        onPress={() => navigation.getParent<NativeStackNavigationProp<MainStackParamList>>()?.navigate('Compare', { listId: list.id })}
        disabled={items.length === 0}
      >
        <Text style={styles.compareBtnText}>
          {items.length === 0 ? 'Add items to compare prices' : '⚖️  Compare prices'}
        </Text>
      </Pressable>

      {/* Item count */}
      {items.length > 0 && (
        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {items.length} {items.length === 1 ? 'item' : 'items'}
            {checkedCount > 0 ? ` · ${checkedCount} ticked` : ''}
          </Text>
        </View>
      )}

      {/* Items list */}
      {isLoadingItems && items.length === 0 ? (
        <LoadingSpinner fullScreen />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.listContent}
          renderItem={({ item }) => (
            <ItemRow
              item={item}
              onToggle={() => toggleItem(list.id, item.id, !item.checked)}
              onDelete={() => deleteItem(list.id, item.id)}
            />
          )}
          ListEmptyComponent={
            !showAdd ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>📝</Text>
                <Text style={styles.emptyTitle}>No items yet</Text>
                <Text style={styles.emptySubtitle}>Tap the button below to search for products.</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Add item panel */}
      {showAdd ? (
        <View style={styles.addPanel}>
          {/* Search bar */}
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search products or type a custom item…"
              placeholderTextColor={theme.textHint}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAddCustom}
              clearButtonMode="while-editing"
            />
            <Pressable onPress={closeAdd} hitSlop={8} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* Search results */}
          {searching ? (
            <View style={styles.searchLoading}>
              <LoadingSpinner color={theme.primary} />
              <Text style={styles.searchLoadingText}>Searching…</Text>
            </View>
          ) : results.length > 0 ? (
            <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
              {results.map((product) => (
                <SearchResultRow
                  key={product.id}
                  product={product}
                  onAdd={() => handleAddProduct(product)}
                  adding={addingId === product.id}
                />
              ))}
              {/* Custom item fallback at bottom of results */}
              {query.trim().length > 0 && (
                <Pressable
                  style={({ pressed }) => [styles.customRow, pressed && styles.resultRowPressed]}
                  onPress={handleAddCustom}
                  disabled={addingId === 'custom'}
                >
                  <Text style={styles.customText}>
                    Add <Text style={styles.customBold}>"{query.trim()}"</Text> as custom item
                  </Text>
                  {addingId === 'custom' ? (
                    <LoadingSpinner color={theme.textSecondary} />
                  ) : (
                    <View style={[styles.addChip, styles.addChipOutline]}>
                      <Text style={[styles.addChipText, styles.addChipOutlineText]}>+ Add</Text>
                    </View>
                  )}
                </Pressable>
              )}
            </ScrollView>
          ) : query.trim().length > 0 ? (
            /* No results — offer custom add */
            <Pressable
              style={({ pressed }) => [styles.noResultRow, pressed && styles.resultRowPressed]}
              onPress={handleAddCustom}
              disabled={addingId === 'custom'}
            >
              <View style={styles.resultBody}>
                <Text style={styles.resultName}>"{query.trim()}"</Text>
                <Text style={styles.resultMeta}>Custom item · tap to add</Text>
              </View>
              {addingId === 'custom' ? (
                <LoadingSpinner color={theme.primary} />
              ) : (
                <View style={styles.addChip}>
                  <Text style={styles.addChipText}>+ Add</Text>
                </View>
              )}
            </Pressable>
          ) : (
            <Text style={styles.searchHint}>Start typing to search the product catalogue</Text>
          )}
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
          onPress={() => setShowAdd(true)}
        >
          <Text style={styles.fabText}>+ Add item</Text>
        </Pressable>
      )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },

  compareBtn: {
    margin: spacing.md,
    backgroundColor: theme.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    ...shadow.sm,
  },
  compareBtnDisabled: { backgroundColor: theme.border },
  pressed: { opacity: 0.85 },
  compareBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  countRow: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
  countText: { fontSize: 13, color: theme.textSecondary },

  listContent: { padding: spacing.md, gap: spacing.xs },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, marginTop: spacing.xxl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginBottom: spacing.sm },
  emptySubtitle: { fontSize: 14, color: theme.textSecondary, textAlign: 'center' },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.sm,
  },
  checkbox: { padding: 2 },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: theme.primary, borderColor: theme.primary },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  itemBody: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '500', color: theme.textPrimary },
  itemNameDone: { color: theme.textHint, textDecorationLine: 'line-through' },
  itemMeta: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
  deleteBtn: { padding: 4 },
  deleteIcon: { color: theme.textHint, fontSize: 14 },

  addPanel: {
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    maxHeight: 380,
    ...shadow.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: theme.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.textPrimary,
    backgroundColor: theme.background,
  },
  closeBtn: { padding: 4 },
  closeBtnText: { color: theme.textSecondary, fontSize: 18 },

  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  searchLoadingText: { fontSize: 14, color: theme.textSecondary },

  searchHint: {
    fontSize: 14,
    color: theme.textHint,
    textAlign: 'center',
    padding: spacing.lg,
  },

  results: { maxHeight: 280 },

  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: spacing.sm,
    backgroundColor: theme.surface,
  },
  resultRowPressed: { backgroundColor: theme.background },
  resultBody: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: '500', color: theme.textPrimary },
  resultMeta: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },

  addChip: {
    backgroundColor: theme.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  addChipText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  addChipOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.primary },
  addChipOutlineText: { color: theme.primary },

  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    backgroundColor: theme.primaryLight,
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
    gap: spacing.sm,
  },

  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    backgroundColor: theme.primary,
    borderRadius: radius.full,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    ...shadow.md,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
