import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import IconButton from '@/src/components/common/IconButton';
import TextField from '@/src/components/common/TextField';
import AssetIcon from '@/src/components/common/AssetIcon';
import DateField from '@/src/components/patrimoine/DateField';
import IconPicker from '@/src/components/patrimoine/IconPicker';
import Segmented from '@/src/components/patrimoine/Segmented';
import { fonts, palette, radius, space, withOpacity } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { usePatrimoineView } from '@/src/hooks/usePatrimoineView';
import { actionErrorText } from '@/src/utils/loadError';
import { usePickedAsset, type PickedAsset } from '@/src/state/assetPick';
import { loadPatrimoine, markPositionPulse } from '@/src/state/patrimoineData';
import { updatePatrimoinePrefs, usePatrimoinePrefs } from '@/src/state/patrimoinePrefs';
import { userKeyOf } from '@/src/state/userMemory';
import { feedback } from '@/src/utils/feedback';
import { tap } from '@/src/utils/haptics';
import { isIconKey, type IconKey } from '@/src/utils/patrimoine/assetIcons';
import { moneyEur, ratesOf, toEur, type Rates } from '@/src/utils/patrimoine/currency';
import { money, quantityLabel, rateDateLabel, signedMoney } from '@/src/utils/patrimoine/format';
import {
  dayOf,
  isRegulatedLivret,
  livretDeposit,
  livretPayload,
  manualPatch,
  manualPayload,
  MANUAL_KINDS,
  operationPatch,
  operationPayload,
  parseIsoDay,
  type Day,
  type ManualKind,
  type Payload,
} from '@/src/utils/patrimoine/forms';
import { ASSET_TYPES, parseOperations, type AssetType, type Operation, type Side } from '@/src/utils/patrimoine/model';
import { addLivretDeposit, setIcon } from '@/src/utils/patrimoine/prefs';
import { parseDecimal, previewOperation } from '@/src/utils/patrimoine/preview';

type Params = {
  positionId?: string;
  operationId?: string;
  ticker?: string;
  name?: string;
  type?: string;
  logo?: string;
  price?: string;
  manual?: string;
  // Icône d'un placement proposé par la recherche
  icon?: string;
};

// Saisies de la personne, par-dessus les valeurs par défaut (opération
// modifiée, cours actuel…)
type Edits = Partial<Record<'quantity' | 'unitPrice' | 'fees' | 'name' | 'amount' | 'ratePct' | 'value' | 'paid', string>> & {
  side?: Side;
  day?: Day;
  manualKind?: ManualKind;
  // Icône choisie (null : automatique)
  icon?: IconKey | null;
};

const decimalText = (n: number | null | undefined) => (n === null || n === undefined || !Number.isFinite(n) ? '' : String(Math.round(n * 1e8) / 1e8).replace('.', ','));

// Noter une opération : achat ou vente d'un actif coté (aperçu de la position
// après), versement sur un livret, ou bien estimé à la main.
export default function OperationScreen() {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<Params>();
  const { user, get, post, patch, getPortfolio } = useApi();
  const v = usePatrimoineView();
  const userKey = v.userKey ?? userKeyOf(user?.id);
  const data = v.data;
  const prefs = usePatrimoinePrefs(userKey);
  const hidden = prefs?.discreet ?? false;
  const [mountedAt] = useState(() => Date.now());
  const picked = usePickedAsset();

  const positions = data.portfolio?.positions ?? [];
  const existing = params.positionId ? positions.find((p) => p.id === Number(params.positionId)) ?? null : null;
  const kind: 'market' | 'livret' | 'manual' = existing
    ? existing.isLivret
      ? 'livret'
      : existing.isManual
        ? 'manual'
        : 'market'
    : params.manual
      ? 'manual'
      : params.type === 'livret'
        ? 'livret'
        : 'market';

  // Actif (coté) : celui de la position, du lien, ou choisi dans la recherche
  const base: PickedAsset | null = existing
    ? { ticker: existing.ticker, name: existing.name, type: existing.type, logoUrl: existing.logoUrl, priceEur: existing.valueEur !== null && existing.quantity > 0 ? existing.valueEur / existing.quantity : null }
    : params.ticker
      ? {
          ticker: params.ticker,
          name: params.name || params.ticker,
          type: ASSET_TYPES.includes(params.type as AssetType) ? (params.type as AssetType) : 'autre',
          logoUrl: params.logo || null,
          priceEur: params.price ? Number(params.price) : null,
        }
      : null;
  const asset = picked && picked.at > mountedAt && !params.operationId ? picked.asset : base;
  const holdingPosition = asset
    ? positions.find((p) => !p.isLivret && !p.isManual && p.ticker.toUpperCase() === asset.ticker.toUpperCase()) ?? null
    : null;
  const currency = holdingPosition?.currency ?? 'EUR';
  // Taux du jour de la liste : montants montrés aussi en euros
  const rates = ratesOf(positions, data.portfolio?.eurUsd ?? null);
  const inEur = (v: number) => {
    const e = toEur(v, currency, rates);
    return money(e ?? v, { hidden, currency: e === null ? currency : 'EUR' });
  };
  // Livret réglementé : taux du site, jamais saisi
  const regulated = kind === 'livret' && (existing ? existing.interestRateSource === 'regulatory' || isRegulatedLivret(existing.ticker) : isRegulatedLivret(params.ticker));

  // Opération modifiée
  const editingId = params.operationId ? Number(params.operationId) : null;
  const [editing, setEditing] = useState<Operation | null>(null);
  useEffect(() => {
    if (!editingId || !params.positionId) return;
    let active = true;
    get(`/portfolio/positions/${params.positionId}/operations`)
      .then((raw: unknown) => {
        const op = parseOperations(raw).find((o) => o.id === editingId) ?? null;
        if (active) setEditing(op);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [editingId, params.positionId, get]);

  const [edits, setEdits] = useState<Edits>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const edit = (patchEdits: Edits) => {
    setError(null);
    setEdits((e) => ({ ...e, ...patchEdits }));
  };

  // Valeurs : saisie, sinon valeur par défaut
  const priceNow = holdingPosition && holdingPosition.currentPrice > 0 ? holdingPosition.currentPrice : asset?.priceEur ?? null;
  const side: Side = edits.side ?? editing?.side ?? 'buy';
  const quantityText = edits.quantity ?? (editing ? decimalText(editing.quantity) : '');
  const unitPriceText = edits.unitPrice ?? (editing ? decimalText(editing.unitPrice) : decimalText(priceNow !== null ? Math.round(priceNow * 100) / 100 : null));
  const feesText = edits.fees ?? (editing && editing.fees > 0 ? decimalText(editing.fees) : '');
  const day = edits.day ?? parseIsoDay(editing?.executedAt) ?? dayOf(new Date());
  const nameText = edits.name ?? existing?.name ?? (kind === 'livret' ? params.name || (params.ticker === 'LIVRET_A' ? 'Livret A' : '') : params.name ?? '');
  const amountText = edits.amount ?? (existing ? decimalText(existing.value) : '');
  const rateText = edits.ratePct ?? (existing?.interestRatePct !== null && existing?.interestRatePct !== undefined ? decimalText(existing.interestRatePct) : '');
  const valueText = edits.value ?? (existing ? decimalText(existing.value) : '');
  const paidText = edits.paid ?? '';
  // Icône (livret, bien) : choisie ici, sinon celle de la recherche, sinon celle déjà gardée
  const iconChoice: IconKey | null =
    edits.icon !== undefined ? edits.icon : isIconKey(params.icon) ? params.icon : existing ? (prefs?.icons[existing.ticker.toUpperCase()] ?? null) : null;
  const manualKind: ManualKind = edits.manualKind ?? (MANUAL_KINDS.some((k) => k.key === params.manual) ? (params.manual as ManualKind) : 'immobilier');

  // Aperçu (achat ou vente d'un actif coté, hors modification)
  const holding = holdingPosition ? { quantity: holdingPosition.quantity, avgCost: holdingPosition.avgCost } : null;
  const fees = feesText.trim() === '' ? 0 : parseDecimal(feesText);
  const preview =
    kind === 'market' && asset && !editing && quantityText.trim() !== ''
      ? previewOperation(holding, { side, quantity: parseDecimal(quantityText), unitPrice: parseDecimal(unitPriceText), fees })
      : null;

  // Requête
  const payload: Payload | null = (() => {
    // Suffixe des symboles créés à la main : l'instant d'ouverture de l'écran
    const now = mountedAt;
    if (kind === 'livret') {
      return livretPayload({ ticker: existing?.ticker ?? (params.ticker || null), name: nameText, amount: amountText, ratePct: rateText }, now);
    }
    if (kind === 'manual') return existing ? manualPatch({ name: nameText, value: valueText, paid: paidText }) : manualPayload({ name: nameText, value: valueText, paid: paidText }, manualKind, now);
    if (!asset) return { ok: false, field: 'ticker', message: 'Choisis un actif.' };
    const form = { side, ticker: asset.ticker, name: asset.name, type: asset.type, quantity: quantityText, unitPrice: unitPriceText, fees: feesText, currency, day };
    return editing ? operationPatch(form) : operationPayload(form);
  })();
  const blocked = preview && !preview.ok ? preview.message : payload && !payload.ok ? payload.message : null;

  const submitLabel = (() => {
    if (kind === 'livret') return existing ? 'Mettre à jour le livret' : 'Ajouter ce livret';
    if (kind === 'manual') return existing ? 'Mettre à jour la valeur' : 'Ajouter ce bien';
    if (editing) return 'Enregistrer les changements';
    if (preview?.ok) {
      const p = preview.preview;
      return p.side === 'buy'
        ? `Enregistrer l’achat · ${inEur(p.total)}`
        : `Enregistrer la vente · ${inEur(p.proceeds)}`;
    }
    return side === 'buy' ? 'Enregistrer l’achat' : 'Enregistrer la vente';
  })();

  // L'enregistrement lui-même, à part : le compilateur React saute tout
  // l'écran quand un try/catch contient une condition ou un « finally »
  const saveOperation = async () => {
    if (!payload || !payload.ok) return;
    let positionId: number | null = existing?.id ?? null;
    let deposit = 0;
    if (kind === 'market') {
      const res = editing ? await patch(`/portfolio/operations/${editing.id}`, payload.body) : await post('/portfolio/operations', payload.body);
      positionId = typeof res?.position?.id === 'number' ? res.position.id : positionId;
    } else if (existing) {
      const body = kind === 'livret' ? { name: payload.body.name, quantity: 1, buy_price: payload.body.buy_price, rate: payload.body.rate ?? null } : payload.body;
      await patch(`/portfolio/positions/${existing.id}`, body);
      if (kind === 'livret') deposit = livretDeposit(existing.value, Number(payload.body.buy_price));
    } else {
      const res = await post('/portfolio/positions', payload.body);
      positionId = typeof res?.id === 'number' ? res.id : null;
      if (kind === 'livret') deposit = livretDeposit(null, Number(payload.body.buy_price));
    }
    // Icône d'un livret ou d'un bien : gardée sur le téléphone, par symbole
    const iconTicker = kind === 'market' ? null : (existing?.ticker ?? (typeof payload.body.ticker === 'string' ? payload.body.ticker : null));
    if (iconTicker) updatePatrimoinePrefs(userKey, (p) => setIcon(p, iconTicker, iconChoice));
    if (deposit > 0) {
      updatePatrimoinePrefs(userKey, (p) => addLivretDeposit(p, { at: new Date().toISOString(), amount: deposit, positionId }));
    }
    feedback.right(0.8);
    await loadPatrimoine(userKey, getPortfolio, true);
    if (positionId !== null) markPositionPulse(positionId);
    if (params.positionId || positionId === null) router.back();
    else router.replace({ pathname: '/outils/actif/[id]', params: { id: String(positionId) } });
  };
  const save = async () => {
    if (!payload || !payload.ok || busy) return;
    setBusy(true);
    setError(null);
    try {
      await saveOperation();
    } catch (e: unknown) {
      feedback.wrong(0.6);
      setError(actionErrorText(e, 'Enregistrement impossible pour l’instant. Réessaie dans un instant.'));
    }
    setBusy(false);
  };

  const title = editing || params.operationId ? 'Modifier l’opération' : kind === 'livret' ? (existing ? 'Ton livret' : 'Ajouter un livret') : kind === 'manual' ? (existing ? 'Mettre à jour' : 'Ajouter un bien') : 'Noter une opération';
  const canSell = !!holding || editing?.side === 'sell';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <IconButton icon="close" accessibilityLabel="Fermer" onPress={() => router.back()} />
        <AppText variant="bodyMedium" accessibilityRole="header" style={styles.barTitle}>
          {title}
        </AppText>
        <View style={styles.spacer} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
          {kind === 'market' ? (
            <>
              <Segmented
                fill
                options={[
                  { key: 'buy', label: 'Achat' },
                  { key: 'sell', label: 'Vente', disabled: !canSell },
                ]}
                value={side}
                onChange={(s) => edit({ side: s })}
                activeColor={side === 'buy' ? colors.success : colors.error}
              />

              <View style={styles.field}>
                <AppText variant="caption" tone="subtitle">
                  Actif
                </AppText>
                <Pressable
                  disabled={!!params.positionId || !!params.operationId}
                  onPress={() => {
                    tap();
                    setEdits((e) => ({ ...e, unitPrice: undefined }));
                    router.push({ pathname: '/outils/recherche', params: { mode: 'pick' } });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={asset ? `Actif : ${asset.name}` : 'Choisir un actif'}
                  accessibilityHint={asset && !params.positionId ? 'Changer d’actif' : undefined}
                  style={({ pressed }) => [styles.assetField, { backgroundColor: colors.surface, borderColor: colors.controlBorder }, pressed && { opacity: 0.8 }]}
                >
                  {asset ? (
                    <>
                      <AssetIcon logoUrl={asset.logoUrl} name={asset.name} ticker={asset.ticker} type={asset.type} size={28} />
                      <AppText numberOfLines={1} style={styles.assetName}>
                        {asset.name}{' '}
                        <AppText style={[styles.assetTicker, { color: colors.subtitle }]}>{asset.ticker}</AppText>
                      </AppText>
                      {!params.positionId && !params.operationId ? <AppText style={[styles.change, { color: colors.gold }]}>Changer</AppText> : null}
                    </>
                  ) : (
                    <>
                      <Ionicons name="search" size={20} color={colors.gold} />
                      <AppText style={[styles.assetName, { color: colors.gold }]}>Choisir un actif</AppText>
                    </>
                  )}
                </Pressable>
              </View>

              <View style={styles.row}>
                <View style={styles.flex}>
                  <TextField
                    label={`Quantité${asset ? ` (${asset.type === 'crypto' ? asset.ticker : 'parts'})` : ''}`}
                    value={quantityText}
                    onChangeText={(t) => edit({ quantity: t })}
                    keyboardType="decimal-pad"
                    placeholder="0"
                  />
                </View>
                <View style={styles.flex}>
                  <TextField
                    label={`Prix unitaire (${currency === 'USD' ? '$' : '€'})`}
                    value={unitPriceText}
                    onChangeText={(t) => edit({ unitPrice: t })}
                    keyboardType="decimal-pad"
                    placeholder="0"
                  />
                </View>
              </View>
              {currency !== 'EUR' && parseDecimal(unitPriceText) > 0 && toEur(parseDecimal(unitPriceText), currency, rates) !== null ? (
                <AppText variant="caption" tone="subtitle">
                  {`Soit ${money(toEur(parseDecimal(unitPriceText), currency, rates)!, { hidden, exact: true })} l’unité, au taux du jour.`}
                </AppText>
              ) : null}
              {priceNow !== null && !editing ? (
                <AppText variant="caption" tone="subtitle">
                  Prérempli avec le cours actuel, modifiable.
                </AppText>
              ) : null}
              <View style={styles.row}>
                <DateField value={day} onChange={(d) => edit({ day: d })} />
                <View style={styles.flex}>
                  <TextField label="Frais (facultatif)" value={feesText} onChangeText={(t) => edit({ fees: t })} keyboardType="decimal-pad" placeholder="0" />
                </View>
              </View>

              {preview ? (
                preview.ok ? (
                  <PreviewBox preview={preview.preview} hidden={hidden} currency={currency} rates={rates} unit={asset ? (q: number) => quantityLabel(q, asset.ticker, asset.type) : (q) => String(q)} />
                ) : (
                  <View style={[styles.warning, { backgroundColor: withOpacity(colors.error, 0.1), borderColor: withOpacity(colors.error, 0.35) }]}>
                    <AppText variant="callout" style={{ color: colors.error }} accessibilityRole="alert" accessibilityLiveRegion="polite">
                      {preview.message}
                    </AppText>
                  </View>
                )
              ) : editing ? (
                <AppText variant="caption" tone="subtitle">
                  Ta position et ton prix de revient seront recalculés avec cette opération modifiée.
                </AppText>
              ) : null}
            </>
          ) : kind === 'livret' ? (
            <>
              <TextField label="Nom du livret" value={nameText} onChangeText={(t) => edit({ name: t })} placeholder="Livret A, LDDS, LEP…" />
              <View style={styles.row}>
                <View style={styles.flex}>
                  <TextField label="Montant sur le livret (€)" value={amountText} onChangeText={(t) => edit({ amount: t })} keyboardType="decimal-pad" placeholder="0" />
                </View>
                {regulated ? null : (
                  <View style={styles.flex}>
                    <TextField label="Taux par an (%)" value={rateText} onChangeText={(t) => edit({ ratePct: t })} keyboardType="decimal-pad" placeholder="Facultatif" />
                  </View>
                )}
              </View>
              {regulated ? (
                <AppText variant="caption" tone="subtitle">
                  {existing?.interestRatePct !== null && existing?.interestRatePct !== undefined
                    ? `Taux réglementé : ${String(existing.interestRatePct).replace('.', ',')}\u00a0% (${rateDateLabel(existing.interestRateEffectiveAt, existing.interestRateVerifiedAt) ?? 'taux en vigueur'}), mis à jour automatiquement.`
                    : 'Taux réglementé : le taux en vigueur est appliqué automatiquement.'}
                </AppText>
              ) : null}
              <AppText variant="caption" tone="subtitle">
                Le montant total aujourd’hui. Un versement compte pour ta régularité.
              </AppText>
              <IconPicker value={iconChoice} onChange={(icon) => edit({ icon })} name={nameText} ticker={existing?.ticker ?? params.ticker ?? ''} type="livret" />
            </>
          ) : (
            <>
              {!existing ? <Segmented fill options={MANUAL_KINDS} value={manualKind} onChange={(k) => edit({ manualKind: k })} /> : null}
              <TextField label="Nom" value={nameText} onChangeText={(t) => edit({ name: t })} placeholder={manualKind === 'immobilier' ? 'Appartement, part de SCPI…' : 'Montre, œuvre, voiture…'} />
              <View style={styles.row}>
                <View style={styles.flex}>
                  <TextField label="Valeur estimée (€)" value={valueText} onChangeText={(t) => edit({ value: t })} keyboardType="decimal-pad" placeholder="0" />
                </View>
                {!existing ? (
                  <View style={styles.flex}>
                    <TextField label="Payé (facultatif)" value={paidText} onChangeText={(t) => edit({ paid: t })} keyboardType="decimal-pad" placeholder="= la valeur" />
                  </View>
                ) : null}
              </View>
              <AppText variant="caption" tone="subtitle">
                Sa valeur n’a pas de cours : tu la mets à jour à la main, quand tu veux.
              </AppText>
              <IconPicker
                value={iconChoice}
                onChange={(icon) => edit({ icon })}
                name={nameText}
                ticker={existing?.ticker ?? `CUSTOM_${manualKind.toUpperCase()}`}
                type="autre"
              />
            </>
          )}

          {error ? (
            <AppText variant="callout" tone="error" accessibilityRole="alert" accessibilityLiveRegion="polite">
              {error}
            </AppText>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + space[3] }]}>
          <Button label={submitLabel} onPress={save} loading={busy} disabled={!!blocked || busy || (kind === 'market' && !asset)} disabledReason={preview && !preview.ok ? undefined : kind === 'market' && quantityText.trim() === '' ? undefined : blocked ?? undefined} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function PreviewBox({
  preview,
  hidden,
  currency,
  rates,
  unit,
}: {
  preview: ReturnType<typeof previewOperation> extends infer R ? (R extends { ok: true; preview: infer P } ? P : never) : never;
  hidden: boolean;
  currency: string;
  rates: Rates;
  unit: (q: number) => string;
}) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  // Euros, avec le montant d'origine s'il est dans une autre devise
  const m = (v: number, exact = false) => moneyEur(v, currency, rates, { hidden, exact });
  const line = (label: string, before: string | null, after: string, tone?: string) => (
    <View style={styles.previewLine} accessible accessibilityLabel={`${label} : ${before ? `${before} puis ` : ''}${after}`}>
      <AppText variant="callout" tone="subtitle">
        {label}
      </AppText>
      <AppText variant="callout">
        {before ? <AppText variant="callout" tone="subtitle">{`${before} → `}</AppText> : null}
        <AppText variant="callout" style={[styles.previewValue, tone ? { color: tone } : null]}>
          {after}
        </AppText>
      </AppText>
    </View>
  );
  return (
    <View style={[styles.preview, { backgroundColor: withOpacity(colors.gold, 0.07), borderColor: withOpacity(colors.gold, 0.3) }]}>
      <AppText style={[styles.previewTitle, { color: colors.gold }]} accessibilityRole="header">
        {preview.side === 'buy' ? 'APRÈS CET ACHAT' : 'APRÈS CETTE VENTE'}
      </AppText>
      {preview.side === 'buy' ? (
        <>
          {line('Ta position', preview.quantityBefore > 0 ? unit(preview.quantityBefore) : null, unit(preview.quantityAfter))}
          {line('Prix de revient moyen', preview.quantityBefore > 0 ? m(preview.avgCostBefore, true) : null, m(preview.avgCostAfter, true))}
          {line('Total investi', preview.quantityBefore > 0 ? m(preview.investedBefore) : null, m(preview.investedAfter))}
        </>
      ) : (
        <>
          {line('Position restante', unit(preview.quantityBefore), preview.closes ? 'soldée' : unit(preview.quantityAfter))}
          {line(
            'Plus-value réalisée',
            null,
            toEur(preview.realizedGain, currency, rates) !== null ? signedMoney(toEur(preview.realizedGain, currency, rates)!, { hidden }) : signedMoney(preview.realizedGain, { hidden, currency }),
            preview.realizedGain >= 0 ? colors.success : colors.error
          )}
          <AppText variant="caption" tone="subtitle">
            Indicatif : l’impôt se calcule autrement.
          </AppText>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[3], minHeight: 52 },
  barTitle: { fontFamily: fonts.bodyBold, fontSize: 17 },
  spacer: { width: 44 },
  content: { paddingHorizontal: space[5], paddingTop: space[3], paddingBottom: space[6], gap: space[3] },
  field: { gap: 6 },
  assetField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 54,
    paddingHorizontal: 14,
    borderRadius: radius.option,
    borderCurve: 'continuous',
    borderWidth: 1.5,
  },
  assetName: { flex: 1, fontFamily: fonts.bodySemibold, fontSize: 16 },
  assetTicker: { fontFamily: fonts.bodyMedium, fontSize: 15 },
  change: { fontFamily: fonts.bodyBold, fontSize: 13 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  warning: { padding: 14, borderRadius: radius.card, borderWidth: 1 },
  preview: { padding: 14, paddingHorizontal: 16, borderRadius: radius.card, borderWidth: 1, gap: 6 },
  previewTitle: { fontFamily: fonts.bodyExtraBold, fontSize: 11, letterSpacing: 1.2 },
  previewLine: { flexDirection: 'row', justifyContent: 'space-between', gap: space[2] },
  previewValue: { fontFamily: fonts.bodyBold },
  footer: { paddingHorizontal: space[5], paddingTop: space[2] },
});

