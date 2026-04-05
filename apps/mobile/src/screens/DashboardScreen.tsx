import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { compareApi, weeklyApi, type WeeklyHistoryItem } from '../api/client';
import { useListStore } from '../store/listStore';
import { useAuthStore } from '../store/authStore';
import { radius, shadow, spacing, theme } from '../constants/theme';
import { LoadingSpinner } from '../components/LoadingSpinner';

// ── Simple bar chart (no deps) ────────────────────────────────────────────────

function BarChart({
  data,
  color,
  valuePrefix = '$',
  height = 120,
}: {
  data: { label: string; value: number }[];
  color: string;
  valuePrefix?: string;
  height?: number;
}) {
  const max = Math.max(...data.map(d => d.value), 0.01);

  return (
    <View style={{ height: height + 40 }}>
      {/* Bars */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 6 }}>
        {data.map((d, i) => {
          const barH = Math.max((d.value / max) * height, d.value > 0 ? 4 : 0);
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height }}>
              {d.value > 0 && (
                <Text style={{ fontSize: 9, color: theme.textSecondary, marginBottom: 2 }}>
                  {valuePrefix}{d.value.toFixed(0)}
                </Text>
              )}
              <View style={{ width: '80%', height: barH, backgroundColor: color, borderRadius: 4, opacity: 0.9 }} />
            </View>
          );
        })}
      </View>
      {/* Labels */}
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
        {data.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 9, color: theme.textHint, textAlign: 'center' }}>{d.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <View style={statStyles.card}>
      <Text style={statStyles.label}>{label}</Text>
      <Text style={[statStyles.value, color ? { color } : null]}>{value}</Text>
      {sub ? <Text style={statStyles.sub}>{sub}</Text> : null}
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    ...shadow.sm,
  },
  label: { fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  value: { fontSize: 22, fontWeight: '800', color: theme.textPrimary, letterSpacing: -0.5 },
  sub: { fontSize: 11, color: theme.textHint, marginTop: 2 },
});

// ── Main ──────────────────────────────────────────────────────────────────────

function displayName(email?: string | null) {
  if (!email) return null;
  const prefix = email.split('@')[0];
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

export function DashboardScreen() {
  const { currentWeekList, weeklyHistory, fetchCurrentWeek, fetchWeeklyHistory } = useListStore();
  const user = useAuthStore(s => s.user);
  const [loading, setLoading] = useState(true);
  const [weekSaving, setWeekSaving] = useState(0);
  const [weekTotal, setWeekTotal] = useState(0);

  useEffect(() => {
    Promise.all([fetchCurrentWeek(), fetchWeeklyHistory()]).finally(() => setLoading(false));
  }, []);

  // Fetch current week comparison for live stats
  useEffect(() => {
    if (!currentWeekList) return;
    compareApi.compare(currentWeekList.id)
      .then(r => {
        const best = Math.min(r.coles.total, r.woolworths.total);
        setWeekTotal(best);
        setWeekSaving(r.saving.amount);
      })
      .catch(() => {});
  }, [currentWeekList?.id]);

  // Build chart data from history (last 6 weeks)
  const historySlice = weeklyHistory.slice(0, 6).reverse();

  // Spend chart — use weeklyHistory item counts as a proxy (no stored totals yet)
  const spendData = historySlice.map(w => ({
    label: `W${w.weekNumber}`,
    value: 0, // will be 0 until we store totals — shows correctly once compare is run
  }));
  // Add current week
  if (currentWeekList?.weekNumber) {
    spendData.push({ label: `W${currentWeekList.weekNumber}`, value: weekTotal });
  }

  const savingsData = historySlice.map(w => ({
    label: `W${w.weekNumber}`,
    value: 0,
  }));
  if (currentWeekList?.weekNumber) {
    savingsData.push({ label: `W${currentWeekList.weekNumber}`, value: weekSaving });
  }

  // Totals across all history
  const totalItemsTracked = weeklyHistory.reduce((s, w) => s + w.itemCount, 0);
  const weeksTracked = weeklyHistory.length + (currentWeekList ? 1 : 0);

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          {displayName(user?.email) && (
            <Text style={styles.greeting}>{displayName(user?.email)}</Text>
          )}
          <Text style={styles.heading}>Dashboard</Text>
          <Text style={styles.subheading}>{weeksTracked} weeks tracked</Text>
        </View>

        {/* This week stats */}
        <Text style={styles.sectionLabel}>This week</Text>
        <View style={styles.statRow}>
          <StatCard
            label="Est. spend"
            value={weekTotal > 0 ? `$${weekTotal.toFixed(0)}` : '—'}
            sub="best store"
            color={theme.textPrimary}
          />
          <StatCard
            label="You save"
            value={weekSaving > 0 ? `$${weekSaving.toFixed(2)}` : '—'}
            sub="vs other store"
            color={theme.primary}
          />
          <StatCard
            label="Items"
            value={String(currentWeekList?.items?.length ?? 0)}
            sub="this week"
          />
        </View>

        {/* Spend chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Weekly spend</Text>
          {spendData.some(d => d.value > 0) ? (
            <BarChart data={spendData} color={theme.primary} />
          ) : (
            <View style={styles.chartEmpty}>
              <Text style={styles.chartEmptyText}>Run a comparison to see spend data</Text>
            </View>
          )}
        </View>

        {/* Savings chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Weekly savings</Text>
          {savingsData.some(d => d.value > 0) ? (
            <BarChart data={savingsData} color={theme.secondary} />
          ) : (
            <View style={styles.chartEmpty}>
              <Text style={styles.chartEmptyText}>Savings appear after comparing prices</Text>
            </View>
          )}
        </View>

        {/* History summary */}
        {weeklyHistory.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Recent weeks</Text>
            {weeklyHistory.slice(0, 5).map(w => (
              <View key={w.id} style={styles.historyRow}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyWeek}>Week {w.weekNumber}</Text>
                  <Text style={styles.historyName} numberOfLines={1}>{w.name}</Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyItems}>{w.itemCount} items</Text>
                  <View style={styles.progressBar}>
                    <View style={[
                      styles.progressFill,
                      { width: `${w.itemCount > 0 ? (w.checkedCount / w.itemCount) * 100 : 0}%` }
                    ]} />
                  </View>
                  <Text style={styles.historyPct}>
                    {w.itemCount > 0 ? Math.round((w.checkedCount / w.itemCount) * 100) : 0}% done
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },

  header: { paddingBottom: spacing.xs },
  greeting: { fontSize: 12, fontWeight: '700', color: theme.textHint, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
  heading: { fontSize: 32, fontWeight: '800', color: theme.textPrimary, letterSpacing: -1.2 },
  subheading: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textHint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },

  statRow: { flexDirection: 'row', gap: spacing.sm },

  chartCard: {
    backgroundColor: theme.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadow.sm,
  },
  chartTitle: { fontSize: 15, fontWeight: '700', color: theme.textPrimary, marginBottom: spacing.md },
  chartEmpty: { height: 80, alignItems: 'center', justifyContent: 'center' },
  chartEmptyText: { fontSize: 13, color: theme.textHint, textAlign: 'center' },

  historyRow: {
    backgroundColor: theme.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadow.sm,
  },
  historyLeft: { flex: 1 },
  historyWeek: { fontSize: 11, fontWeight: '700', color: theme.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  historyName: { fontSize: 14, fontWeight: '600', color: theme.textPrimary, marginTop: 2 },
  historyRight: { alignItems: 'flex-end', gap: 4 },
  historyItems: { fontSize: 12, color: theme.textSecondary },
  progressBar: {
    width: 80, height: 4, backgroundColor: theme.border, borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: theme.primary, borderRadius: 2 },
  historyPct: { fontSize: 11, color: theme.textHint },
});
