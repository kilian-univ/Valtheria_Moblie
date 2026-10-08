import { getCashflowStyles, getFormStyles, palette } from '@/src/constants/style/Style';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import AddEntryForm from '@/src/components/outils/cashflow/AddEntryForm';
import CategoryBreakdown from '@/src/components/outils/cashflow/CategoryBreakdown';
import EntryRow, { CashflowEntry } from '@/src/components/outils/cashflow/EntryRow';
import TypeTabs, { TabKey } from '@/src/components/outils/cashflow/TypeTabs';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';

type CashflowData = {
  period_month: string;
  entries: Record<TabKey, CashflowEntry[]>;
  by_category: { depenses: { category: string; total: number; color: string }[] };
  totals: { revenus: number; depenses: number; epargne: number; budget: number; reste: number };
  default_categories: string[];
  revenu_suggestions: string[];
  guide_done: boolean;
};

function formatMonth(period?: string): string {
  if (!period) return '';
  const date = new Date(period);
  if (isNaN(date.getTime())) return period;
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export default function CashflowScreen() {
  const router = useRouter();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const styles = getCashflowStyles(colorScheme);
  const formStyles = getFormStyles(colorScheme);
  const {
    getCashflow,
    addCashflowEntry,
    deleteCashflowEntry,
    isLoading: apiLoading,
    isAuthenticated,
  } = useApi();
  

  const [data, setData] = useState<CashflowData | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('depenses');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    getCashflow()
      .then(setData)
      .catch((err: any) => setError(err.message || 'Impossible de charger le cash-flow.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (apiLoading) return;
    if (!isAuthenticated) {
      setError('Tu dois être connecté.');
      setIsLoading(false);
      return;
    }
    load();
  }, [apiLoading, isAuthenticated]);

  const handleAdd = async (payload: any) => {
    try {
      await addCashflowEntry(payload);
      setShowAddForm(false);
      load();
    } catch (err: any) {
      setError(err.message || "Impossible d'ajouter l'entrée.");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteCashflowEntry(id);
      load();
    } catch (err: any) {
      setError(err.message || 'Suppression impossible.');
    }
  };

  const colorByCategory = useMemo(() => {
    const map: Record<string, string> = {};
    data?.by_category.depenses.forEach((c) => {
      map[c.category] = c.color;
    });
    return map;
  }, [data]);

  const totals = data?.totals;
  const reste = totals?.reste ?? 0;
  const isResteOk = reste >= 0;
  const currentEntries = data?.entries[activeTab] ?? [];

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.backChevron}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Cash-flow</Text>
      </View>

      {isLoading || apiLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.gold} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {error && <Text style={styles.error}>{error}</Text>}

          {data?.period_month && <Text style={styles.periodText}>{formatMonth(data.period_month)}</Text>}

          <View style={styles.resteCard}>
            <Text style={styles.resteLabel}>Reste à vivre</Text>
            <Text style={isResteOk ? styles.restePositive : styles.resteNegative}>
              {isResteOk ? '+' : ''}
              {Number(reste).toLocaleString('fr-FR')} €
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <SummaryPill label="Revenus" value={totals?.revenus ?? 0} color={colors.success} styles={styles} />
            <SummaryPill label="Dépenses" value={totals?.depenses ?? 0} color={colors.error} styles={styles} />
            <SummaryPill label="Épargne" value={totals?.epargne ?? 0} color={colors.gold} styles={styles} />
          </View>

          {activeTab === 'depenses' && data && <CategoryBreakdown items={data.by_category.depenses} styles={styles} />}

          <TypeTabs active={activeTab} onChange={setActiveTab} styles={styles} />

          {showAddForm ? (
              <AddEntryForm
                activeTab={activeTab}
                categories={data?.default_categories ?? []}
                revenuSuggestions={data?.revenu_suggestions ?? []}
                colors={colors}
                styles={formStyles}
                onSubmit={handleAdd}
                onCancel={() => setShowAddForm(false)}
              />
            ) : (
            <Pressable onPress={() => setShowAddForm(true)} style={styles.addButton}>
              <Text style={styles.addButtonText}>+ Ajouter une entrée</Text>
            </Pressable>
          )}

          {currentEntries.length === 0 ? (
            <Text style={styles.emptyText}>Aucune entrée dans cette catégorie.</Text>
          ) : (
            currentEntries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                color={entry.category ? colorByCategory[entry.category] : undefined}
                styles={styles}
                onDelete={() => handleDelete(entry.id)}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function SummaryPill({
  label,
  value,
  color,
  styles,
}: {
  label: string;
  value: number;
  color: string;
  styles: any;
}) {
  return (
    <View style={styles.summaryPill}>
      <Text style={styles.summaryPillLabel}>{label}</Text>
      <Text style={[styles.summaryPillValue, { color }]}>{Number(value).toLocaleString('fr-FR')} €</Text>
    </View>
  );
}