import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { compareApi, type CompareResult, type ItemComparison } from '../api/client';
import { radius, shadow, spacing, theme } from '../constants/theme';
import { LoadingSpinner } from '../components/LoadingSpinner';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { MainStackParamList } from '../../App';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'Compare'>;
  route: RouteProp<MainStackParamList, 'Compare'>;
};

function StoreTotals({ result }: { result: CompareResult }) {
  const { coles, woolworths, cheaperStore, saving } = result;
  const colesCheaper = cheaperStore === 'Coles';
  const woolsCheaper = cheaperStore === 'Woolworths';

  return (
    <View style={styles.totalsRow}>
      <View style={[styles.storeCard, colesCheaper && styles.storeCardWinner]}>
        {colesCheaper && <View style={styles.winnerBadge}><Text style={styles.winnerText}>Cheaper</Text></View>}
        <Text style={[styles.storeName, { color: '#E31837' }]}>Coles</Text>
        <Text style={styles.storeTotal}>${coles.total.toFixed(2)}</Text>
      </View>
      <View style={styles.vsColumn}>
        {cheaperStore && (
          <View style={styles.savingBubble}>
            <Text style={styles.savingAmount}>Save ${saving.amount.toFixed(2)}</Text>
            <Text style={styles.savingPct}>{saving.percentage.toFixed(0)}%</Text>
          </View>
        )}
        <Text style={styles.vsText}>vs</Text>
      </View>
      <View style={[styles.storeCard, woolsCheaper && styles.storeCardWinner]}>
        {woolsCheaper && <View style={styles.winnerBadge}><Text style={styles.winnerText}>Cheaper</Text></View>}
        <Text style={[styles.storeName, { color: '#007B40' }]}>Woolworths</Text>
        <Text style={styles.storeTotal}>${woolworths.total.toFixed(2)}</Text>
      </View>
    </View>
  );
}

function ItemRow({ item }: { item: ItemComparison }) {
  const colesPrice = item.coles?.total;
  const woolsPrice = item.woolworths?.total;
  const fmPrice = colesPrice;
  const vgPrice = woolsPrice;
  const notAvailable = fmPrice == null && vgPrice == null;

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.itemQty}>{item.quantity} {item.unit}</Text>
      </View>
      {notAvailable ? (
        <Text style={styles.notFound}>Not available at either store</Text>
      ) : (
        <View style={styles.itemPrices}>
          <View style={[styles.priceCol, item.cheaperStore === 'Coles' && styles.priceColWinner]}>
            <Text style={styles.priceStore}>Coles</Text>
            <Text style={[styles.priceAmount, item.cheaperStore === 'Coles' && styles.priceAmountWinner]}>
              {fmPrice != null ? `$${fmPrice.toFixed(2)}` : '—'}
            </Text>
          </View>
          <View style={[styles.priceCol, item.cheaperStore === 'Woolworths' && styles.priceColWinner]}>
            <Text style={styles.priceStore}>Woolworths</Text>
            <Text style={[styles.priceAmount, item.cheaperStore === 'Woolworths' && styles.priceAmountWinner]}>
              {vgPrice != null ? `$${vgPrice.toFixed(2)}` : '—'}
            </Text>
          </View>
          {item.saving > 0 && (
            <View style={styles.savingCol}>
              <Text style={styles.savingLabel}>Saving</Text>
              <Text style={styles.savingValue}>${item.saving.toFixed(2)}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export function CompareScreen({ navigation, route }: Props) {
  const { listId } = route.params;
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    compareApi
      .compare(listId)
      .then(setResult)
      .catch((e) => setError(e.message ?? 'Comparison failed'))
      .finally(() => setLoading(false));
  }, [listId]);

  const handleShare = () => {
    if (!result) return;
    const lines = [
      'TrolleyCheck price comparison',
      `Coles total: $${result.coles.total.toFixed(2)}`,
      `Woolworths total: $${result.woolworths.total.toFixed(2)}`,
      result.cheaperStore
        ? `${result.cheaperStore} is cheaper — save $${result.saving.amount.toFixed(2)} (${result.saving.percentage.toFixed(0)}%)`
        : 'Both stores cost the same.',
    ];
    Share.share({ message: lines.join('\n') });
  };

  if (loading) return <LoadingSpinner fullScreen />;

  if (error || !result) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.errorState}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Comparison failed</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.retryText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={result.items}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <StoreTotals result={result} />

            {result.notFound.length > 0 && (
              <View style={styles.notFoundBanner}>
                <Text style={styles.notFoundTitle}>Items not found ({result.notFound.length})</Text>
                <Text style={styles.notFoundList}>{result.notFound.join(', ')}</Text>
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Item breakdown</Text>
              <Text style={styles.sectionSubtitle}>Sorted by saving</Text>
            </View>
          </>
        }
        renderItem={({ item }) => <ItemRow item={item} />}
        ListFooterComponent={
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.splitBtn, pressed && styles.pressed]}
              onPress={() => navigation.navigate('SplitShop', { listId })}
            >
              <Text style={styles.splitBtnText}>🔀  View split shop</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]}
              onPress={handleShare}
            >
              <Text style={styles.shareBtnText}>Share summary</Text>
            </Pressable>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  listContent: { padding: spacing.md, gap: spacing.sm },

  totalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  storeCard: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadow.sm,
  },
  storeCardWinner: { borderColor: theme.primary },
  winnerBadge: {
    backgroundColor: theme.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginBottom: spacing.xs,
  },
  winnerText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  storeName: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 4 },
  storeTotal: { fontSize: 24, fontWeight: '800', color: theme.textPrimary, letterSpacing: -0.5 },

  vsColumn: { alignItems: 'center', gap: spacing.xs },
  vsText: { fontSize: 13, color: theme.textHint, fontWeight: '600' },
  savingBubble: {
    backgroundColor: theme.secondary,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  savingAmount: { fontSize: 13, fontWeight: '800', color: '#fff' },
  savingPct: { fontSize: 11, color: '#fff', opacity: 0.9 },

  notFoundBanner: {
    backgroundColor: theme.secondaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: theme.secondary,
  },
  notFoundTitle: { fontSize: 14, fontWeight: '700', color: theme.textPrimary, marginBottom: 4 },
  notFoundList: { fontSize: 13, color: theme.textSecondary },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
  sectionSubtitle: { fontSize: 12, color: theme.textHint },

  itemCard: {
    backgroundColor: theme.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadow.sm,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  itemName: { fontSize: 15, fontWeight: '600', color: theme.textPrimary, flex: 1 },
  itemQty: { fontSize: 13, color: theme.textSecondary },
  itemPrices: { flexDirection: 'row', gap: spacing.sm },
  priceCol: {
    flex: 1,
    backgroundColor: theme.background,
    borderRadius: radius.sm,
    padding: spacing.sm,
    alignItems: 'center',
  },
  priceColWinner: { backgroundColor: theme.primaryLight },
  priceStore: { fontSize: 11, color: theme.textSecondary, marginBottom: 2 },
  priceAmount: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
  priceAmountWinner: { color: theme.primary },
  savingCol: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  savingLabel: { fontSize: 10, color: theme.textHint },
  savingValue: { fontSize: 14, fontWeight: '700', color: theme.secondary },
  notFound: { fontSize: 13, color: theme.textHint, fontStyle: 'italic' },

  actions: { gap: spacing.sm, marginTop: spacing.sm },
  splitBtn: {
    backgroundColor: theme.primaryDark,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    ...shadow.sm,
  },
  splitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  shareBtn: {
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: theme.surface,
  },
  shareBtnText: { color: theme.textSecondary, fontWeight: '600', fontSize: 15 },
  pressed: { opacity: 0.85 },

  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  errorIcon: { fontSize: 48, marginBottom: spacing.md },
  errorTitle: { fontSize: 20, fontWeight: '700', color: theme.textPrimary, marginBottom: spacing.sm },
  errorMsg: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
  retryBtn: {
    backgroundColor: theme.primary,
    borderRadius: radius.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});
