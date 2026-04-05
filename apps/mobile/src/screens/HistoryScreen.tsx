import React, { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useListStore } from '../store/listStore';
import { radius, shadow, spacing, theme } from '../constants/theme';
import { LoadingSpinner } from '../components/LoadingSpinner';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../App';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'History'>;
};

export function HistoryScreen({ navigation }: Props) {
  const { weeklyHistory, fetchWeeklyHistory } = useListStore();

  useEffect(() => { fetchWeeklyHistory(); }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {weeklyHistory.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyTitle}>No history yet</Text>
          <Text style={styles.emptySubtitle}>Previous weekly lists will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={weeklyHistory}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const pct = item.itemCount > 0
              ? Math.round((item.checkedCount / item.itemCount) * 100)
              : 0;
            return (
              <View style={styles.card}>
                <View style={styles.cardLeft}>
                  <Text style={styles.weekLabel}>Week {item.weekNumber}</Text>
                  <Text style={styles.weekName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.meta}>{item.itemCount} items · {pct}% completed</Text>
                </View>
                <View style={styles.progressCircle}>
                  <Text style={styles.progressPct}>{pct}%</Text>
                </View>
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
  list: { padding: spacing.md, gap: spacing.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginBottom: spacing.sm },
  emptySubtitle: { fontSize: 14, color: theme.textSecondary, textAlign: 'center' },
  card: {
    backgroundColor: theme.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadow.sm,
  },
  cardLeft: { flex: 1 },
  weekLabel: { fontSize: 11, fontWeight: '700', color: theme.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  weekName: { fontSize: 16, fontWeight: '600', color: theme.textPrimary, marginTop: 2 },
  meta: { fontSize: 12, color: theme.textSecondary, marginTop: 3 },
  progressCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: theme.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  progressPct: { fontSize: 13, fontWeight: '800', color: theme.primary },
});
