import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useListStore } from '../store/listStore';
import { radius, shadow, spacing, theme } from '../constants/theme';
import { LoadingSpinner } from '../components/LoadingSpinner';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { MainStackParamList } from '../../App';
import type { Item } from '../api/client';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'ListDetail'>;
  route: RouteProp<MainStackParamList, 'ListDetail'>;
};

const UNITS = ['each', 'kg', 'g', 'L', 'mL'] as const;
type Unit = typeof UNITS[number];

function ItemRow({
  item,
  onToggle,
  onDelete,
  onEdit,
}: {
  item: Item;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.itemRow, pressed && styles.itemRowPressed]}
      onPress={onEdit}
      onLongPress={onDelete}
    >
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
    </Pressable>
  );
}

export function ListDetailScreen({ navigation, route }: Props) {
  const { list } = route.params;
  const { items, isLoadingItems, fetchItems, addItem, updateItem, deleteItem, toggleItem } =
    useListStore();

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState<Unit>('each');
  const [notes, setNotes] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: list.name });
    fetchItems(list.id);
  }, [list.id]);

  const checkedCount = items.filter((i) => i.checked).length;

  const handleAdd = async () => {
    const n = name.trim();
    if (!n) return;
    setAdding(true);
    try {
      await addItem(list.id, {
        name: n,
        quantity: parseFloat(quantity) || 1,
        unit,
        notes: notes.trim() || undefined,
      });
      setName('');
      setQuantity('1');
      setNotes('');
      setShowAdd(false);
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = (item: Item) => {
    Alert.prompt(
      'Edit item',
      'Change item name',
      (newName) => {
        if (newName?.trim() && newName.trim() !== item.name) {
          updateItem(list.id, item.id, { name: newName.trim() });
        }
      },
      'plain-text',
      item.name,
    );
  };

  const handleDelete = (item: Item) => {
    Alert.alert('Remove item', `Remove "${item.name}" from the list?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteItem(list.id, item.id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Compare CTA */}
      <Pressable
        style={({ pressed }) => [styles.compareBtn, pressed && styles.pressed]}
        onPress={() => navigation.navigate('Compare', { listId: list.id })}
        disabled={items.length === 0}
      >
        <Text style={styles.compareBtnText}>
          {items.length === 0 ? 'Add items to compare' : '⚖️  Compare prices'}
        </Text>
      </Pressable>

      {/* Item count */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {items.length} {items.length === 1 ? 'item' : 'items'}
          {checkedCount > 0 ? ` · ${checkedCount} ticked` : ''}
        </Text>
      </View>

      {/* Items */}
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
              onDelete={() => handleDelete(item)}
              onEdit={() => handleEdit(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📝</Text>
              <Text style={styles.emptyTitle}>No items yet</Text>
              <Text style={styles.emptySubtitle}>Tap below to add your first item.</Text>
            </View>
          }
        />
      )}

      {/* Add item panel */}
      {showAdd ? (
        <View style={styles.addPanel}>
          <TextInput
            style={styles.addInput}
            value={name}
            onChangeText={setName}
            placeholder="Item name"
            placeholderTextColor={theme.textHint}
            autoFocus
            maxLength={200}
          />
          <View style={styles.addRow}>
            <TextInput
              style={[styles.addInput, styles.qtyInput]}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="Qty"
              placeholderTextColor={theme.textHint}
              keyboardType="numeric"
            />
            {/* Unit picker */}
            <View style={styles.unitRow}>
              {UNITS.map((u) => (
                <Pressable
                  key={u}
                  style={[styles.unitChip, unit === u && styles.unitChipActive]}
                  onPress={() => setUnit(u)}
                >
                  <Text style={[styles.unitChipText, unit === u && styles.unitChipTextActive]}>
                    {u}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <TextInput
            style={styles.addInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes (optional)"
            placeholderTextColor={theme.textHint}
          />
          <View style={styles.addActions}>
            <Pressable
              style={styles.cancelAddBtn}
              onPress={() => { setShowAdd(false); setName(''); setQuantity('1'); setNotes(''); }}
            >
              <Text style={styles.cancelAddText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmAddBtn, !name.trim() && styles.confirmAddDisabled]}
              onPress={handleAdd}
              disabled={adding || !name.trim()}
            >
              {adding ? (
                <LoadingSpinner color="#fff" />
              ) : (
                <Text style={styles.confirmAddText}>Add item</Text>
              )}
            </Pressable>
          </View>
        </View>
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

  compareBtn: {
    margin: spacing.md,
    backgroundColor: theme.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    ...shadow.sm,
  },
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
  itemRowPressed: { opacity: 0.75 },
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
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.md,
  },
  addInput: {
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.textPrimary,
    backgroundColor: theme.background,
  },
  addRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  qtyInput: { width: 70 },
  unitRow: { flex: 1, flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  unitChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.background,
  },
  unitChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  unitChipText: { fontSize: 13, color: theme.textSecondary, fontWeight: '500' },
  unitChipTextActive: { color: '#fff' },
  addActions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
  cancelAddBtn: { paddingVertical: 10, paddingHorizontal: spacing.md },
  cancelAddText: { color: theme.textSecondary, fontSize: 15 },
  confirmAddBtn: {
    backgroundColor: theme.primary,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    minWidth: 100,
    alignItems: 'center',
  },
  confirmAddDisabled: { backgroundColor: theme.border },
  confirmAddText: { color: '#fff', fontWeight: '700', fontSize: 15 },

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
