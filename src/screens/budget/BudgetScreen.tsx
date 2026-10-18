import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AmountSheet from '@/src/components/budget/AmountSheet';
import BalanceCurve from '@/src/components/budget/BalanceCurve';
import ChargeList from '@/src/components/budget/ChargeList';
import EntryList from '@/src/components/budget/EntryList';
import EntrySheet, { type EntryDraft } from '@/src/components/budget/EntrySheet';
import EnvelopeList from '@/src/components/budget/EnvelopeList';
import EnvelopeSheet from '@/src/components/budget/EnvelopeSheet';
import SpendableCard from '@/src/components/budget/SpendableCard';
import SplitBar from '@/src/components/budget/SplitBar';
import AppText from '@/src/components/common/AppText';
import BackButton from '@/src/components/common/BackButton';
import BottomSheet from '@/src/components/common/BottomSheet';
import Button from '@/src/components/common/Button';
import PageState from '@/src/components/common/PageState';
import HelpTerm from '@/src/components/patrimoine/HelpTerm';
import Segmented from '@/src/components/patrimoine/Segmented';
import ValRemark from '@/src/components/patrimoine/ValRemark';
import { fonts, palette, radius, space, titleLetterSpacing, withOpacity } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { loadBudget } from '@/src/state/budgetData';
import { updateBudgetPrefs, useBudgetPrefs } from '@/src/state/budgetPrefs';
import { cycleCharges, monthly, pruneSavingsDone, savingLine, spendable, split, splitPercents } from '@/src/utils/budget/calc';
import { categoryLabel, COMMON_CATEGORIES, pillChoices } from '@/src/utils/budget/categories';
import { localToday, monthKey, monthName } from '@/src/utils/budget/dates';
import { parseKey, shiftKey } from '@/src/utils/budget/flows';
import { envelopeNotice, envelopeOverTwice, envelopes } from '@/src/utils/budget/envelopes';
import type { Budget, BudgetMode, Entry } from '@/src/utils/budget/model';
import { monthCurve } from '@/src/utils/budget/projection';
import { currentGreenRun, greenRunLabel } from '@/src/utils/budget/milestones';
import { greenMonths, monthReview, reviewToPropose } from '@/src/utils/budget/review';
import { chooseBudgetTip } from '@/src/utils/budget/tips';
import { feedback } from '@/src/utils/feedback';
import { tap } from '@/src/utils/haptics';
import { staleDataText, type LoadError } from '@/src/utils/loadError';

type Props = { budget: Budget; userKey: string; stale: boolean; staleKind: LoadError };

const MODES = [
  { key: 'essentiel', label: 'Essentiel' },
  { key: 'detaille', label: 'Détaillé' },
] as const;

const RECENT = 5;
const NOTICE_MS = 5000;

// Bilans déjà ouverts d'office pendant cette session (le bilan se marque vu
// en s'ouvrant ; ceci évite de l'ouvrir deux fois entre-temps)
const proposed = new Set<string>();

// Mon budget (maquette, écrans 1, 4 et 5). Tout est manuel, donc rien ne
// doit être une corvée : un seul chiffre à tenir à jour, le solde du compte ;
// en mode Détaillé, les dépenses en trois touchers. Aucune série, aucune
// pénalité pour un oubli : un vieux solde est seulement « à confirmer ».
export default function BudgetScreen({ budget, userKey, stale, staleKind }: Props) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const insets = useSafeAreaInsets();
  const { get, post, patch, del } = useApi();
  const prefs = useBudgetPrefs(userKey);
  const today = localToday();
  const month = monthKey(today);
  const [refreshing, setRefreshing] = useState(false);
  // Mode choisi : affiché tout de suite, enregistré sur le serveur
  const [modeShown, setModeShown] = useState<BudgetMode | null>(null);
  const mode = modeShown ?? budget.settings.mode;
  const detailed = mode === 'detaille';

  const [balanceSheet, setBalanceSheet] = useState<{ open: boolean } | null>(null);
  const [entrySheet, setEntrySheet] = useState<{ open: boolean; editing: Entry | null } | null>(null);
  const [envelopeSheet, setEnvelopeSheet] = useState<{ open: boolean; category: string | null } | null>(null);
  const [allEntries, setAllEntries] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(id);
  }, [notice]);

  const mark = prefs?.mark ?? null;
  const savingsDone = prefs?.savingsDone ?? {};
  const s = spendable({ recurring: budget.recurring, balances: budget.balances, today, entries: detailed ? budget.entries : [], mark, savingsDone });
  const saving = s ? savingLine(budget.recurring, s, today, savingsDone) : null;
  // « Déjà mise de côté ? » : confirmation de l'épargne du mois
  const [savingSheet, setSavingSheet] = useState<{ open: boolean } | null>(null);
  const confirmSaving = async () => {
    if (saving?.kind !== 'planned') return;
    const keys = saving.keys;
    await updateBudgetPrefs(userKey, (p) => ({ ...p, savingsDone: { ...pruneSavingsDone(p.savingsDone, today), ...Object.fromEntries(keys.map((k) => [k, today])) } }));
    feedback.drop();
    setSavingSheet({ open: false });
  };
  const charges = cycleCharges(budget.recurring, today);
  const monthEntries = budget.entries.filter((e) => e.on.startsWith(month) && e.on <= today);
  const sp = split({ recurring: budget.recurring, categories: budget.categories, entries: detailed ? monthEntries : [] });
  const alertPct = budget.settings.envelopeAlertPct;
  const env = envelopes(budget.categories, budget.entries, month, alertPct);
  const curve = detailed ? monthCurve({ recurring: budget.recurring, balances: budget.balances, entries: budget.entries, today }) : null;
  const recent = [...budget.entries].filter((e) => e.on <= today).sort((a, b) => (a.on < b.on ? 1 : a.on > b.on ? -1 : b.id - a.id));
  const tip = chooseBudgetTip({
    income: monthly(budget.recurring, 'revenu'),
    subscriptions: budget.recurring.filter((r) => r.type === 'depense' && r.category === 'Abonnements').reduce((t, r) => t + r.amount, 0),
    saving: monthly(budget.recurring, 'epargne'),
    greenMonths: greenMonths(budget, today, mode).map((g) => g.green),
    envelopeOverTwice: detailed ? envelopeOverTwice(budget.categories, budget.entries, [shiftKey(month, -2), shiftKey(month, -1)]) : null,
  });
  // Mois dans le vert d'affilée (calculés aussi en mode Essentiel, avec les soldes)
  const greenRun = greenRunLabel(currentGreenRun({ ...budget, settings: { ...budget.settings, mode } }, today));

  // Bilan du mois dernier : proposé une fois, à la première ouverture du mois
  const lastMonth = shiftKey(month, -1);
  const lastReview = monthReview(budget, lastMonth, today, mode);
  const toPropose = prefs ? reviewToPropose(budget, today, mode, prefs.reviewsShown) : null;
  useEffect(() => {
    if (!toPropose || proposed.has(`${userKey}:${toPropose}`)) return;
    proposed.add(`${userKey}:${toPropose}`);
    router.push({ pathname: '/outils/budget/bilan', params: { mois: toPropose } });
  }, [toPropose, userKey]);

  const reload = () => loadBudget(userKey, get, true);
  const refresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const changeMode = async (m: BudgetMode) => {
    setModeShown(m);
    try {
      await patch('/budget/settings', { mode: m });
      await reload();
    } catch {
      // le serveur n'a pas suivi : le mode reste choisi pour cette fois
    }
  };

  const saveBalance = async (amount: number) => {
    try {
      await post('/budget/balances', { amount });
      // Repère : les dépenses du jour notées avant ce relevé y sont déjà
      const maxEntryId = budget.entries.reduce((m, e) => Math.max(m, e.id), 0);
      await updateBudgetPrefs(userKey, (p) => ({ ...p, mark: { on: today, maxEntryId } }));
      await reload();
      feedback.drop();
      setBalanceSheet((x) => (x ? { open: false } : x));
      return true;
    } catch {
      feedback.wrong(0.6);
      return false;
    }
  };

  const saveEntry = async (d: EntryDraft) => {
    const editing = entrySheet?.editing ?? null;
    const label = d.type === 'revenu' ? (editing?.type === 'revenu' ? editing.label : 'Rentrée') : categoryLabel(d.category);
    try {
      if (editing) {
        await patch(`/cashflow/entries/${editing.id}`, { type: d.type, amount: d.amount, category: d.category, occurred_on: d.on, label });
      } else if (d.recurring) {
        await post('/cashflow/entries', { type: d.type, nature: 'recurrent', label, category: d.category, amount: d.amount, day_of_month: Number(today.slice(8)) });
      } else {
        await post('/cashflow/entries', { type: d.type, nature: 'ponctuel', label, category: d.category, amount: d.amount, occurred_on: d.on });
      }
      await reload();
      feedback.drop();
      setEntrySheet((x) => (x ? { ...x, open: false } : x));
      // Alerte douce : une enveloppe qui vient de passer son seuil
      if (!d.recurring && d.type === 'depense') {
        const after = envelopes(
          budget.categories,
          [...budget.entries.filter((e) => e.id !== editing?.id), { id: -1, type: 'depense', category: d.category, label, amount: d.amount, on: d.on }],
          month,
          alertPct
        );
        const text = envelopeNotice(env, after);
        if (text) setNotice(text);
      }
      return true;
    } catch {
      feedback.wrong(0.6);
      return false;
    }
  };

  const deleteEntry = async () => {
    const editing = entrySheet?.editing;
    if (!editing) return true;
    try {
      await del(`/cashflow/entries/${editing.id}`);
      await reload();
      feedback.drop();
      setEntrySheet((x) => (x ? { ...x, open: false } : x));
      return true;
    } catch {
      feedback.wrong(0.6);
      return false;
    }
  };

  const saveEnvelope = async (category: string, cap: number) => {
    try {
      const existing = budget.categories.find((c) => c.name === category);
      if (existing) await patch(`/cashflow/categories/${existing.id}`, { envelope_cap: cap });
      else await post('/cashflow/categories', { name: category, envelope_cap: cap });
      await reload();
      feedback.drop();
      setEnvelopeSheet((x) => (x ? { ...x, open: false } : x));
      return true;
    } catch {
      feedback.wrong(0.6);
      return false;
    }
  };

  const removeEnvelope = async () => {
    const existing = budget.categories.find((c) => c.name === envelopeSheet?.category);
    if (!existing) return true;
    try {
      await patch(`/cashflow/categories/${existing.id}`, { envelope_cap: null });
      await reload();
      setEnvelopeSheet((x) => (x ? { ...x, open: false } : x));
      return true;
    } catch {
      feedback.wrong(0.6);
      return false;
    }
  };

  const changeAlert = async (pct: number) => {
    try {
      await patch('/budget/settings', { envelope_alert_pct: pct });
      await reload();
    } catch {
      feedback.wrong(0.6);
    }
  };

  const withCap = new Set(env.map((e) => e.category));
  const freeForEnvelope = [
    ...COMMON_CATEGORIES.filter((c) => !withCap.has(c)),
    ...budget.categories.map((c) => c.name).filter((n) => !withCap.has(n) && !(COMMON_CATEGORIES as readonly string[]).includes(n)),
  ];
  const openedEnvelope = envelopeSheet?.category ? env.find((e) => e.category === envelopeSheet.category) : null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <BackButton onBack={() => router.back()} />
        {detailed ? (
          <Pressable
            onPress={() => {
              tap();
              setEntrySheet({ open: true, editing: null });
            }}
            accessibilityRole="button"
            accessibilityLabel="Ajouter une dépense ou une rentrée"
            style={({ pressed }) => [styles.plus, { backgroundColor: colors.gold, shadowColor: colors.goldDeep }, pressed && { transform: [{ translateY: 2 }] }]}
          >
            <Ionicons name="add" size={24} color={colors.onGold} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space[8] }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.gold} colors={[colors.gold]} progressBackgroundColor={colors.surface} />}
      >
        <View style={styles.inline}>
          <AppText accessibilityRole="header" style={styles.title}>
            Mon budget
          </AppText>
          <HelpTerm term="Budget" />
        </View>
        <Segmented fill options={MODES} value={mode} onChange={changeMode} />
        {greenRun ? (
          <View style={[styles.green, { backgroundColor: withOpacity(colors.success, 0.15) }]} accessible accessibilityLabel={greenRun}>
            <Ionicons name="leaf-outline" size={13} color={colors.success} />
            <AppText style={[styles.greenText, { color: colors.success }]}>{greenRun}</AppText>
          </View>
        ) : null}
        {stale ? <PageState variant="offline" text={staleDataText(staleKind, 'Tes derniers chiffres connus')} /> : null}

        {s ? (
          <SpendableCard
            s={s}
            today={today}
            saving={saving ?? { kind: 'none' }}
            onUpdate={() => setBalanceSheet({ open: true })}
            onConfirmSaving={() => setSavingSheet({ open: true })}
          />
        ) : (
          <View style={styles.noBalance}>
            <AppText variant="callout" tone="subtitle">
              Il manque juste ton solde pour savoir ce que tu peux encore dépenser.
            </AppText>
            <Button label="Indiquer mon solde" onPress={() => setBalanceSheet({ open: true })} />
          </View>
        )}

        {detailed && curve ? (
          <View style={styles.section}>
            <AppText variant="sectionLabel" accessibilityRole="header">
              TON SOLDE CE MOIS-CI
            </AppText>
            <BalanceCurve points={curve.points} end={curve.end} />
            <AppText variant="caption" tone="subtitle">
              En pointillés : ce qui t’attend, avec tes charges fixes et ton rythme de dépenses.
            </AppText>
          </View>
        ) : null}

        {detailed ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={styles.inline}>
                <AppText variant="sectionLabel" accessibilityRole="header">
                  TES ENVELOPPES
                </AppText>
                <HelpTerm term="Enveloppe" />
              </View>
              <Pressable
                onPress={() => {
                  tap();
                  setEnvelopeSheet({ open: true, category: null });
                }}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Ajouter une enveloppe"
              >
                <AppText style={[styles.link, { color: colors.gold }]}>Ajouter</AppText>
              </Pressable>
            </View>
            {env.length > 0 ? (
              <EnvelopeList list={env} onOpen={(category) => setEnvelopeSheet({ open: true, category })} />
            ) : (
              <AppText variant="callout" tone="subtitle">
                Une enveloppe, c’est un plafond par mois pour une catégorie (courses, sorties…). Elle repart de zéro chaque mois.
              </AppText>
            )}
          </View>
        ) : null}

        {detailed ? (
          <View style={styles.section}>
            <AppText variant="sectionLabel" accessibilityRole="header">
              DERNIÈRES OPÉRATIONS
            </AppText>
            {recent.length > 0 ? (
              <>
                <EntryList
                  entries={allEntries ? recent.filter((e) => e.on.startsWith(month)) : recent.slice(0, RECENT)}
                  categories={budget.categories}
                  today={today}
                  onOpen={(e) => setEntrySheet({ open: true, editing: e })}
                />
                {recent.length > RECENT ? (
                  <Button variant="text" label={allEntries ? 'Voir moins' : 'Voir tout le mois'} onPress={() => setAllEntries((v) => !v)} />
                ) : null}
              </>
            ) : (
              <AppText variant="callout" tone="subtitle">
                Touche + pour noter une dépense : le montant, la catégorie, et c’est tout.
              </AppText>
            )}
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <AppText variant="sectionLabel" accessibilityRole="header">
              CE QUI VA ENCORE PARTIR
            </AppText>
            <Pressable
              onPress={() => {
                tap();
                router.push({ pathname: '/outils/budget/mise-en-route', params: { modifier: '1' } });
              }}
              hitSlop={12}
              accessibilityRole="link"
              accessibilityLabel="Modifier mes rentrées et mes charges fixes"
            >
              <AppText style={[styles.link, { color: colors.gold }]}>Modifier</AppText>
            </Pressable>
          </View>
          {charges.length > 0 ? (
            <ChargeList charges={charges} />
          ) : (
            <AppText variant="callout" tone="subtitle">
              Aucune charge fixe pour l’instant.
            </AppText>
          )}
          <View style={styles.inline}>
            <AppText variant="caption" tone="subtitle" style={styles.flex}>
              Tes charges fixes reviennent toutes seules chaque mois.
            </AppText>
            <HelpTerm term="Charges fixes" />
          </View>
        </View>

        {sp ? (
          <View style={styles.section}>
            <View style={styles.inline}>
              <AppText variant="sectionLabel" accessibilityRole="header">
                TA RÉPARTITION
              </AppText>
              <HelpTerm term="Règle 50/30/20" />
            </View>
            <SplitBar p={splitPercents(sp)} />
          </View>
        ) : null}

        <View style={styles.section}>
          <Button
            variant="secondary"
            label="Analyser mon cash-flow"
            onPress={() => router.push('/outils/budget/cashflow')}
          />
          {lastReview ? (
            <Button
              variant="text"
              label={`Ton bilan de ${monthName(parseKey(lastMonth).month)}`}
              onPress={() => router.push({ pathname: '/outils/budget/bilan', params: { mois: lastMonth } })}
            />
          ) : null}
        </View>

        {tip ? (
          <View style={styles.section}>
            <ValRemark tip={tip} />
          </View>
        ) : null}
      </ScrollView>

      {notice ? (
        <Animated.View
          entering={FadeIn.duration(250)}
          exiting={FadeOut.duration(250)}
          style={[styles.notice, { bottom: insets.bottom + space[4], backgroundColor: colors.surfaceAlt, borderColor: colors.goldLine }]}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          <AppText variant="callout">{notice}</AppText>
        </Animated.View>
      ) : null}

      {savingSheet ? (
        <BottomSheet open={savingSheet.open} onRequestClose={() => setSavingSheet({ open: false })} onClosed={() => setSavingSheet(null)}>
          <View style={styles.sheet}>
            <AppText variant="title3" accessibilityRole="header" style={styles.center}>
              Tu l’as déjà mise de côté ?
            </AppText>
            <AppText variant="callout" tone="subtitle" style={styles.center}>
              Si ton virement d’épargne de ce mois est déjà fait, dis-le : il ne sera plus annoncé comme à venir.
            </AppText>
            <Button label="Oui, c’est fait" onPress={confirmSaving} />
            <Button variant="text" label="Pas encore" onPress={() => setSavingSheet({ open: false })} />
          </View>
        </BottomSheet>
      ) : null}
      {balanceSheet ? (
        <AmountSheet
          open={balanceSheet.open}
          onRequestClose={() => setBalanceSheet({ open: false })}
          onClosed={() => setBalanceSheet(null)}
          title="Combien as-tu sur ton compte courant ?"
          subtitle="Regarde ton appli bancaire, et tape le solde. C’est tout."
          initial={null}
          allowNegative
          confirmLabel="Mettre à jour"
          onConfirm={saveBalance}
          errorText="Ton solde n’a pas pu être enregistré. Réessaie dans un instant."
        />
      ) : null}
      {entrySheet ? (
        <EntrySheet
          open={entrySheet.open}
          onRequestClose={() => setEntrySheet({ ...entrySheet, open: false })}
          onClosed={() => setEntrySheet(null)}
          today={today}
          choices={pillChoices(budget.categories)}
          remaining={s?.amount ?? null}
          editing={entrySheet.editing}
          onSave={saveEntry}
          onDelete={entrySheet.editing ? deleteEntry : undefined}
        />
      ) : null}
      {envelopeSheet ? (
        <EnvelopeSheet
          open={envelopeSheet.open}
          onRequestClose={() => setEnvelopeSheet({ ...envelopeSheet, open: false })}
          onClosed={() => setEnvelopeSheet(null)}
          category={envelopeSheet.category}
          cap={openedEnvelope?.cap ?? null}
          free={freeForEnvelope}
          alertPct={alertPct}
          onSave={saveEnvelope}
          onRemove={envelopeSheet.category ? removeEnvelope : undefined}
          onAlert={changeAlert}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], minHeight: 52 },
  plus: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 },
  content: { paddingHorizontal: space[5], gap: space[3] },
  title: { fontFamily: fonts.title, fontSize: 26, lineHeight: 32, letterSpacing: titleLetterSpacing(26) },
  noBalance: { gap: space[3] },
  section: { marginTop: space[4], gap: space[2] },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  link: { fontFamily: fonts.bodySemibold, fontSize: 14 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  green: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 28, paddingHorizontal: 10, borderRadius: radius.pill },
  greenText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  sheet: { gap: space[3], paddingTop: space[2] },
  center: { textAlign: 'center', alignSelf: 'center' },
  notice: { position: 'absolute', left: space[5], right: space[5], padding: space[4], borderRadius: radius.card, borderWidth: 1 },
});
