import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { compareApi, type SplitItem, type SplitResult } from '../api/client';
import { radius, shadow, spacing, theme } from '../constants/theme';
import { LoadingSpinner } from '../components/LoadingSpinner';
import type { RouteProp } from '@react-navigation/native';
import type { MainStackParamList } from '../../App';

type Props = {
  route: RouteProp<MainStackParamList, 'SplitShop'>;
};

const THRESHOLDS = [2, 5, 10, 15];

function SplitItemRow({ item }: { item: SplitItem }) {
  return (
    <View style={styles.splitItem}>
      <View style={styles.splitItemBody}>
        <Text style={styles.splitItemName}>{item.name}</Text>
        <Text style={styles.splitItemQty}>{item.quantity} {item.unit}</Text>
      </View>
      <Text style={styles.splitItemPrice}>${item.price.toFixed(2)}</Text>
    </View>
  );
}

function StoreSection({
  title,
  items,
  subtotal,
  color,
  icon,
}: {
  title: string;
  items: SplitItem[];
  subtotal: number;
  color: string;
  icon: string;
}) {
  return (
    <View style={styles.storeSection}>
      <View style={[styles.storeSectionHeader, { borderLeftColor: color }]}>
        <Text style={styles.storeSectionIcon}>{icon}</Text>
        <Text style={styles.storeSectionTitle}>{title}</Text>
        <Text style={[styles.storeSectionTotal, { color }]}>${subtotal.toFixed(2)}</Text>
      </View>
      {items.length === 0 ? (
        <Text style={styles.noneText}>No items</Text>
      ) : (
        items.map((item) => <SplitItemRow key={item.name} item={item} />)
      )}
    </View>
  );
}

export function SplitShopScreen({ route }: Props) {
  const { listId } = route.params;
  const [threshold, setThreshold] = useState(5);
  const [result, setResult] = useState<SplitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSplit = useCallback(
    (minSaving: number) => {
      setLoading(true);
      setError(null);
      compareApi
        .split(listId, minSaving)
        .then(setResult)
        .catch((e) => setError(e.message ?? 'Split failed'))
        .finally(() => setLoading(false));
    },
    [listId],
  );

  // Load on mount
  React.useEffect(() => { runSplit(threshold); }, []);

  const handleThreshold = (t: number) => {
    setThreshold(t);
    runSplit(t);
  };

  const handleShare = () => {
    if (!result) return;
    const lines = [
      '🛒 TrolleyCheck Split Shop',
      '',
      '📍 FreshMart',
      ...result.freshmart.items.map((i) => `  ${i.name} — $${i.price.toFixed(2)}`),
      `  Subtotal: $${result.freshmart.subtotal.toFixed(2)}`,
      '',
      '📍 ValueGrocer',
      ...result.valuegrocer.items.map((i) => `  ${i.name} — $${i.price.toFixed(2)}`),
      `  Subtotal: $${result.valuegrocer.subtotal.toFixed(2)}`,
      '',
      `Total saving: $${result.totalSaving.toFixed(2)}`,
    ];
    Share.share({ message: lines.join('\n') });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Threshold selector */}
      <View style={styles.thresholdRow}>
        <Text style={styles.thresholdLabel}>Min saving</Text>
        <View style={styles.thresholdChips}>
          {THRESHOLDS.map((t) => (
            <Pressable
              key={t}
              style={[styles.chip, threshold === t && styles.chipActive]}
              onPress={() => handleThreshold(t)}
            >
              <Text style={[styles.chipText, threshold === t && styles.chipTextActive]}>
                ${t}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <LoadingSpinner fullScreen />
      ) : error ? (
        <View style={styles.errorState}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => runSplit(threshold)}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : result ? (
        <FlatList
          data={[]}
          renderItem={null}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              {/* Worth splitting banner */}
              <View
                style={[
                  styles.verdictBanner,
                  result.worthSplitting ? styles.verdictGreen : styles.verdictAmber,
                ]}
              >
                <Text style={styles.verdictIcon}>
                  {result.worthSplitting ? '✅' : '❌'}
                </Text>
                <View style={styles.verdictBody}>
                  <Text style={styles.verdictTitle}>
                    {result.worthSplitting
                      ? `Worth splitting — save $${result.totalSaving.toFixed(2)}`
                      : 'Not worth splitting'}
                  </Text>
                  <Text style={styles.verdictSubtitle}>
                    {result.worthSplitting
                      ? `Shopping at both stores saves you more than your $${threshold} threshold`
                      : `Saving $${result.totalSaving.toFixed(2)} is below your $${threshold} threshold`}
                  </Text>
                </View>
              </View>

              {/* Store sections */}
              <StoreSection
                title="Buy at FreshMart"
                items={result.freshmart.items}
                subtotal={result.freshmart.subtotal}
                color={theme.primary}
                icon="🟢"
              />
              <StoreSection
                title="Buy at ValueGrocer"
                items={result.valuegrocer.items}
                subtotal={result.valuegrocer.subtotal}
                color={theme.secondary}
                icon="🟡"
              />

              {/* Total saving */}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total saving</Text>
                <Text style={styles.totalAmount}>${result.totalSaving.toFixed(2)}</Text>
              </View>

              <Pressable
                style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]}
                onPress={handleShare}
              >
                <Text style={styles.shareBtnText}>Share split list</Text>
              </Pressable>
            </>
          }
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  listContent: { padding: spacing.md, gap: spacing.md },

  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.surface,
  },
  thresholdLabel: { fontSize: 14, fontWeight: '600', color: theme.textSecondary },
  thresholdChips: { flexDirection: 'row', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.background,
  },
  chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: theme.textSecondary },
  chipTextActive: { color: '#fff' },

  verdictBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  verdictGreen: { backgroundColor: theme.primaryLight },
  verdictAmber: { backgroundColor: theme.secondaryLight },
  verdictIcon: { fontSize: 28 },
  verdictBody: { flex: 1 },
  verdictTitle: { fontSize: 15, fontWeight: '700', color: theme.textPrimary },
  verdictSubtitle: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },

  storeSection: {
    backgroundColor: theme.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadow.sm,
  },
  storeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderLeftWidth: 4,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  storeSectionIcon: { fontSize: 16 },
  storeSectionTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: theme.textPrimary },
  storeSectionTotal: { fontSize: 17, fontWeight: '800' },
  noneText: { fontSize: 14, color: theme.textHint, padding: spacing.md, fontStyle: 'italic' },

  splitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  splitItemBody: { flex: 1 },
  splitItemName: { fontSize: 15, color: theme.textPrimary, fontWeight: '500' },
  splitItemQty: { fontSize: 12, color: theme.textSecondary, marginTop: 1 },
  splitItemPrice: { fontSize: 15, fontWeight: '700', color: theme.textPrimary },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadow.sm,
  },
  totalLabel: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
  totalAmount: { fontSize: 22, fontWeight: '800', color: theme.primary, letterSpacing: -0.5 },

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
  errorMsg: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
  retryBtn: {
    backgroundColor: theme.primary,
    borderRadius: radius.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});
