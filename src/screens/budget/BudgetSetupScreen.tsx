import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AmountSheet from '@/src/components/budget/AmountSheet';
import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import IconButton from '@/src/components/common/IconButton';
import ValBubble from '@/src/components/common/ValBubble';
import { fonts, palette, radius, space, titleLetterSpacing, withOpacity } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { setBudget } from '@/src/state/budgetData';
import { enableBudgetReminder } from '@/src/state/budgetReminder';
import type { Budget, BudgetMode } from '@/src/utils/budget/model';
import { chargesTotal, draftFrom, setupPayload, stepReady, suggestedSaving, type SetupDraft } from '@/src/utils/budget/setup';
import { feedback } from '@/src/utils/feedback';
import { NBSP } from '@/src/utils/frenchSpaces';
import { select, tap } from '@/src/utils/haptics';
import { longDay } from '@/src/utils/budget/dates';
import { euros } from '@/src/utils/budget/format';

type Step = 0 | 1 | 2 | 3;

const STEPS: { kicker: string; question: string }[] = [
  { kicker: 'Tes rentrées', question: 'Combien te rentre-t-il chaque mois ?' },
  { kicker: 'Tes charges fixes', question: 'Qu’est-ce qui part chaque mois, quoi qu’il arrive ?' },
  { kicker: 'Mettre de côté en premier', question: 'Combien mets-tu de côté dès que ta paie tombe ?' },
  { kicker: 'Ton solde', question: 'Combien as-tu sur ton compte courant aujourd’hui ?' },
];
// Modifier : le dernier relevé est gardé, la dernière étape ne garde que le mode
const LAST_EDIT = { kicker: 'Ton mode', question: 'Quel mode te va le mieux ?' };

const VAL_LINE = 'Pas besoin d’être précis au centime. Un ordre de grandeur suffit pour commencer.';

type Sheet = { kind: 'income' } | { kind: 'charge'; key: string } | { kind: 'saving' } | { kind: 'balance' };

// Mise en route du budget (maquette, écran 6) : 4 questions, une seule fois,
// puis le mode. Les valeurs de départ : le budget en place (« Modifier »),
// sinon l'ancien Cash-flow repris, sinon rien.
export default function BudgetSetupScreen({ budget, userKey, editing }: { budget: Budget; userKey: string; editing: boolean }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const insets = useSafeAreaInsets();
  const { post } = useApi();
  const [draft, setDraft] = useState<SetupDraft>(() => draftFrom(budget));
  const [step, setStep] = useState<Step>(0);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetDay, setSheetDay] = useState<number | null>(null);
  const [remind, setRemind] = useState(!editing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (change: Partial<SetupDraft>) => setDraft((d) => ({ ...d, ...change }));
  const last = budget.balances.length ? budget.balances[budget.balances.length - 1] : null;
  // Modifier un budget en route : le dernier relevé est gardé, jamais redemandé
  const keepBalance = editing && last !== null;
  const ready = stepReady(draft, step, keepBalance);
  const stepCopy = keepBalance && step === 3 ? LAST_EDIT : STEPS[step];

  const openSheet = (s: Sheet) => {
    tap();
    if (s.kind === 'income') setSheetDay(draft.payDay);
    if (s.kind === 'charge') setSheetDay(draft.charges.find((c) => c.key === s.key)?.day ?? null);
    setSheet(s);
    setSheetOpen(true);
  };

  const back = () => {
    tap();
    if (step === 0) router.back();
    else setStep((s) => (s - 1) as Step);
  };

  const next = async () => {
    if (step < 3) {
      // Arrivée sur l'épargne : 10 % des rentrées proposés
      if (step === 1 && !draft.savingTouched) update({ saving: suggestedSaving(draft.income) ?? 0 });
      setStep((s) => (s + 1) as Step);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const raw = await post('/budget/setup', setupPayload(draft, keepBalance));
      setBudget(userKey, raw);
      if (remind) await enableBudgetReminder(1, 18);
      feedback.right(0.6);
      if (editing) router.back();
      else router.replace('/outils/budget');
    } catch {
      feedback.wrong(0.6);
      setError('Ton budget n’a pas pu être enregistré. Réessaie dans un instant.');
    }
    // (après le try/catch, pas dans un « finally » : le compilateur React
    // sauterait tout l'écran)
    setBusy(false);
  };

  const sheetCopy = () => {
    if (!sheet) return null;
    if (sheet.kind === 'income') {
      return { title: 'Tes rentrées par mois', subtitle: 'Ta paie, et ce qui revient chaque mois.', initial: draft.income, day: 'Le jour de ta paie' };
    }
    if (sheet.kind === 'charge') {
      const c = draft.charges.find((x) => x.key === sheet.key)!;
      return { title: c.label, subtitle: 'Par mois, à peu près.', initial: c.amount, day: 'Prélevé le' };
    }
    if (sheet.kind === 'saving') return { title: 'Mis de côté chaque mois', subtitle: 'Viré le jour de ta paie, avant de dépenser.', initial: draft.saving, day: null };
    return { title: 'Ton solde aujourd’hui', subtitle: 'Regarde ton appli bancaire, et tape le solde.', initial: draft.balance, day: null };
  };
  const copy = sheetCopy();

  const confirmSheet = async (value: number) => {
    if (!sheet) return true;
    if (sheet.kind === 'income') update({ income: value, payDay: sheetDay });
    if (sheet.kind === 'charge') {
      setDraft((d) => ({ ...d, charges: d.charges.map((c) => (c.key === sheet.key ? { ...c, amount: value, day: sheetDay } : c)) }));
    }
    if (sheet.kind === 'saving') update({ saving: value, savingTouched: true });
    if (sheet.kind === 'balance') update({ balance: value });
    select();
    setSheetOpen(false);
    return true;
  };

  const removeCharge = () => {
    if (sheet?.kind !== 'charge') return;
    setDraft((d) => ({ ...d, charges: d.charges.map((c) => (c.key === sheet.key ? { ...c, amount: null, day: null } : c)) }));
    setSheetOpen(false);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <IconButton icon="chevron-back" accessibilityLabel={step === 0 ? 'Retour' : 'Question précédente'} onPress={back} color={colors.gold} />
        <View style={styles.dots} accessible accessibilityLabel={`Question ${step + 1} sur 4`}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === step && styles.dotCurrent, { backgroundColor: i <= step ? colors.gold : colors.track }]}
            />
          ))}
        </View>
        <View style={styles.barSpace} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <AppText style={[styles.kicker, { color: colors.gold }]}>
          {step + 1} sur 4 · {stepCopy.kicker}
        </AppText>
        <AppText accessibilityRole="header" style={styles.title}>
          {editing && step === 0 ? 'Modifier mon budget' : stepCopy.question}
        </AppText>
        <ValBubble mood="complice" diameter={54} text={VAL_LINE} />

        {step === 0 ? (
          <View style={styles.list}>
            <Row label="Par mois" value={draft.income !== null ? euros(draft.income) : null} onPress={() => openSheet({ kind: 'income' })} />
            <Row
              label="Le jour de ta paie"
              value={draft.payDay !== null ? `le${NBSP}${draft.payDay}` : null}
              empty="+ jour"
              onPress={() => openSheet({ kind: 'income' })}
            />
          </View>
        ) : null}

        {step === 1 ? (
          <View style={styles.list}>
            {draft.charges.map((c) => (
              <Row
                key={c.key}
                label={c.label}
                value={c.amount ? `${euros(c.amount)}${c.day !== null ? ` · le${NBSP}${c.day}` : ''}` : null}
                warn={!!c.amount && c.day === null}
                onPress={() => openSheet({ kind: 'charge', key: c.key })}
              />
            ))}
            <View style={styles.total}>
              <AppText variant="body" tone="subtitle">
                Total de tes charges fixes
              </AppText>
              <AppText variant="body" style={styles.bold}>
                {euros(chargesTotal(draft.charges))} par mois
              </AppText>
            </View>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.list}>
            <Row label="Chaque mois" value={draft.saving !== null ? euros(draft.saving) : null} onPress={() => openSheet({ kind: 'saving' })} />
            <AppText variant="caption" tone="subtitle">
              {draft.income ? `On te propose 10${NBSP}% de tes rentrées, viré le jour de ta paie. Tu pourras changer à tout moment.` : 'Viré le jour de ta paie.'}
            </AppText>
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.list}>
            {keepBalance && last ? (
              <AppText variant="callout" tone="subtitle">
                {`Ton solde reste celui du ${longDay(last.on)} : ${euros(last.amount)}. Pour le changer, touche « Mettre à jour mon solde » sur Mon budget.`}
              </AppText>
            ) : (
              <>
                <Row label="Sur ton compte" value={draft.balance !== null ? euros(draft.balance) : null} onPress={() => openSheet({ kind: 'balance' })} />
                <AppText variant="sectionLabel" style={styles.modeLabel}>
                  TON MODE
                </AppText>
              </>
            )}
            <ModeOption
              mode="essentiel"
              current={draft.mode}
              title="Essentiel"
              text="Un seul chiffre à tenir à jour : ton solde. Le plus simple."
              onPress={(m) => update({ mode: m })}
            />
            <ModeOption
              mode="detaille"
              current={draft.mode}
              title="Détaillé"
              text="Tu notes aussi tes dépenses, avec des enveloppes par catégorie."
              onPress={(m) => update({ mode: m })}
            />
            {!editing ? (
              <View style={styles.remind}>
                <AppText variant="body" style={styles.flex}>
                  Me rappeler une fois par semaine de mettre à jour mon solde
                </AppText>
                <Switch
                  value={remind}
                  onValueChange={(v) => {
                    select();
                    setRemind(v);
                  }}
                  trackColor={{ true: colors.gold, false: colors.track }}
                  thumbColor={colors.ivory}
                  // Web : couleur du rond quand c'est activé
                  {...{ activeThumbColor: colors.ivory }}
                  accessibilityLabel="Rappel une fois par semaine"
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space[4] }]}>
        {error ? (
          <AppText variant="callout" tone="error" accessibilityRole="alert" style={styles.center}>
            {error}
          </AppText>
        ) : null}
        <Button
          label={step < 3 ? 'Continuer' : editing ? 'Enregistrer' : 'C’est parti'}
          onPress={next}
          disabled={!ready}
          disabledReason={!ready ? (step === 1 ? 'Choisis le jour de chaque charge' : undefined) : undefined}
          loading={busy}
        />
      </View>

      {sheet && copy ? (
        <AmountSheet
          open={sheetOpen}
          onRequestClose={() => setSheetOpen(false)}
          onClosed={() => setSheet(null)}
          title={copy.title}
          subtitle={copy.subtitle}
          initial={copy.initial}
          allowNegative={sheet.kind === 'balance'}
          confirmLabel="Valider"
          onConfirm={confirmSheet}
          day={copy.day ? { value: sheetDay, onChange: setSheetDay, label: copy.day } : undefined}
          secondary={sheet.kind === 'charge' && draft.charges.find((c) => c.key === sheet.key)?.amount ? { label: 'Retirer cette charge', onPress: removeCharge } : undefined}
        />
      ) : null}
    </View>
  );
}

// Ligne de la maquette : dorée une fois remplie, « + montant » sinon
function Row({ label, value, onPress, warn, empty = '+ montant' }: { label: string; value: string | null; onPress: () => void; warn?: boolean; empty?: string }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const filled = value !== null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} : ${value ?? 'à renseigner'}${warn ? ', jour à choisir' : ''}`}
      style={({ pressed }) => [
        styles.row,
        filled
          ? { backgroundColor: withOpacity(colors.gold, pressed ? 0.14 : 0.08), borderColor: withOpacity(colors.gold, 0.35) }
          : { backgroundColor: pressed ? colors.surface2 : colors.panel, borderColor: colors.border },
      ]}
    >
      <AppText variant="body" style={[styles.rowLabel, styles.flex]}>
        {label}
      </AppText>
      {warn ? <Ionicons name="calendar-outline" size={16} color={colors.streak} /> : null}
      <AppText variant="body" style={filled ? [styles.rowValue, { color: colors.gold }] : { color: colors.subtitle }}>
        {value ?? empty}
      </AppText>
    </Pressable>
  );
}

function ModeOption({ mode, current, title, text, onPress }: { mode: BudgetMode; current: BudgetMode; title: string; text: string; onPress: (m: BudgetMode) => void }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const on = mode === current;
  return (
    <Pressable
      onPress={() => {
        select();
        onPress(mode);
      }}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      aria-checked={on}
      accessibilityLabel={`${title} : ${text}`}
      style={[styles.mode, { backgroundColor: on ? withOpacity(colors.gold, 0.08) : colors.panel, borderColor: on ? withOpacity(colors.gold, 0.5) : colors.border }]}
    >
      <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? colors.gold : colors.subtitle} />
      <View style={styles.flex}>
        <AppText variant="body" style={styles.bold}>
          {title}
        </AppText>
        <AppText variant="caption" tone="subtitle">
          {text}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  bold: { fontFamily: fonts.bodyBold },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[2], minHeight: 52 },
  barSpace: { width: 44 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 999 },
  dotCurrent: { width: 22 },
  content: { paddingHorizontal: space[5], paddingTop: space[3], paddingBottom: space[6], gap: space[3] },
  kicker: { fontFamily: fonts.bodyExtraBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { fontFamily: fonts.title, fontSize: 28, lineHeight: 34, letterSpacing: titleLetterSpacing(28) },
  list: { gap: space[2], marginTop: space[1] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: 48,
    paddingVertical: space[3],
    paddingHorizontal: 14,
    borderRadius: radius.option,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  rowLabel: { fontFamily: fonts.bodySemibold },
  rowValue: { fontFamily: fonts.bodyExtraBold },
  total: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space[2], gap: space[2] },
  modeLabel: { marginTop: space[4] },
  mode: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: 14, borderRadius: radius.option, borderCurve: 'continuous', borderWidth: 1 },
  remind: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginTop: space[3] },
  footer: { paddingHorizontal: space[5], paddingTop: space[2], gap: space[2] },
});
