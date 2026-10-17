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
import ChartMenu from '@/src/components/patrimoine/ChartMenu';
import LineChart from '@/src/components/patrimoine/LineChart';
import PeriodPicker from '@/src/components/patrimoine/PeriodPicker';
import { fonts, palette, radius, space, titleLetterSpacing, withOpacity } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { loadPatrimoine, usePatrimoine } from '@/src/state/patrimoineData';
import { updatePatrimoinePrefs, usePatrimoinePrefs } from '@/src/state/patrimoinePrefs';
import { userKeyOf } from '@/src/state/userMemory';
import { feedback } from '@/src/utils/feedback';
import { tap } from '@/src/utils/haptics';
import { splitAnomalies } from '@/src/utils/patrimoine/anomalies';
import { TYPE_LABELS } from '@/src/utils/patrimoine/analysis';
import { clipPrices, DEFAULT_PERIOD, operationMarks, priceRange, priceSummary, type Period } from '@/src/utils/patrimoine/chart';
import { longDate, money, quantity, quantityLabel, shortDate, signedMoney, signedPercent } from '@/src/utils/patrimoine/format';
import { isStalePrice, parseOperations, parsePriceHistory, type Operation, type PricePoint } from '@/src/utils/patrimoine/model';

// Un actif : son cours avec tes achats et ventes, ta position, tes opérations
export default function ActifScreen() {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const positionId = Number(id);
  const { user, get, del, getPortfolio } = useApi();
  const userKey = userKeyOf(user?.id);
  const data = usePatrimoine(userKey, getPortfolio);
  const prefs = usePatrimoinePrefs(userKey);
  const hidden = prefs?.discreet ?? false;

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
  const [prices, setPrices] = useState<{ range: string; points: PricePoint[] } | null>(null);
  useEffect(() => {
    if (!ticker || !market) return;
    let active = true;
    get(`/prices/history?ticker=${encodeURIComponent(ticker)}&range=${range}`)
      .then((raw: unknown) => parsePriceHistory(raw).points)
      .catch(() => [] as PricePoint[])
      .then((points: PricePoint[]) => {
        if (active) setPrices({ range, points });
      });
    return () => {
      active = false;
    };
  }, [ticker, range, market, get]);

  const now = useMemo(() => new Date(), []);
  // Cours anormaux : jugés sur toute la plage reçue, masqués par défaut
  const hideAnomalies = prefs?.hideAnomalies ?? true;
  const split = prices?.range === range ? splitAnomalies(prices.points, (p) => p.price, hideAnomalies) : null;
  const points = split ? clipPrices(split.kept, period, now) : [];
  const anomalies = split ? clipPrices(split.hidden, period, now) : [];
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
        setError(e instanceof Error ? e.message : 'Suppression impossible pour l’instant.');
      } finally {
        setBusy(false);
      }
    },
    [del, userKey, getPortfolio]
  );

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
  const mc = (v: number) => money(v, { hidden, currency });
  const realized = position ? position.realizedGain : closed!.realizedGain;
  const stale = position ? isStalePrice(position) : false;
  const headline = [ticker.replace(/^(LIVRET_|CUSTOM_).*/, ''), TYPE_LABELS[type], position && market ? `${money(position.currentPrice, { currency, exact: true })} l’unité` : null]
    .filter(Boolean)
    .join(' · ');

  const opLabel = (op: Operation) => `${op.side === 'buy' ? 'Achat' : 'Vente'} de ${quantityLabel(op.quantity, ticker, type)}`;
  const tipFor = (i: number) => {
    const p = points[i];
    const mark = marks.find((m) => m.index === i);
    return {
      title: money(p.price, { currency, exact: true }),
      caption: shortDate(p.t, now),
      extra: mark ? (mark.side === 'buy' ? 'ton achat' : 'ta vente') : undefined,
    };
  };

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
          <View accessible accessibilityLabel={`Ta position : ${hidden ? 'masquée' : money(position.valueEur ?? position.value)}${market && !hidden ? `, ${signedMoney(position.gain, { currency })} depuis tes achats` : ''}`}>
            <AppText variant="caption" tone="subtitle">
              Ta position
            </AppText>
            <BigNumber text={mc(position.value)} size={40} tone="text" style={styles.left} />
            {market ? (
              <AppText style={[styles.variation, { color: position.gain >= 0 ? colors.success : colors.error }]}>
                {signedMoney(position.gain, { hidden, currency })} ({signedPercent(position.gainPct, hidden)}){' '}
                <AppText style={[styles.variationPeriod, { color: colors.subtitle }]}>depuis tes achats</AppText>
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
                    position && position.avgCost > 0
                      ? { value: position.avgCost, label: hidden ? 'ton prix de revient' : `ton prix de revient ${money(position.avgCost, { currency, exact: true })}`, color: colors.frostInk }
                      : null
                  }
                  dots={marks.map((m) => ({ index: m.index, color: m.side === 'buy' ? colors.success : colors.error }))}
                  tip={tipFor}
                  summary={priceSummary(points, period, (x) => money(x, { currency }), name)}
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
                anomalies={anomalies.map((p) => ({ key: String(p.t), label: `${shortDate(p.t, now)} · ${money(p.price, { currency, exact: true })}` }))}
              />
            </View>
          </>
        ) : null}

        {position && market ? (
          <View style={styles.grid}>
            <View style={styles.gridRow}>
              <Figure big label="Quantité" value={quantityLabel(position.quantity, ticker, type)} />
              <Figure big label="Prix de revient moyen" value={money(position.avgCost, { hidden, currency, exact: true })} term="Prix de revient moyen" />
            </View>
            <View style={styles.gridRow}>
              <Figure big label="Investi" value={mc(position.invested)} term="Montant investi" />
              <Figure
                big
                label="Plus-value latente"
                value={signedMoney(position.gain, { hidden, currency })}
                tone={position.gain >= 0 ? 'success' : 'error'}
                term="Plus-value latente"
              />
            </View>
            {Math.abs(realized) > 0.004 ? (
              <View style={styles.gridRow}>
                <Figure big label="Plus-value réalisée" value={signedMoney(realized, { hidden, currency })} tone={realized >= 0 ? 'success' : 'error'} term="Plus-value réalisée" />
              </View>
            ) : null}
          </View>
        ) : position ? (
          <View style={styles.gridRow}>
            {position.interestRatePct !== null ? <Figure big label="Taux par an" value={`${String(position.interestRatePct).replace('.', ',')} %`} term="Taux d’intérêt" /> : null}
            {position.interestEur !== null ? <Figure big label="Intérêts sur 1 an" value={signedMoney(position.interestEur, { hidden })} tone="gold" term="Intérêts" /> : null}
            {position.isManual ? <Figure big label="Valeur estimée" value={mc(position.value)} /> : null}
          </View>
        ) : (
          <View style={styles.gridRow}>
            <Figure big label="Plus-value réalisée" value={signedMoney(realized, { hidden, currency })} tone={realized >= 0 ? 'success' : 'error'} term="Plus-value réalisée" />
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
                accessibilityLabel={`${opLabel(op)}, le ${longDate(op.executedAt)}, ${hidden ? 'montant masqué' : money(op.total, { currency: op.currency })}`}
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
                    {longDate(op.executedAt)} · {money(op.unitPrice, { hidden, currency: op.currency, exact: true })} l’unité
                  </AppText>
                </View>
                <AppText style={styles.opAmount}>{money(op.total, { hidden, currency: op.currency })}</AppText>
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
                : `${longDate(sheet.op.executedAt)} · ${quantity(sheet.op.quantity)} × ${money(sheet.op.unitPrice, { hidden, currency: sheet.op.currency })}${sheet.op.fees > 0 ? ` + ${money(sheet.op.fees, { hidden, currency: sheet.op.currency })} de frais` : ''}`}
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
