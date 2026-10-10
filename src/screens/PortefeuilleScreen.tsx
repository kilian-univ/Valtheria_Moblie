import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import AddPositionForm from '@/src/components/outils/portfolio/AddPositionForm';
import HistoryChart from '@/src/components/outils/portfolio/HistoryChart';
import PositionRow from '@/src/components/outils/portfolio/PositionRow';
import { Position } from '@/src/components/outils/portfolio/types';
import { getFormStyles, getPortefeuilleStyles, palette } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { PortfolioSkeleton } from '@/src/components/common/ScreenSkeletons';

type Portfolio = {
  id: number;
  name: string;
  currency: string;
  eur_usd_rate: number;
  total_invested: number;
  total_current: number;
  gain_loss: number;
  gain_loss_pct: number;
  daily_change: number;
  daily_change_pct: number;
  total_current_eur: number;
  total_current_usd: number;
  total_invested_eur: number;
  total_invested_usd: number;
  positions: Position[];
};

function formatMoney(value: number, currency = 'EUR'): string {
  const symbol = currency === 'USD' ? '$' : '€';
  return `${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
}

// Marge haute de l'en-tête (celle de headerRow), sous la zone de sécurité
const HEADER_PAD = 16;

export default function PortefeuilleScreen() {
  // En-tête sous la barre d'état : décalé de la zone de sécurité
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const styles = getPortefeuilleStyles(colorScheme);
  const formStyles = getFormStyles(colorScheme);
  const {
    getPortfolio,
    getPortfolioHistory,
    addPortfolioPosition,
    deletePortfolioPosition,
    isLoading: apiLoading,
    isAuthenticated,
  } = useApi();

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    getPortfolio()
      .then(setPortfolio)
      .catch((err: any) => setError(err.message || 'Impossible de charger le portefeuille.'))
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
      await addPortfolioPosition(payload);
      setShowAddForm(false);
      load();
    } catch (err: any) {
      setError(err.message || "Impossible d'ajouter la position.");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deletePortfolioPosition(id);
      load();
    } catch (err: any) {
      setError(err.message || 'Suppression impossible.');
    }
  };

  const positions = portfolio?.positions ?? [];
  const isPositive = (portfolio?.gain_loss ?? 0) >= 0;
  const isDailyPositive = (portfolio?.daily_change ?? 0) >= 0;

  return (
    <View style={styles.screen}>
      <View style={[styles.headerRow, { paddingTop: insets.top + HEADER_PAD }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.backChevron}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{portfolio?.name ?? 'Portefeuille'}</Text>
      </View>

      {isLoading || apiLoading ? (
        <PortfolioSkeleton />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {error && <Text style={styles.error}>{error}</Text>}

          {portfolio && (
            <>
              <View style={styles.valueCard}>
                <Text style={styles.valueCardLabel}>Valeur actuelle</Text>
                <Text style={styles.valueCardAmount}>{formatMoney(portfolio.total_current_eur, 'EUR')}</Text>
                <Text style={isPositive ? styles.valueCardGainPositive : styles.valueCardGainNegative}>
                  {isPositive ? '+' : ''}
                  {formatMoney(portfolio.gain_loss, 'EUR')} ({isPositive ? '+' : ''}
                  {portfolio.gain_loss_pct.toFixed(2)}%)
                </Text>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statCardLabel}>Aujourd'hui</Text>
                  <Text style={isDailyPositive ? styles.statCardValuePositive : styles.statCardValueNegative}>
                    {isDailyPositive ? '+' : ''}
                    {portfolio.daily_change_pct.toFixed(2)}%
                  </Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statCardLabel}>Investi</Text>
                  <Text style={styles.statCardValue}>{formatMoney(portfolio.total_invested_eur, 'EUR')}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statCardLabel}>En $</Text>
                  <Text style={styles.statCardValue}>{formatMoney(portfolio.total_current_usd, 'USD')}</Text>
                </View>
              </View>

              <HistoryChart colors={colors} styles={styles} getPortfolioHistory={getPortfolioHistory} />

              {showAddForm ? (
                  <AddPositionForm colors={colors} styles={formStyles} onSubmit={handleAdd} onCancel={() => setShowAddForm(false)} />
                ) : (
                <Pressable onPress={() => setShowAddForm(true)} style={styles.addButton}>
                  <Text style={styles.addButtonText}>+ Ajouter une position</Text>
                </Pressable>
              )}

              <Text style={styles.sectionTitle}>Positions</Text>

              {positions.length === 0 ? (
                <Text style={styles.emptyText}>Aucune position pour le moment.</Text>
              ) : (
                positions.map((pos) => (
                  <PositionRow key={pos.id} position={pos} colors={colors} styles={styles} onDelete={() => handleDelete(pos.id)} />
                ))
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}