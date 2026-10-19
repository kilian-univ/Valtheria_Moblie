import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '@/src/components/common/AppText';
import BackButton from '@/src/components/common/BackButton';
import BottomSheet from '@/src/components/common/BottomSheet';
import BigNumber from '@/src/components/common/BigNumber';
import Button from '@/src/components/common/Button';
import ValBubble from '@/src/components/common/ValBubble';
import IconButton from '@/src/components/common/IconButton';
import PageState from '@/src/components/common/PageState';
import Pill from '@/src/components/common/Pill';
import AllocationBar from '@/src/components/patrimoine/AllocationBar';
import CelebrationSheet from '@/src/components/patrimoine/CelebrationSheet';
import ChartMenu from '@/src/components/patrimoine/ChartMenu';
import GoalsSection from '@/src/components/patrimoine/GoalsSection';
import HelpTerm from '@/src/components/patrimoine/HelpTerm';
import Figure from '@/src/components/patrimoine/Figure';
import LineChart from '@/src/components/patrimoine/LineChart';
import PeriodPicker from '@/src/components/patrimoine/PeriodPicker';
import PositionLine, { ClosedLine } from '@/src/components/patrimoine/PositionLine';
import Segmented from '@/src/components/patrimoine/Segmented';
import ValRemark from '@/src/components/patrimoine/ValRemark';
import { fonts, palette, radius, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { effectiveEmergency, useBudgetLink } from '@/src/hooks/useBudgetLink';
import { usePatrimoineProgress } from '@/src/hooks/usePatrimoineProgress';
import { loadPatrimoine, usePatrimoineState } from '@/src/state/patrimoineData';
import { updatePatrimoinePrefs, usePatrimoinePrefs } from '@/src/state/patrimoinePrefs';
import { userKeyOf } from '@/src/state/userMemory';
import { feedback } from '@/src/utils/feedback';
import { tap } from '@/src/utils/haptics';
import { staleDataText } from '@/src/utils/loadError';
import { splitAnomalies } from '@/src/utils/patrimoine/anomalies';
import { byType } from '@/src/utils/patrimoine/analysis';
import {
  CHART_MODES,
  chartSummary,
  clipPoints,
  DEFAULT_PERIOD,
  depositIndexes,
  logScaleState,
  modeSeries,
  periodLabel,
  plottedSeries,
  portfolioRange,
  roundGrowth,
  tickLabel,
  variation,
  type ChartMode,
  type Period,
} from '@/src/utils/patrimoine/chart';
import { money, shortDate, signedMoney, signedPercent, updatedLabel } from '@/src/utils/patrimoine/format';
import { celebrationText, mergeCelebration, type CelebrationItems } from '@/src/utils/patrimoine/celebration';
import { emergencyGauge, markReached, newlyReached } from '@/src/utils/patrimoine/goals';
import { earn } from '@/src/utils/patrimoine/milestones';
import { parseChart, type ChartPoint } from '@/src/utils/patrimoine/model';
import { streakLabel } from '@/src/utils/patrimoine/regularity';
import { chooseValTip } from '@/src/utils/patrimoine/valTips';

const TICK_MS = 30_000;

// Mon patrimoine (lot portefeuille du site) : valeur totale, courbe avec le
// montant investi, répartition, remarque de Val, positions.
export default function PatrimoineScreen() {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const insets = useSafeAreaInsets();
  const { user, getPortfolio, get, del } = useApi();
  const userKey = userKeyOf(user?.id);
  const data = usePatrimoineState();
  const prefs = usePatrimoinePrefs(userKey);
  const hidden = prefs?.discreet ?? false;
  const portfolio = data.portfolio;
  // Dernier rechargement en échec : les chiffres affichés sont les derniers connus
  const stale = data.error !== null;

  const [mode, setMode] = useState<ChartMode>('valeur');
  const [period, setPeriod] = useState<Period>(DEFAULT_PERIOD);
  const [closedOpen, setClosedOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Courbe : la plage du serveur, puis la période découpée sur le téléphone
  const range = portfolioRange(period);
  const [series, setSeries] = useState<{ range: string; at: number | null; points: ChartPoint[] } | null>(null);
  // Relevé supprimé : la courbe est relue
  const [chartVersion, setChartVersion] = useState(0);
  useEffect(() => {
    let active = true;
    get(`/portfolio/chart?range=${range}`)
      .then((raw: unknown) => parseChart(raw))
      .catch(() => [] as ChartPoint[])
      .then((points: ChartPoint[]) => {
        if (active) setSeries({ range, at: data.fetchedAt, points });
      });
    return () => {
      active = false;
    };
  }, [range, get, data.fetchedAt, chartVersion]);

  // Relevés anormaux : jugés sur toute la plage reçue (chaque point a ses
  // voisins), masqués par défaut ; la courbe relie alors leurs voisins
  const hideAnomalies = prefs?.hideAnomalies ?? true;
  const split = useMemo(
    () => (series?.range === range ? splitAnomalies(series.points, (p) => p.value, hideAnomalies) : null),
    [series, range, hideAnomalies]
  );
  const points = useMemo(() => (split ? clipPoints(split.kept, period, new Date(now)) : []), [split, period, now]);
  const anomalies = useMemo(() => (split ? clipPoints(split.hidden, period, new Date(now)) : []), [split, period, now]);

  // Supprimer un relevé (appui long sur un point, ou depuis le menu de la courbe)
  const [toDelete, setToDelete] = useState<ChartPoint | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const askDelete = (p: ChartPoint | undefined) => {
    if (!p || p.id === null) return;
    tap();
    setDeleteError(null);
    setToDelete(p);
    setDeleteOpen(true);
  };
  const removeSnapshot = async (p: ChartPoint) => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await del(`/portfolio/snapshots/${p.id}`);
      feedback.drop();
      setDeleteOpen(false);
      setChartVersion((v) => v + 1);
    } catch {
      feedback.wrong(0.6);
      setDeleteError('La suppression n’a pas abouti. Réessaie dans un instant.');
    } finally {
      setDeleting(false);
    }
  };
  const chartLoading = series?.range !== range;

  // Régularité, objectifs atteints et étapes gagnées (fêtés une seule fois)
  const link = useBudgetLink();
  const emergencyPrefs = prefs ? effectiveEmergency(prefs.emergency, link.expenses) : null;
  const progress = usePatrimoineProgress(userKey, prefs, data.fetchedAt, link.savingMonths);
  // Tout ce qui est gagné en même temps : une seule célébration, complétée si
  // elle est encore ouverte
  const [celebration, setCelebration] = useState<CelebrationItems | null>(null);
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  useEffect(() => {
    if (!portfolio || !prefs || !progress.ready) return;
    const reached = newlyReached(prefs.goals, portfolio.positions);
    const emergency = emergencyGauge(emergencyPrefs ?? prefs.emergency, portfolio.positions);
    const at = new Date().toISOString();
    const { earned, fresh } = earn(
      prefs.milestones,
      {
        positions: portfolio.positions,
        bestStreak: progress.best,
        emergencyReached: !!emergency?.reached,
        anyGoalReached: prefs.goals.some((g) => g.reachedAt) || reached.length > 0,
      },
      at
    );
    if (reached.length === 0 && fresh.length === 0) return;
    updatePatrimoinePrefs(userKey, (p) => ({ ...p, goals: markReached(p.goals, reached.map((g) => g.id), at), milestones: { ...earned, ...p.milestones } })).then(() => {
      setCelebration((current) => mergeCelebration(current, { goals: reached.map((g) => g.name), milestones: fresh }));
      setCelebrationOpen(true);
    });
  }, [portfolio, prefs, emergencyPrefs, progress.ready, progress.best, userKey]);

  const celebrationCopy = celebration ? celebrationText(celebration) : null;

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadPatrimoine(userKey, getPortfolio, true);
    setRefreshing(false);
  }, [userKey, getPortfolio]);

  const toggleDiscreet = () => {
    tap();
    updatePatrimoinePrefs(userKey, (p) => ({ ...p, discreet: !p.discreet }));
  };

  if (!portfolio) return null;
  const positions = portfolio.positions;

  // Premier pas : patrimoine vide
  if (positions.length === 0 && portfolio.closed.length === 0) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.bar}>
          <BackButton onBack={() => router.back()} />
        </View>
        <View style={[styles.firstStep, { paddingBottom: insets.bottom + space[8] }]}>
          <AppText accessibilityRole="header" style={styles.title}>
            Mon patrimoine
          </AppText>
          <ValBubble mood="complice" diameter={96} text="Suivre ton patrimoine, c’est voir où va ton argent, et le faire grandir." />
          <Button label="Ajouter mon premier actif" icon="add" onPress={() => router.push('/outils/recherche')} />
          <AppText variant="caption" tone="subtitle" style={styles.center}>
            Valtheria ne donne pas de conseil en investissement.
          </AppText>
        </View>
      </View>
    );
  }
  const shares = byType(positions);
  const tip = chooseValTip({ positions, now: new Date(now), monthlyExpenses: emergencyPrefs?.monthlyExpenses ?? null });
  const regularity = streakLabel(progress.streak);
  const v = variation(points);
  const values = modeSeries(points, mode);
  // Échelle logarithmique : la valeur telle quelle ; en Performance, la croissance de
  // 1 € investi (1 + rendement) ; jamais en Plus-value (montant qui peut être négatif)
  const requestedLog = prefs?.logScale ?? false;
  const growthLike = plottedSeries(values, mode, requestedLog);
  const logState = logScaleState(requestedLog, mode, growthLike);
  const logScale = logState.applied;
  const chartValues = logScale ? growthLike : values;
  const growthAxis = logScale && mode === 'performance';
  const deposits = mode === 'valeur' ? depositIndexes(points) : [];
  const m = (x: number) => money(x, { hidden });
  const summary = hidden
    ? 'Courbe de ton patrimoine, montants masqués.'
    : chartSummary(points, period, (x) => money(x));

  const tipFor = (i: number) => {
    const p = points[i];
    const date = shortDate(p.date, new Date(now));
    if (mode === 'performance') {
      return { title: signedPercent(values[i], hidden), caption: date };
    }
    if (mode === 'plus-value') return { title: signedMoney(p.value - p.invested, { hidden }), caption: date };
    return { title: m(p.value), caption: date, extra: `investi ${m(p.invested)}` };
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <BackButton onBack={() => router.back()} />
        <View style={styles.barActions}>
          <IconButton
            icon={hidden ? 'eye-off-outline' : 'eye-outline'}
            accessibilityLabel={hidden ? 'Afficher les montants' : 'Masquer les montants'}
            accessibilityState={{ selected: hidden }}
            onPress={toggleDiscreet}
            color={colors.subtitle}
          />
          <Pressable
            onPress={() => {
              tap();
              router.push('/outils/operation');
            }}
            accessibilityRole="button"
            accessibilityLabel="Noter une opération"
            style={({ pressed }) => [styles.plus, { backgroundColor: colors.gold, shadowColor: colors.goldDeep }, pressed && { transform: [{ translateY: 2 }] }]}
          >
            <Ionicons name="add" size={24} color={colors.onGold} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space[8] }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.gold} colors={[colors.gold]} progressBackgroundColor={colors.surface} />
        }
      >
        <AppText accessibilityRole="header" style={styles.title}>
          Mon patrimoine
        </AppText>
        <View style={styles.metaRow}>
          <AppText variant="caption" tone="subtitle">
            {updatedLabel(data.fetchedAt, now)}
          </AppText>
          {regularity ? (
            <Pill
              size="sm"
              icon="calendar-outline"
              label={regularity}
              background={colors.goldSoft}
              color={colors.gold}
              accessibilityLabel={`Régularité : ${regularity} avec au moins un versement`}
            />
          ) : null}
        </View>
        {stale ? <PageState variant="offline" text={staleDataText(data.errorKind ?? 'server', 'Tes derniers chiffres connus')} /> : null}

        <View style={styles.hero} accessible accessibilityLabel={`Valeur totale : ${hidden ? 'masquée' : money(portfolio.totalEur)}`}>
          <AppText variant="caption" tone="subtitle">
            Valeur totale
          </AppText>
          <BigNumber text={money(portfolio.totalEur, { hidden })} size={44} tone="text" style={styles.left} />
        </View>
        {v ? (
          <AppText
            style={[styles.variation, { color: v.delta >= 0 ? colors.success : colors.error }]}
            accessibilityLabel={hidden ? `Variation ${periodLabel(period)} masquée` : `${signedMoney(v.delta)} ${v.pct !== null ? `soit ${signedPercent(v.pct)}` : ''} ${periodLabel(period)}`}
          >
            {signedMoney(v.delta, { hidden })}
            {v.pct !== null ? ` (${signedPercent(v.pct, hidden)})` : ''}{' '}
            <AppText style={[styles.variationPeriod, { color: colors.subtitle }]}>{periodLabel(period)}</AppText>
          </AppText>
        ) : null}

        <View style={styles.figures}>
          <Figure label="Investi" value={money(portfolio.investedEur, { hidden })} term="Montant investi" />
          <Figure
            label="Plus-value"
            value={signedMoney(portfolio.gainEur, { hidden })}
            tone={portfolio.gainEur >= 0 ? 'success' : 'error'}
            term="Plus-value latente"
          />
          <Figure label="Revenus passifs" value={signedMoney(portfolio.passiveIncomeEur, { hidden })} tone="gold" term="Revenus passifs" />
        </View>

        <Segmented options={CHART_MODES} value={mode} onChange={setMode} />

        <View style={styles.chart}>
          {points.length >= 2 ? (
            <LineChart
              values={chartValues}
              color={colors.gold}
              dashed={mode === 'valeur' ? points.map((p) => p.invested) : null}
              dashedColor={colors.frostInk}
              dashedLabel={(x) => `montant investi : ${m(x)}`}
              level={mode === 'valeur' ? null : { value: growthAxis ? 1 : 0, label: mode === 'performance' ? '0 %' : '0 €', color: colors.subtitle }}
              signColors={mode === 'valeur' ? null : { above: colors.success, below: colors.error }}
              log={logScale}
              formatTick={hidden ? undefined : (x) => (growthAxis ? tickLabel((x - 1) * 100, 'pct') : tickLabel(x, mode === 'performance' ? 'pct' : 'eur'))}
              tickRound={growthAxis ? roundGrowth : undefined}
              dots={deposits.map((index) => ({ index, color: colors.success }))}
              area={mode === 'valeur'}
              tip={tipFor}
              summary={summary}
              onLongPressPoint={(i) => askDelete(points[i])}
            />
          ) : (
            <View style={[styles.chartEmpty, { borderColor: colors.border }]}>
              <AppText variant="callout" tone="subtitle" style={styles.center}>
                {chartLoading ? 'Chargement de la courbe…' : 'Pas encore assez de points sur cette période. La courbe se dessine au fil des jours.'}
              </AppText>
            </View>
          )}
        </View>
        {logState.note && points.length >= 2 ? (
          <AppText variant="caption" tone="subtitle" accessibilityLiveRegion="polite">
            {logState.note}
          </AppText>
        ) : null}
        {mode === 'valeur' && points.length >= 2 ? (
          <View style={styles.legend} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Legend color={colors.gold} label="valeur" />
            <Legend color={colors.frostInk} label="montant investi" dashed />
            {deposits.length > 0 ? <Legend color={colors.success} label="tes versements" dot /> : null}
          </View>
        ) : null}
        {mode === 'performance' ? (
          <View style={styles.explain}>
            <AppText variant="caption" tone="subtitle" style={styles.flex}>
              Ce qu’ont rapporté tes placements, sans compter l’argent que tu as ajouté.
            </AppText>
            <HelpTerm term="Rendement" />
          </View>
        ) : null}
        <View style={styles.periodRow}>
          <View style={styles.flex}>
            <PeriodPicker value={period} onChange={setPeriod} />
          </View>
          <ChartMenu
            hide={hideAnomalies}
            onChange={(hide) => updatePatrimoinePrefs(userKey, (p) => ({ ...p, hideAnomalies: hide }))}
            anomalies={anomalies.filter((p) => p.id !== null).map((p) => ({ key: String(p.id), label: `${shortDate(p.date, new Date(now))} · ${m(p.value)}` }))}
            onDelete={(key) => askDelete(anomalies.find((p) => String(p.id) === key))}
            log={requestedLog}
            onLogChange={(log) => updatePatrimoinePrefs(userKey, (p) => ({ ...p, logScale: log }))}
            logDisabled={logState.disabledReason}
          />
        </View>

        {shares.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <AppText variant="sectionLabel" accessibilityRole="header">
                RÉPARTITION
              </AppText>
              <Pressable
                onPress={() => {
                  tap();
                  router.push('/outils/analyse');
                }}
                hitSlop={12}
                accessibilityRole="link"
                accessibilityLabel="Analyser ma répartition"
              >
                <AppText style={[styles.link, { color: colors.gold }]}>Analyser</AppText>
              </Pressable>
            </View>
            <AllocationBar shares={shares} />
          </View>
        ) : null}

        {tip ? <ValRemark tip={tip} /> : null}

        <View style={styles.section}>
          <AppText variant="sectionLabel" accessibilityRole="header">
            TES POSITIONS
          </AppText>
          <View>
            {positions.map((p, i) => (
              <PositionLine
                key={p.id}
                position={p}
                hidden={hidden}
                last={i === positions.length - 1}
                pulseAt={data.pulse?.positionId === p.id ? data.pulse.at : null}
                onPress={() => router.push({ pathname: '/outils/actif/[id]', params: { id: String(p.id) } })}
              />
            ))}
          </View>
        </View>

        {prefs ? <GoalsSection positions={positions} prefs={prefs} emergency={emergencyPrefs ?? prefs.emergency} hidden={hidden} /> : null}

        {portfolio.closed.length > 0 ? (
          <View style={styles.section}>
            <Pressable
              onPress={() => {
                tap();
                setClosedOpen((o) => !o);
              }}
              accessibilityRole="button"
              accessibilityState={{ expanded: closedOpen }}
              accessibilityLabel={`Positions clôturées, ${portfolio.closed.length}`}
              style={styles.closedHead}
            >
              <AppText variant="sectionLabel">POSITIONS CLÔTURÉES · {portfolio.closed.length}</AppText>
              <Ionicons name={closedOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.gold} />
            </Pressable>
            {closedOpen
              ? portfolio.closed.map((c, i) => <ClosedLine key={c.id} position={c} hidden={hidden} last={i === portfolio.closed.length - 1} />)
              : null}
          </View>
        ) : null}

        <AppText variant="caption" tone="subtitle" style={[styles.center, styles.disclaimer]}>
          Valtheria ne donne pas de conseil en investissement.
        </AppText>
      </ScrollView>

      {toDelete ? (
        <BottomSheet open={deleteOpen} onRequestClose={() => setDeleteOpen(false)} onClosed={() => setToDelete(null)}>
          <View style={styles.sheet}>
            <AppText variant="title3" accessibilityRole="header">
              Supprimer ce relevé ?
            </AppText>
            <AppText variant="callout" tone="subtitle">
              {`Relevé du ${shortDate(toDelete.date, new Date(now))} : ${m(toDelete.value)}. Il disparaît de ta courbe, sans retour possible.`}
            </AppText>
            {deleteError ? (
              <AppText variant="callout" tone="error" accessibilityRole="alert" accessibilityLiveRegion="polite">
                {deleteError}
              </AppText>
            ) : null}
            <View style={styles.sheetActions}>
              <Button label="Supprimer ce relevé" variant="danger" loading={deleting} onPress={() => removeSnapshot(toDelete)} />
              <Button label="Annuler" variant="text" onPress={() => setDeleteOpen(false)} />
            </View>
          </View>
        </BottomSheet>
      ) : null}

      {celebrationCopy ? (
        <CelebrationSheet open={celebrationOpen} celebration={celebrationCopy} onClose={() => setCelebrationOpen(false)} onClosed={() => setCelebration(null)} />
      ) : null}
    </View>
  );
}

function Legend({ color, label, dashed, dot }: { color: string; label: string; dashed?: boolean; dot?: boolean }) {
  return (
    <View style={styles.legendItem}>
      {dot ? (
        <View style={[styles.legendDot, { backgroundColor: color }]} />
      ) : (
        <View style={[styles.legendLine, dashed ? { borderTopWidth: 2, borderStyle: 'dashed', borderColor: color } : { height: 3, backgroundColor: color }]} />
      )}
      <AppText variant="caption" tone="subtitle">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  periodRow: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  explain: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  sheet: { gap: space[3], paddingTop: space[2] },
  sheetActions: { gap: space[2] },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], minHeight: 52 },
  barActions: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  plus: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  content: { paddingHorizontal: space[5], gap: space[3] },
  title: { fontFamily: fonts.title, fontSize: 26, lineHeight: 32, letterSpacing: titleLetterSpacing(26) },
  hero: { marginTop: space[2], gap: 2 },
  variation: { fontFamily: fonts.bodyBold, fontSize: 14 },
  variationPeriod: { fontFamily: fonts.bodyMedium, fontSize: 14 },
  figures: { flexDirection: 'row', gap: space[2] },
  chart: { marginTop: space[1] },
  chartEmpty: {
    height: 170,
    marginTop: 44,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[4],
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendLine: { width: 14 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  section: { marginTop: space[3], gap: space[2] },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  link: { fontFamily: fonts.bodySemibold, fontSize: 14 },
  closedHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  center: { textAlign: 'center' },
  left: { textAlign: 'left' },
  disclaimer: { marginTop: space[6] },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2], flexWrap: 'wrap' },
  firstStep: { flex: 1, justifyContent: 'center', paddingHorizontal: space[5], gap: space[6] },
});
