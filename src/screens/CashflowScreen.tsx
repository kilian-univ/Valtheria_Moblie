import { getCashflowStyles, getFormStyles, palette } from '@/src/constants/style/Style';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import AddEntryForm from '@/src/components/outils/cashflow/AddEntryForm';
import CategoryBreakdown from '@/src/components/outils/cashflow/CategoryBreakdown';
import EntryRow, { CashflowEntry } from '@/src/components/outils/cashflow/EntryRow';
import TypeTabs, { TabKey } from '@/src/components/outils/cashflow/TypeTabs';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { CashflowSkeleton } from '@/src/components/common/ScreenSkeletons';
import LoadErrorState from '@/src/components/common/LoadErrorState';
import PageState from '@/src/components/common/PageState';
import { normalizeCashflow, type CashflowData as CashflowDataOf } from '@/src/utils/cashflow';
import { actionErrorText, loadErrorKind, type LoadError } from '@/src/utils/loadError';

type CashflowData = CashflowDataOf<CashflowEntry>;

function formatMonth(period?: string): string {
  if (!period) return '';
  const date = new Date(period);
  if (isNaN(date.getTime())) return period;
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

// Marge haute de l'en-tête (celle de headerRow), sous la zone de sécurité
const HEADER_PAD = 16;

export default function CashflowScreen() {
  // En-tête sous la barre d'état : décalé de la zone de sécurité
  const insets = useSafeAreaInsets();
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
  // Chargement en échec (rien à montrer), et échec d'une action
  const [loadError, setLoadError] = useState<LoadError | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Réponse lue une fois (normalizeCashflow) : jamais de champ manquant.
  // Relue à chaque tentative (ouverture, ajout, suppression, « Réessayer »)
  const [attempt, setAttempt] = useState(0);
  const load = useCallback(() => setAttempt((n) => n + 1), []);
  useEffect(() => {
    if (apiLoading || !isAuthenticated) return;
    let active = true;
    getCashflow().then(
      (raw: unknown) => {
        if (!active) return;
        setData(normalizeCashflow<CashflowEntry>(raw));
        setLoadError(null);
      },
      (err: unknown) => {
        if (active) setLoadError(loadErrorKind(err));
      }
    );
    return () => {
      active = false;
    };
  }, [apiLoading, isAuthenticated, getCashflow, attempt]);

  const handleAdd = async (payload: any) => {
    try {
      await addCashflowEntry(payload);
      setShowAddForm(false);
      setError(null);
      load();
    } catch (err: unknown) {
      setError(actionErrorText(err, 'Impossible d’ajouter l’entrée pour l’instant.'));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteCashflowEntry(id);
      setError(null);
      load();
    } catch (err: unknown) {
      setError(actionErrorText(err, 'Suppression impossible pour l’instant.'));
    }
  };

  const colorByCategory = useMemo(() => {
    const map: Record<string, string> = {};
    data?.by_category.depenses.forEach((c) => {
      map[c.category] = c.color;
    });
    return map;
  }, [data]);
  const isLoading = !data && !loadError;

  const totals = data?.totals;
  const reste = totals?.reste ?? 0;
  const isResteOk = reste >= 0;
  const currentEntries = data?.entries[activeTab] ?? [];

  return (
    <View style={styles.screen}>
      <View style={[styles.headerRow, { paddingTop: insets.top + HEADER_PAD }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.backChevron}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Cash-flow</Text>
      </View>

      {!apiLoading && !isAuthenticated ? (
        <PageState
          variant="empty"
          text="Connecte-toi pour suivre ce qui entre et ce qui sort chaque mois."
          actionLabel="Se connecter"
          onAction={() => router.push('/client/login')}
        />
      ) : !data && loadError ? (
        <LoadErrorState title="Cash-flow indisponible" what="ton cash-flow" kind={loadError} onRetry={() => { setLoadError(null); load(); }} />
      ) : isLoading || apiLoading || !data ? (
        <CashflowSkeleton />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {data.period_month ? <Text style={styles.periodText}>{formatMonth(data.period_month)}</Text> : null}

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

          {activeTab === 'depenses' ? <CategoryBreakdown items={data.by_category.depenses} styles={styles} /> : null}

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