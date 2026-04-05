import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useListStore } from '../store/listStore';
import { radius, shadow, spacing, theme } from '../constants/theme';
import { LoadingSpinner } from '../components/LoadingSpinner';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList, TabParamList } from '../../App';
import type { List } from '../api/client';

type Props = {
  navigation: NativeStackNavigationProp<TabParamList, 'AllLists'> & NativeStackNavigationProp<MainStackParamList>;
};

function ListCard({
  list,
  onPress,
  onDelete,
}: {
  list: List;
  onPress: () => void;
  onDelete: () => void;
}) {
  const itemCount = list.itemCount ?? list.items?.length ?? 0;
  const updatedAt = new Date(list.updatedAt);
  const dateStr = updatedAt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });

  return (
    <View style={styles.card}>
      <Pressable
        style={({ pressed }) => [styles.cardMain, pressed && styles.cardPressed]}
        onPress={onPress}
      >
        <View style={styles.cardIcon}>
          <Text style={styles.cardIconText}>🛒</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>{list.name}</Text>
          <Text style={styles.cardMeta}>
            {itemCount} {itemCount === 1 ? 'item' : 'items'} · {dateStr}
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
      <Pressable
        style={styles.deleteBtn}
        onPress={onDelete}
        hitSlop={8}
      >
        <Text style={styles.deleteBtnText}>🗑</Text>
      </Pressable>
    </View>
  );
}

export function ListsScreen({ navigation }: Props) {
  const { logout } = useAuthStore();
  const { lists, isLoadingLists, fetchLists, createList, deleteList } = useListStore();
  const [newListName, setNewListName] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchLists(); }, []);

  const handleRefresh = useCallback(() => fetchLists(), []);

  const handleCreate = async () => {
    const name = newListName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const list = await createList(name);
      setNewListName('');
      setShowInput(false);
      navigation.navigate('ListDetail', { list });
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>My Lists</Text>
        <Pressable onPress={logout} hitSlop={8}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>

      {/* New list input */}
      {showInput && (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.nameInput}
            value={newListName}
            onChangeText={setNewListName}
            placeholder="List name…"
            placeholderTextColor={theme.textHint}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
            maxLength={100}
          />
          <Pressable
            style={[styles.createBtn, !newListName.trim() && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={creating || !newListName.trim()}
          >
            {creating ? <LoadingSpinner color="#fff" /> : <Text style={styles.createBtnText}>Add</Text>}
          </Pressable>
          <Pressable onPress={() => { setShowInput(false); setNewListName(''); }} hitSlop={8}>
            <Text style={styles.cancelText}>✕</Text>
          </Pressable>
        </View>
      )}

      {/* List */}
      {isLoadingLists && lists.length === 0 ? (
        <LoadingSpinner fullScreen />
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(l) => l.id}
          contentContainerStyle={lists.length === 0 ? styles.emptyContainer : styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoadingLists}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
            />
          }
          renderItem={({ item }) => (
            <ListCard
              list={item}
              onPress={() => {
                useListStore.getState().selectList(item);
                navigation.navigate('ListDetail', { list: item });
              }}
              onDelete={() =>
                Alert.alert('Delete list', `Delete "${item.name}"? This cannot be undone.`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteList(item.id) },
                ])
              }
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🛒</Text>
              <Text style={styles.emptyTitle}>No lists yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap the button below to create your first grocery list.
              </Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      {!showInput && (
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
          onPress={() => setShowInput(true)}
        >
          <Text style={styles.fabText}>+ New list</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  heading: { fontSize: 28, fontWeight: '800', color: theme.textPrimary, letterSpacing: -0.5 },
  logoutText: { fontSize: 14, color: theme.textSecondary },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  nameInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: theme.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.textPrimary,
    backgroundColor: theme.surface,
  },
  createBtn: {
    backgroundColor: theme.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    minWidth: 60,
    alignItems: 'center',
  },
  createBtnDisabled: { backgroundColor: theme.border },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelText: { color: theme.textSecondary, fontSize: 18 },

  listContent: { padding: spacing.md, gap: spacing.sm },
  emptyContainer: { flex: 1 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: radius.md,
    ...shadow.sm,
    overflow: 'hidden',
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  cardPressed: { opacity: 0.75 },
  deleteBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: theme.border,
  },
  deleteBtnText: { fontSize: 18 },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: theme.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconText: { fontSize: 22 },
  cardBody: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600', color: theme.textPrimary },
  cardMeta: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
  chevron: { fontSize: 22, color: theme.border, fontWeight: '300' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 56, marginBottom: spacing.md },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: theme.textPrimary, marginBottom: spacing.sm },
  emptySubtitle: { fontSize: 15, color: theme.textSecondary, textAlign: 'center', lineHeight: 22 },

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
  pressed: { opacity: 0.85 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
