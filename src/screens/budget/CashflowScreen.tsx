import { Ionicons } from '@expo/vector-icons';
import { router, useIsFocused } from 'expo-router';
import { useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FlowDiagram, { flowColors } from '@/src/components/budget/FlowDiagram';
import LandscapeFlow from '@/src/components/budget/LandscapeFlow';
import RateBars from '@/src/components/budget/RateBars';
import AppText from '@/src/components/common/AppText';
import BackButton from '@/src/components/common/BackButton';
import Button from '@/src/components/common/Button';
import IconButton from '@/src/components/common/IconButton';
import HelpTerm from '@/src/components/patrimoine/HelpTerm';
import Segmented from '@/src/components/patrimoine/Segmented';
import { fonts, palette, radius, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { useTilt } from '@/src/hooks/useTilt';
import { localToday, longDay, monthKey, monthName, monthTitle } from '@/src/utils/budget/dates';
import {
  changeLabel,
  compareToAverage,
  FAMILY_NAMES,
  familyTotals,
  firstMonth,
  parseKey,
  periodFlow,
  periodMonths,
  rateSeries,
  ratePoints,
  shiftKey,
  shiftPeriod,
  type FlowFamily,
  type Period,
} from '@/src/utils/budget/flows';
import { euros, signedEuros } from '@/src/utils/budget/format';
import { monthReview } from '@/src/utils/budget/review';
import type { Budget } from '@/src/utils/budget/model';
import { NBSP } from '@/src/utils/frenchSpaces';
import { tap } from '@/src/utils/haptics';

const PERIODS = [
  { key: 'mois', label: 'Mois' },
  { key: 'trimestre', label: 'Trimestre' },
  { key: 'annee', label: 'Année' },
] as const;

const TOP_CATEGORIES = 3;
const FLOW_HEIGHT = 480;

function periodTitle(key: string, period: Period): string {
  const { year, month } = parseKey(key);
  if (period === 'mois') return monthTitle(year, month);
  if (period === 'trimestre') {
    const q = Math.floor((month - 1) / 3) + 1;
    return `${q === 1 ? '1er' : `${q}e`} trimestre ${year}`;
  }
  return String(year);
}

function versusLabel(key: string, period: Period): string {
  if (period === 'mois') return `vs ${monthName(parseKey(shiftKey(key, -1)).month)}`;
  if (period === 'trimestre') return 'vs le trimestre d’avant';
  return `vs ${parseKey(key).year - 1}`;
}

type Landscape = { rotation: 'left' | 'right'; byTilt: boolean };

// Cash-flow (maquette, écrans 3, 3 bis et 3 ter), dans les deux modes : le
// taux d'épargne en grand, trois chiffres, le flux de l'argent par famille
// puis par poste, six mois de taux d'épargne et les catégories comparées à ta
// moyenne. En mode Essentiel, ce qui n'est ni une charge fixe ni de
// l'épargne se lit dans les soldes : une seule bande « Dépenses courantes ».
export default function CashflowScreen({ budget }: { budget: Budget }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const tint = flowColors(colors);
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const today = localToday();
  const cur = monthKey(today);
  const mode = budget.settings.mode;
  const [period, setPeriod] = useState<Period>('mois');
  const [anchor, setAnchor] = useState(cur);
  const [focus, setFocus] = useState<FlowFamily | null>(null);
  const [allCategories, setAllCategories] = useState(false);
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  // Paysage : le bouton, ou le téléphone tourné (l'app reste en portrait)
  const [landscape, setLandscape] = useState<Landscape | null>(null);
  const tilt = useTilt(focused);
  const [seenTilt, setSeenTilt] = useState(tilt);
  if (tilt !== seenTilt) {
    setSeenTilt(tilt);
    if (tilt === 'left' || tilt === 'right') setLandscape({ rotation: tilt, byTilt: true });
    else if (tilt === 'portrait' && landscape?.byTilt) setLandscape(null);
  }

  const start = firstMonth(budget, mode);
  const months = periodMonths(anchor, period, today);
  const flow = periodFlow(budget, months, today, mode);
  const prevMonths = periodMonths(shiftPeriod(anchor, period, -1), period, today);
  const prev = periodFlow(budget, prevMonths, today, mode);
  const points = ratePoints(flow.rate);
  const prevPoints = ratePoints(prev.rate);
  const delta = points !== null && prevPoints !== null ? points - prevPoints : null;
  const title = periodTitle(anchor, period);
  const lastMonth = months[months.length - 1] ?? anchor;
  const series = rateSeries(budget, lastMonth, today, mode);
  const previous = [1, 2, 3].map((n) => periodFlow(budget, periodMonths(shiftPeriod(anchor, period, -n), period, today), today, mode));
  const rows = compareToAverage(flow, previous);
  const families = familyTotals(flow.postes);
  const canPrev = start !== null && prevMonths.some((m) => m >= start);
  const canNext = shiftPeriod(anchor, period, 1) <= cur || periodMonths(shiftPeriod(anchor, period, 1), period, today).length > 0;
  const review = period === 'mois' && anchor < cur ? monthReview(budget, anchor, today, mode) : null;
  const summary = flow.hasData
    ? `Flux de ton argent, ${title} : ${euros(flow.income)} de rentrées vers ${families.map((f) => `${FAMILY_NAMES[f.family].toLowerCase()} ${euros(f.amount)}`).join(', ')}.`
    : '';

  const move = (n: number) => {
    tap();
    setFocus(null);
    setAnchor((a) => {
      const next = shiftPeriod(a, period, n);
      return next > cur ? cur : next;
    });
  };

  let note: string | null = null;
  if (flow.hasData && flow.current) {
    if (mode === 'detaille') note = 'Mois en cours : ce que tu as noté jusqu’ici.';
    else
      note = flow.until
        ? `Mois en cours : dépenses courantes connues jusqu’au ${longDay(flow.until)}, d’après tes soldes.`
        : 'Mois en cours : tes dépenses courantes apparaîtront avec ton prochain solde.';
  } else if (flow.hasData && flow.estimated) note = 'Dépenses courantes estimées à partir des soldes relevés.';
  if (flow.hasData && period !== 'mois' && flow.counted.length < months.length) {
    note = `${note ? `${note} ` : ''}Calculé sur ${flow.counted.length} mois.`;
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <BackButton onBack={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space[8] }]}>
        <View style={styles.headRow}>
          <View style={styles.titleRow}>
            <AppText accessibilityRole="header" style={styles.title}>
              Cash-flow
            </AppText>
            {/* La fiche « Cash flow » du Dictionnaire parle d'entreprise : celle du budget
                personnel est « Budget » (N1, 20/10/2026) */}
            <HelpTerm term="Budget" alt={['Capacité d’épargne']} />
          </View>
          <View style={styles.nav}>
            <IconButton icon="chevron-back" iconSize={18} color={colors.subtitle} onPress={() => move(-1)} disabled={!canPrev} accessibilityLabel="Période précédente" />
            <AppText style={styles.navTitle} accessibilityLiveRegion="polite">
              {title}
            </AppText>
            <IconButton icon="chevron-forward" iconSize={18} color={colors.subtitle} onPress={() => move(1)} disabled={!canNext} accessibilityLabel="Période suivante" />
          </View>
        </View>
        <Segmented
          fill
          options={PERIODS}
          value={period}
          onChange={(p) => {
            setPeriod(p);
            setFocus(null);
          }}
        />

        {!flow.hasData ? (
          <AppText variant="callout" tone="subtitle" style={styles.empty}>
            {mode === 'essentiel' && start !== null && months.some((m) => m >= start)
              ? 'Pas encore assez de relevés de solde sur cette période pour connaître tes dépenses courantes. Un solde de temps en temps suffit.'
              : 'Pas encore de chiffres pour cette période. Ils arrivent au fil de tes soldes.'}
          </AppText>
        ) : (
          <>
            <View
              accessible
              accessibilityLabel={`Ton taux d’épargne : ${points ?? 0} %${delta === null ? '' : delta === 0 ? `, stable ${versusLabel(anchor, period)}` : `, ${delta > 0 ? 'plus' : 'moins'} ${Math.abs(delta)} points ${versusLabel(anchor, period)}`}.`}
              style={styles.rateBlock}
            >
              <View style={styles.titleRow}>
                <AppText variant="callout" tone="subtitle">
                  Ton taux d’épargne
                </AppText>
                <HelpTerm term="Taux d'épargne" />
              </View>
              <View style={styles.rateRow}>
                <AppText style={[styles.rate, { color: points !== null && points < 0 ? colors.error : colors.gold }]}>
                  {`${points !== null && points < 0 ? '−' : ''}${Math.abs(points ?? 0)}${NBSP}%`}
                </AppText>
                {delta !== null ? (
                  <AppText style={[styles.delta, { color: delta >= 0 ? colors.success : colors.subtitle }]}>
                    {delta === 0 ? `Stable ${versusLabel(anchor, period)}` : `${delta > 0 ? '+' : '−'}${NBSP}${Math.abs(delta)}${NBSP}point${Math.abs(delta) > 1 ? 's' : ''} ${versusLabel(anchor, period)}`}
                  </AppText>
                ) : null}
              </View>
            </View>
            <View style={styles.tiles}>
              {[
                { label: 'Rentrées', value: euros(flow.income), color: colors.success },
                { label: 'Dépenses', value: euros(flow.spent ?? 0), color: colors.text },
                { label: 'Épargne', value: (flow.saved ?? 0) < 0 ? signedEuros(flow.saved ?? 0) : euros(flow.saved ?? 0), color: colors.gold },
              ].map((t) => (
                <View key={t.label} style={[styles.tile, { backgroundColor: colors.panel }]} accessible accessibilityLabel={`${t.label} : ${t.value}`}>
                  <AppText variant="caption" tone="subtitle">
                    {t.label}
                  </AppText>
                  <AppText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.tileValue, { color: t.color }]}>
                    {t.value}
                  </AppText>
                </View>
              ))}
            </View>
            {note ? (
              <AppText variant="caption" tone="subtitle">
                {note}
              </AppText>
            ) : null}

            <View style={styles.sectionHead}>
              <AppText variant="sectionLabel" accessibilityRole="header">
                OÙ VA TON ARGENT
              </AppText>
              <Pressable
                onPress={() => {
                  tap();
                  setLandscape({ rotation: 'left', byTilt: false });
                }}
                accessibilityRole="button"
                accessibilityLabel="Voir en paysage"
                hitSlop={4}
                style={({ pressed }) => [styles.pill, { backgroundColor: pressed ? colors.surface2 : colors.panelStrong }]}
              >
                <Ionicons name="expand-outline" size={16} color={colors.gold} />
                <AppText style={styles.pillText}>Paysage</AppText>
              </Pressable>
            </View>
            <View onLayout={onLayout}>
              {width > 0 ? (
                <FlowDiagram variant="portrait" postes={flow.postes} sources={flow.sources} width={width} height={FLOW_HEIGHT} focus={focus} onFocus={setFocus} summary={summary} />
              ) : (
                <View style={{ height: FLOW_HEIGHT }} />
              )}
            </View>
            <AppText variant="caption" tone="subtitle">
              Touche une famille pour mettre son chemin en avant.
            </AppText>
            {flow.rest !== null && flow.rest < -0.5 ? (
              <AppText variant="caption" tone="subtitle">
                {`Sur cette période, ${euros(-flow.rest)} sont venus de ton compte en plus de tes rentrées.`}
              </AppText>
            ) : null}

            <View style={styles.section}>
              <AppText variant="sectionLabel" accessibilityRole="header">
                TAUX D’ÉPARGNE · 6 MOIS
              </AppText>
              <RateBars series={series} selected={lastMonth} />
            </View>

            {rows.length > 0 ? (
              <View style={styles.section}>
                <AppText variant="sectionLabel" accessibilityRole="header">
                  PAR CATÉGORIE · VS TA MOYENNE
                </AppText>
                {(allCategories ? rows : rows.slice(0, TOP_CATEGORIES)).map((r) => {
                  const change = changeLabel(r.change);
                  const up = change !== null && change !== '=' && (r.change ?? 0) > 0;
                  return (
                    <View
                      key={r.key}
                      style={[styles.catRow, { borderBottomColor: colors.border }]}
                      accessible
                      accessibilityLabel={`${r.label} : ${euros(r.amount)}${
                        change === null ? '' : change === '=' ? ', comme d’habitude' : `, ${up ? 'plus' : 'moins'} ${Math.abs(Math.round((r.change ?? 0) * 100))} % que ta moyenne`
                      }`}
                    >
                      <View style={[styles.dot, { backgroundColor: tint[r.family] }]} />
                      <AppText style={styles.catLabel} numberOfLines={1}>
                        {r.label}
                      </AppText>
                      {change !== null ? <AppText style={[styles.change, { color: up ? colors.error : colors.success }]}>{change}</AppText> : null}
                      <AppText style={styles.catAmount}>{euros(r.amount)}</AppText>
                    </View>
                  );
                })}
                {rows.length > TOP_CATEGORIES ? (
                  <Button variant="text" label={allCategories ? 'Voir moins' : 'Voir tout'} onPress={() => setAllCategories((v) => !v)} />
                ) : null}
              </View>
            ) : null}

            {review ? (
              <Button
                variant="secondary"
                label={`Voir le bilan de ${monthName(parseKey(anchor).month)}`}
                onPress={() => router.push({ pathname: '/outils/budget/bilan', params: { mois: anchor } })}
              />
            ) : null}
          </>
        )}
      </ScrollView>

      {landscape && flow.hasData ? (
        <LandscapeFlow
          rotation={landscape.rotation}
          title={title}
          income={flow.income}
          spent={flow.spent ?? 0}
          saved={flow.saved ?? 0}
          rate={flow.rate}
          postes={flow.postes}
          sources={flow.sources}
          focus={focus}
          onFocus={setFocus}
          summary={summary}
          onClose={() => {
            tap();
            setLandscape(null);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[4], minHeight: 52 },
  content: { paddingHorizontal: space[5], gap: space[3] },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: space[2] },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  title: { fontFamily: fonts.title, fontSize: 26, lineHeight: 32, letterSpacing: titleLetterSpacing(26) },
  nav: { flexDirection: 'row', alignItems: 'center' },
  navTitle: { fontFamily: fonts.bodyBold, fontSize: 15 },
  empty: { marginTop: space[4] },
  rateBlock: { marginTop: space[2] },
  rateRow: { flexDirection: 'row', alignItems: 'baseline', gap: space[3], flexWrap: 'wrap' },
  rate: { fontFamily: fonts.title, fontSize: 48, lineHeight: 56 },
  delta: { fontFamily: fonts.bodyBold, fontSize: 14 },
  tiles: { flexDirection: 'row', gap: space[2] },
  tile: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14 },
  tileValue: { fontFamily: fonts.bodyExtraBold, fontSize: 17, marginTop: 2 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space[5] },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: radius.pill },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  section: { marginTop: space[5], gap: space[2] },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: 12, borderBottomWidth: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  catLabel: { flex: 1, fontSize: 15 },
  change: { fontSize: 12 },
  catAmount: { fontFamily: fonts.bodyBold, fontSize: 15 },
});
