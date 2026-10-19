import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '@/src/components/common/AppText';
import BackButton from '@/src/components/common/BackButton';
import BigNumber from '@/src/components/common/BigNumber';
import BottomSheet from '@/src/components/common/BottomSheet';
import Button from '@/src/components/common/Button';
import PageState from '@/src/components/common/PageState';
import AssetIcon from '@/src/components/common/AssetIcon';
import Figure from '@/src/components/patrimoine/Figure';
import PatrimoineStateScreen from '@/src/components/patrimoine/PatrimoineStateScreen';
import ChartMenu from '@/src/components/patrimoine/ChartMenu';
import LineChart from '@/src/components/patrimoine/LineChart';
import PeriodPicker from '@/src/components/patrimoine/PeriodPicker';
import { fonts, palette, radius, space, titleLetterSpacing, withOpacity } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { usePatrimoineView } from '@/src/hooks/usePatrimoineView';
import { loadPatrimoine } from '@/src/state/patrimoineData';
import { updatePatrimoinePrefs, usePatrimoinePrefs } from '@/src/state/patrimoinePrefs';
import { userKeyOf } from '@/src/state/userMemory';
import { feedback } from '@/src/utils/feedback';
import { tap } from '@/src/utils/haptics';
import { actionErrorText } from '@/src/utils/loadError';
import { splitAnomalies } from '@/src/utils/patrimoine/anomalies';
import { TYPE_LABELS } from '@/src/utils/patrimoine/analysis';
import { clipPrices, compactTick, DEFAULT_PERIOD, operationMarks, periodLabel, priceRange, priceSummary, scrubDateLabel, type Period } from '@/src/utils/patrimoine/chart';
import { moneyEur, originalNote, ratesOf, toEur } from '@/src/utils/patrimoine/currency';
import { longDate, money, quantity, quantityLabel, rateDateLabel, shortDate, signedMoney, signedPercent } from '@/src/utils/patrimoine/format';
import { isStalePrice, parseOperations, parsePriceHistory, type Operation, type PricePoint } from '@/src/utils/patrimoine/model';

// Un actif : son cours avec tes achats et ventes, ta position, tes opérations
export default function ActifScreen() {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const positionId = Number(id);
  const { user, get, del, getPortfolio } = useApi();
  const v = usePatrimoineView();
  const userKey = v.userKey ?? userKeyOf(user?.id);
  const data = v.data;
  const prefs = usePatrimoinePrefs(userKey);
  const hidden = prefs?.discreet ?? false;
  // Taux du jour de la liste : tout s'affiche en euros, converti de la même façon
  const portfolio = data.portfolio;
  const rates = useMemo(() => ratesOf(portfolio?.positions ?? [], portfolio?.eurUsd ?? null), [portfolio]);

  const position = data.portfolio?.positions.find((p) => p.id === positionId) ?? null;
  const closed = data.portfolio?.closed.find((p) => p.id === positionId) ?? null;
  const market = position ? !position.isLivret && !position.isManual : !!closed;

  // Opérations de la position
  const [ops, setOps] = useState<{ key: number | null; list: Operation[] } | null>(null);
  useEffect(() => {
    if (!positionId) return;
    let active = true;
    get(`/portfolio/positions/${positionId}/operations`)
      .then((raw: unknown) => parseOperations(raw))
      .catch(() => [] as Operation[])
      .then((list: Operation[]) => {
        if (active) setOps({ key: data.fetchedAt, list });
      });
    return () => {
      active = false;
    };
  }, [positionId, get, data.fetchedAt]);

  // Cours de l'actif
  const [period, setPeriod] = useState<Period>(DEFAULT_PERIOD);
  const ticker = position?.ticker ?? closed?.ticker ?? '';
  const range = priceRange(period);
  const [prices, setPrices] = useState<{ range: string; points: PricePoint[]; currency: string } | null>(null);
  useEffect(() => {
    if (!ticker || !market) return;
    let active = true;
    get(`/prices/history?ticker=${encodeURIComponent(ticker)}&range=${range}`)
      .then((raw: unknown) => parsePriceHistory(raw))
      .catch(() => ({ points: [] as PricePoint[], currency: 'EUR' }))
      .then(({ points, currency }: { points: PricePoint[]; currency: string }) => {
        if (active) setPrices({ range, points, currency });
      });
    return () => {
      active = false;
    };
  }, [ticker, range, market, get]);

  const now = useMemo(() => new Date(), []);
  // Cours anormaux : jugés sur toute la plage reçue, masqués par défaut
  const hideAnomalies = prefs?.hideAnomalies ?? true;
  // Cours converti en euros comme la liste (taux inconnu : gardé dans sa devise)
  const seriesRate = prices ? (rates[prices.currency.toUpperCase()] ?? null) : null;
  const chartCurrency = prices && seriesRate === null ? prices.currency.toUpperCase() : 'EUR';
  const converted = prices ? prices.points.map((p) => ({ t: p.t, price: p.price * (seriesRate ?? 1) })) : [];
  const split = prices?.range === range ? splitAnomalies(converted, (p) => p.price, hideAnomalies) : null;
  const periodPoints = split ? clipPrices(split.kept, period, now) : [];
  const anomalies = split ? clipPrices(split.hidden, period, now) : [];
  // Pendant le chargement d'une autre plage, la courbe affichée reste celle d'avant
  // (empreinte des points : ni boucle, ni dépendance à la mémorisation)
  const sig = `${period}|${range}|${hideAnomalies ? 1 : 0}|${periodPoints.length}|${periodPoints[0]?.t ?? ''}|${periodPoints[periodPoints.length - 1]?.price ?? ''}`;
  const [shown, setShown] = useState<{ sig: string; points: PricePoint[]; period: Period } | null>(null);
  if (split && shown?.sig !== sig) setShown({ sig, points: periodPoints, period });
  const points = split ? periodPoints : (shown?.points ?? []);
  const shownPeriod = split ? period : (shown?.period ?? period);
  // Point touché sur la courbe : la position et sa variation le suivent
  const [scrub, setScrub] = useState<number | null>(null);
  const marks = operationMarks(points, ops?.list ?? []);

  // Opération touchée : modifier ou supprimer
  const [sheet, setSheet] = useState<{ op: Operation; confirm: boolean } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = useCallback(
    async (op: Operation) => {
      setBusy(true);
      setError(null);
      try {
        await del(`/portfolio/operations/${op.id}`);
        feedback.drop();
        setSheetOpen(false);
        await loadPatrimoine(userKey, getPortfolio, true);
      } catch (e: unknown) {
        feedback.wrong(0.6);
        setError(actionErrorText(e, 'Suppression impossible pour l’instant. Réessaie dans un instant.'));
      } finally {
        setBusy(false);
      }
    },
    [del, userKey, getPortfolio]
  );

  // Pas encore de patrimoine à montrer : chargement, sans compte, ou erreur
  // (hors ligne, serveur) ; jamais « n'est plus dans ton patrimoine » à tort
  if (v.view !== 'ready') return <PatrimoineStateScreen view={v.view} errorKind={v.errorKind} onRetry={v.retry} />;

  if (!position && !closed) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.bar}>
          <BackButton onBack={() => router.back()} />
        </View>
        <PageState variant="empty" mood="rassurant" text="Cet actif n’est plus dans ton patrimoine." />
      </View>
    );
  }

  const name = position?.name ?? closed!.name;
  const type = position?.type ?? closed!.type;
  const currency = position?.currency ?? closed!.currency;
  // Montant de la position en euros (repli : sa devise si le taux manque)
  const eur = (v: number) => toEur(v, currency, rates);
  const me = (v: number, exact = false) => {
    const e = eur(v);
    return e === null ? money(v, { hidden, currency, exact }) : money(e, { hidden, exact });
  };
  // Montant d'origine, sous un montant converti
  const orig = (v: number, exact = false) => (hidden || eur(v) === null ? null : originalNote(v, currency, { exact }));
  const realizedEur = position ? position.realizedGainEur : closed!.realizedGainEur;
  const stale = position ? isStalePrice(position) : false;
  const headline = [ticker.replace(/^(LIVRET_|CUSTOM_).*/, ''), TYPE_LABELS[type], position && market ? `${me(position.currentPrice, true)} l’unité` : null]
    .filter(Boolean)
    .join(' · ');
  // Prix d'une opération dans la devise de la courbe (pour placer son point)
  const inChart = (amount: number, cur: string) => (chartCurrency === 'EUR' ? toEur(amount, cur, rates) : cur.toUpperCase() === chartCurrency ? amount : null);
  const pru = position && position.avgCost > 0 ? inChart(position.avgCost, currency) : null;
  // Valeur de la position et plus-value depuis les achats, en euros
  const valueShown = position ? (position.valueEur ?? position.value) : 0;
  const gainShown = position ? (position.valueEur !== null && position.investedEur !== null ? position.valueEur - position.investedEur : position.gain) : 0;
  // Variation du cours sur la période affichée (jusqu'au point touché), appliquée
  // à la quantité détenue
  const scrubbed = scrub !== null && scrub < points.length ? points[scrub] : null;
  const first = points.length >= 2 ? points[0].price : null;
  const last = scrubbed ? scrubbed.price : points.length >= 2 ? points[points.length - 1].price : null;
  const periodText = scrubbed && points.length > 0 ? `depuis le ${shortDate(points[0].t, now)}` : periodLabel(shownPeriod);
  // Valeur de la position au cours du point touché
  const scrubValue = scrubbed && position ? (chartCurrency === 'EUR' ? position.quantity * scrubbed.price : toEur(position.quantity * scrubbed.price, chartCurrency, rates)) : null;
  const periodPct = first !== null && last !== null && first > 0 ? (last / first - 1) * 100 : null;
  const periodAmount = position && first !== null && last !== null ? (chartCurrency === 'EUR' ? position.quantity * (last - first) : toEur(position.quantity * (last - first), chartCurrency, rates)) : null;

  const opLabel = (op: Operation) => `${op.side === 'buy' ? 'Achat' : 'Vente'} de ${quantityLabel(op.quantity, ticker, type)}`;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <BackButton onBack={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space[8] }]}>
        <View style={styles.head}>
          <AssetIcon logoUrl={position?.logoUrl ?? closed?.logoUrl ?? null} name={name} ticker={ticker} type={type} size={52} />
          <View style={styles.headText}>
            <AppText accessibilityRole="header" numberOfLines={2} style={styles.name}>
              {name}
            </AppText>
            <AppText variant="caption" tone="subtitle">
              {headline}
            </AppText>
          </View>
        </View>
        {stale ? (
          <AppText variant="caption" style={{ color: colors.gold }}>
            Cours figé : la source ne répond pas, c’est le dernier cours connu{position?.priceUpdatedAt ? ` (${shortDate(position.priceUpdatedAt, now)})` : ''}.
          </AppText>
        ) : null}

        {position ? (
          <View
            accessible
            accessibilityLabel={`Ta position : ${hidden ? 'masquée' : money(valueShown)}${
              market && !hidden ? `, ${signedMoney(gainShown)} depuis tes achats` : ''
            }${market && !hidden && periodPct !== null && periodAmount !== null ? `, ${signedMoney(periodAmount)} ${periodText}` : ''}`}
          >
            <AppText variant="caption" tone="subtitle">
              Ta position
            </AppText>
            <BigNumber
              text={scrubValue !== null ? money(scrubValue, { hidden }) : money(valueShown, { hidden, currency: position.valueEur !== null ? 'EUR' : currency })}
              size={40}
              tone="text"
              style={styles.left}
            />
            {market && !scrubbed ? (
              <AppText style={[styles.variation, { color: gainShown >= 0 ? colors.success : colors.error }]}>
                {signedMoney(gainShown, { hidden })} ({signedPercent(position.gainPct, hidden)}){' '}
                <AppText style={[styles.variationPeriod, { color: colors.subtitle }]}>depuis tes achats</AppText>
              </AppText>
            ) : null}
            {market && periodPct !== null && periodAmount !== null ? (
              <AppText style={[styles.variation, { color: periodAmount >= 0 ? colors.success : colors.error }]}>
                {signedMoney(periodAmount, { hidden })} ({signedPercent(periodPct, hidden)}){' '}
                <AppText style={[styles.variationPeriod, { color: colors.subtitle }]}>{periodText}</AppText>
              </AppText>
            ) : null}
          </View>
        ) : (
          <AppText variant="callout" tone="subtitle">
            Position clôturée{closed?.closedAt ? ` le ${longDate(closed.closedAt)}` : ''}.
          </AppText>
        )}

        {market ? (
          <>
            <View style={styles.chart}>
              {points.length >= 2 ? (
                <LineChart
                  values={points.map((p) => p.price)}
                  color={colors.gold}
                  area={false}
                  level={
                    pru !== null
                      ? { value: pru, label: hidden ? 'prix de revient' : `prix de revient ${money(pru, { currency: chartCurrency, exact: true })}`, color: colors.frostInk }
                      : null
                  }
                  // Point d'un achat ou d'une vente : à son prix, converti comme la liste
                  dots={marks.map((m) => {
                    const op = ops?.list.find((o) => o.id === m.operationId);
                    const at = op ? inChart(op.unitPrice, op.currency) : null;
                    return { index: m.index, color: m.side === 'buy' ? colors.success : colors.error, value: at ?? undefined };
                  })}
                  formatTick={hidden ? undefined : (x) => (chartCurrency === 'EUR' ? compactTick(x, 'eur') : money(x, { currency: chartCurrency }))}
                  extremeLabel={hidden ? undefined : (x) => money(x, { currency: chartCurrency, exact: x < 100 })}
                  times={points.map((p) => p.t)}
                  dateLabel={(i) => scrubDateLabel(points[i].t, shownPeriod, now)}
                  onScrub={setScrub}
                  animateKey={shownPeriod}
                  summary={priceSummary(points, period, (x) => money(x, { currency: chartCurrency }), name)}
                />
              ) : (
                <View style={[styles.chartEmpty, { borderColor: colors.border }]}>
                  <AppText variant="callout" tone="subtitle" style={styles.center}>
                    {prices?.range !== range ? 'Chargement du cours…' : 'Pas de cours disponible sur cette période.'}
                  </AppText>
                </View>
              )}
            </View>
            {marks.length > 0 ? (
              <View style={styles.legend} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <LegendDot color={colors.success} label="tes achats" />
                {marks.some((m) => m.side === 'sell') ? <LegendDot color={colors.error} label="tes ventes" /> : null}
              </View>
            ) : null}
            <View style={styles.periodRow}>
              <View style={styles.flex}>
                <PeriodPicker value={period} onChange={setPeriod} />
              </View>
              <ChartMenu
                hide={hideAnomalies}
                onChange={(hide) => updatePatrimoinePrefs(userKey, (p) => ({ ...p, hideAnomalies: hide }))}
                anomalies={anomalies.map((p) => ({ key: String(p.t), label: `${shortDate(p.t, now)} · ${money(p.price, { currency: chartCurrency, exact: true })}` }))}
              />
            </View>
          </>
        ) : null}

        {position && market ? (
          <View style={styles.grid}>
            <View style={styles.gridRow}>
              <Figure big label="Quantité" value={quantityLabel(position.quantity, ticker, type)} />
              <Figure big label="Prix de revient moyen" value={me(position.avgCost, true)} note={orig(position.avgCost, true)} term="Prix de revient moyen" />
            </View>
            <View style={styles.gridRow}>
              <Figure big label="Investi" value={money(position.investedEur ?? position.invested, { hidden, currency: position.investedEur !== null ? 'EUR' : currency })} note={orig(position.invested)} term="Montant investi" />
              <Figure
                big
                label="Plus-value latente"
                value={signedMoney(gainShown, { hidden })}
                note={hidden || currency === 'EUR' ? null : signedMoney(position.gain, { currency })}
                tone={gainShown >= 0 ? 'success' : 'error'}
                term="Plus-value latente"
              />
            </View>
            {Math.abs(realizedEur) > 0.004 ? (
              <View style={styles.gridRow}>
                <Figure big label="Plus-value réalisée" value={signedMoney(realizedEur, { hidden })} tone={realizedEur >= 0 ? 'success' : 'error'} term="Plus-value réalisée" />
              </View>
            ) : null}
          </View>
        ) : position ? (
          <View style={styles.gridRow}>
            {position.interestRatePct !== null ? (
              <Figure
                big
                label="Taux par an"
                value={`${String(position.interestRatePct).replace('.', ',')}\u00a0%`}
                // Taux réglementaire : sa date (« taux au 1er août 2026 ») ; taux saisi : rien
                note={position.interestRateSource === 'regulatory' ? rateDateLabel(position.interestRateEffectiveAt, position.interestRateVerifiedAt) : null}
                term="Taux d’intérêt"
              />
            ) : null}
            {position.interestEur !== null ? <Figure big label="Intérêts sur 1 an" value={signedMoney(position.interestEur, { hidden })} tone="gold" term="Intérêts" /> : null}
            {position.isManual ? <Figure big label="Valeur estimée" value={me(position.value)} /> : null}
          </View>
        ) : (
          <View style={styles.gridRow}>
            <Figure big label="Plus-value réalisée" value={signedMoney(realizedEur, { hidden })} tone={realizedEur >= 0 ? 'success' : 'error'} term="Plus-value réalisée" />
          </View>
        )}

        {ops && ops.list.length > 0 ? (
          <View style={styles.section}>
            <AppText variant="sectionLabel" accessibilityRole="header">
              TES OPÉRATIONS
            </AppText>
            {ops.list.map((op, i) => (
              <Pressable
                key={op.id}
                onPress={() => {
                  tap();
                  setError(null);
                  setSheet({ op, confirm: false });
                  setSheetOpen(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${opLabel(op)}, le ${longDate(op.executedAt)}, ${hidden ? 'montant masqué' : moneyEur(op.total, op.currency, rates)}`}
                accessibilityHint="Modifier ou supprimer cette opération"
                style={({ pressed }) => [
                  styles.opRow,
                  i < ops.list.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={[styles.opIcon, { backgroundColor: withOpacity(op.side === 'buy' ? colors.success : colors.error, 0.14) }]}>
                  <Ionicons name={op.side === 'buy' ? 'arrow-up' : 'arrow-down'} size={16} color={op.side === 'buy' ? colors.success : colors.error} />
                </View>
                <View style={styles.opBody}>
                  <AppText style={styles.opTitle}>{opLabel(op)}</AppText>
                  <AppText variant="caption" tone="subtitle">
                    {longDate(op.executedAt)} · {moneyEur(op.unitPrice, op.currency, rates, { hidden, exact: true })} l’unité
                  </AppText>
                </View>
                <AppText style={styles.opAmount}>{money(toEur(op.total, op.currency, rates) ?? op.total, { hidden, currency: toEur(op.total, op.currency, rates) === null ? op.currency : 'EUR' })}</AppText>
                <Ionicons name="chevron-forward" size={14} color={colors.subtitle} />
              </Pressable>
            ))}
          </View>
        ) : null}

        {position ? (
          <View style={styles.cta}>
            <Button
              label={market ? 'Noter une opération' : 'Mettre à jour'}
              icon={market ? 'add' : 'create-outline'}
              onPress={() => router.push({ pathname: '/outils/operation', params: { positionId: String(position.id) } })}
            />
            <AppText variant="caption" tone="subtitle" style={styles.center}>
              {market
                ? 'Un achat ou une vente faits chez ton courtier, pour garder ton suivi à jour.'
                : position.isLivret
                  ? 'Un versement ou un retrait, pour garder ton suivi à jour.'
                  : 'Sa valeur estimée, mise à jour à la main.'}
            </AppText>
          </View>
        ) : null}
      </ScrollView>

      {sheet ? (
        <BottomSheet open={sheetOpen} onRequestClose={() => setSheetOpen(false)} onClosed={() => setSheet(null)}>
          <View style={styles.sheet}>
            <AppText variant="title3" accessibilityRole="header">
              {sheet.confirm ? 'Supprimer cette opération ?' : opLabel(sheet.op)}
            </AppText>
            <AppText variant="callout" tone="subtitle">
              {sheet.confirm
                ? 'Ta position et ton prix de revient seront recalculés sans elle.'
                : `${longDate(sheet.op.executedAt)} · ${quantity(sheet.op.quantity)} × ${moneyEur(sheet.op.unitPrice, sheet.op.currency, rates, { hidden, exact: true })}${sheet.op.fees > 0 ? ` + ${moneyEur(sheet.op.fees, sheet.op.currency, rates, { hidden, exact: true })} de frais` : ''}`}
            </AppText>
            {error ? (
              <AppText variant="callout" tone="error" accessibilityRole="alert" accessibilityLiveRegion="polite">
                {error}
              </AppText>
            ) : null}
            {sheet.confirm ? (
              <View style={styles.sheetActions}>
                <Button label="Supprimer" variant="danger" loading={busy} onPress={() => remove(sheet.op)} />
                <Button label="Annuler" variant="text" onPress={() => setSheetOpen(false)} />
              </View>
            ) : (
              <View style={styles.sheetActions}>
                <Button
                  label="Modifier"
                  onPress={() => {
                    setSheetOpen(false);
                    router.push({ pathname: '/outils/operation', params: { positionId: String(positionId), operationId: String(sheet.op.id) } });
                  }}
                />
                <Button label="Supprimer" variant="textDanger" onPress={() => setSheet({ ...sheet, confirm: true })} />
              </View>
            )}
          </View>
        </BottomSheet>
      ) : null}
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
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
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[4], minHeight: 52 },
  content: { paddingHorizontal: space[5], gap: space[3] },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  headText: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.title, fontSize: 28, lineHeight: 34, letterSpacing: titleLetterSpacing(28) },
  variation: { fontFamily: fonts.bodyBold, fontSize: 14 },
  variationPeriod: { fontFamily: fonts.bodyMedium, fontSize: 14 },
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
  legend: { flexDirection: 'row', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  grid: { gap: space[2] },
  gridRow: { flexDirection: 'row', gap: space[2] },
  section: { marginTop: space[3], gap: space[1] },
  opRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] },
  opIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  opBody: { flex: 1, gap: 2 },
  opTitle: { fontFamily: fonts.bodySemibold, fontSize: 15 },
  opAmount: { fontFamily: fonts.bodyBold, fontSize: 14, fontVariant: ['tabular-nums'] },
  cta: { marginTop: space[4], gap: space[2] },
  center: { textAlign: 'center' },
  left: { textAlign: 'left' },
  sheet: { gap: space[3], paddingTop: space[4] },
  sheetActions: { gap: space[2], alignItems: 'center' },
});
