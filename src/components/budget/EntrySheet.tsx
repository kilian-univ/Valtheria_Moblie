import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, useWindowDimensions, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import BigNumber from '@/src/components/common/BigNumber';
import BottomSheet from '@/src/components/common/BottomSheet';
import Button from '@/src/components/common/Button';
import Segmented from '@/src/components/patrimoine/Segmented';
import { fonts, palette, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { categoryIcon, categoryLabel } from '@/src/utils/budget/categories';
import { addDays, shortDay, type Day } from '@/src/utils/budget/dates';
import { euros } from '@/src/utils/budget/format';
import { padDisplay, padText, padValue, pressKey } from '@/src/utils/budget/keypad';
import type { Entry } from '@/src/utils/budget/model';
import { select } from '@/src/utils/haptics';
import Keypad from './Keypad';

export type EntryDraft = { type: 'depense' | 'revenu'; amount: number; category: string | null; recurring: boolean; on: Day };

type Props = {
  open: boolean;
  onRequestClose: () => void;
  onClosed: () => void;
  today: Day;
  // Catégories en pastilles (enveloppes d'abord)
  choices: string[];
  // « Tu peux encore dépenser » avant cette opération (null : pas de solde)
  remaining: number | null;
  // Modifier une opération existante (sinon : ajouter)
  editing?: Entry | null;
  onSave: (draft: EntryDraft) => Promise<boolean>;
  onDelete?: () => Promise<boolean>;
};

// Ajouter une dépense en trois touchers (maquette, écran 5) : le montant au
// pavé, la catégorie en grosses pastilles, « Ajouter ». Dépense ou rentrée ;
// « Revient chaque mois » en fait une charge fixe. Sert aussi à modifier ou
// supprimer une opération.
export default function EntrySheet({ open, onRequestClose, onClosed, today, choices, remaining, editing, onSave, onDelete }: Props) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { height } = useWindowDimensions();
  const [type, setType] = useState<'depense' | 'revenu'>(editing?.type === 'revenu' ? 'revenu' : 'depense');
  const [text, setText] = useState(() => padText(editing?.amount ?? null));
  const [category, setCategory] = useState<string | null>(editing?.category ?? choices[0] ?? 'Autres');
  const [recurring, setRecurring] = useState(false);
  const [on, setOn] = useState<Day>(editing?.on ?? today);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const value = padValue(text);
  const amount = value ?? 0;
  const after = remaining === null ? null : remaining + (type === 'revenu' ? amount : -amount);
  const dates = Array.from(new Set([today, addDays(today, -1), addDays(today, -2), ...(editing ? [editing.on] : [])])).sort().reverse();

  const save = async () => {
    if (value === null || value <= 0) return;
    setBusy(true);
    const ok = await onSave({ type, amount: value, category: type === 'depense' ? category : null, recurring, on });
    setBusy(false);
    setFailed(!ok);
  };
  const remove = async () => {
    if (!onDelete) return;
    setBusy(true);
    const ok = await onDelete();
    setBusy(false);
    setFailed(!ok);
  };

  const label = editing
    ? 'Enregistrer'
    : value && value > 0
      ? `Ajouter · ${euros(value)}${type === 'depense' && category ? ` en ${categoryLabel(category).toLowerCase()}` : ''}`
      : 'Ajouter';

  return (
    <BottomSheet open={open} onRequestClose={onRequestClose} onClosed={onClosed}>
      <ScrollView style={{ maxHeight: height * 0.82 }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Segmented
          fill
          options={[
            { key: 'depense', label: 'Dépense' },
            { key: 'revenu', label: 'Rentrée d’argent' },
          ]}
          value={type}
          onChange={setType}
        />
        <View accessible accessibilityLabel={`Montant tapé : ${padDisplay(text)}`} accessibilityLiveRegion="polite">
          <BigNumber text={padDisplay(text)} size={56} tone="text" style={styles.center} />
        </View>
        {type === 'depense' ? (
          <View style={styles.pills} accessibilityRole="radiogroup" accessibilityLabel="Catégorie">
            {choices.map((c) => {
              const sel = c === category;
              return (
                <Pressable
                  key={c}
                  onPress={() => {
                    select();
                    setCategory(c);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: sel }}
                  aria-checked={sel}
                  accessibilityLabel={categoryLabel(c)}
                  style={[styles.pill, sel ? { backgroundColor: colors.gold, borderColor: colors.gold } : { borderColor: colors.controlBorder }]}
                >
                  <Ionicons name={categoryIcon(c) as never} size={18} color={sel ? colors.onGold : colors.text} />
                  <AppText maxFontSizeMultiplier={1.4} style={[styles.pillText, { color: sel ? colors.onGold : colors.text }]}>{categoryLabel(c)}</AppText>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {editing ? (
          <View style={styles.pills} accessibilityRole="radiogroup" accessibilityLabel="Date">
            {dates.map((d) => {
              const sel = d === on;
              const name = d === today ? 'Aujourd’hui' : d === addDays(today, -1) ? 'Hier' : shortDay(d);
              return (
                <Pressable
                  key={d}
                  onPress={() => {
                    select();
                    setOn(d);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: sel }}
                  aria-checked={sel}
                  accessibilityLabel={name}
                  style={[styles.pill, sel ? { backgroundColor: colors.surfaceAlt, borderColor: colors.gold } : { borderColor: colors.controlBorder }]}
                >
                  <AppText maxFontSizeMultiplier={1.4} style={[styles.pillText, { color: colors.text }]}>{name}</AppText>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.recurring}>
            <AppText variant="body" style={styles.flex}>
              Revient chaque mois
            </AppText>
            <Switch
              value={recurring}
              onValueChange={(v) => {
                select();
                setRecurring(v);
              }}
              trackColor={{ true: colors.gold, false: colors.track }}
              thumbColor={colors.ivory}
              {...{ activeThumbColor: colors.ivory }}
              accessibilityLabel={type === 'depense' ? 'Revient chaque mois : en faire une charge fixe' : 'Revient chaque mois : une rentrée récurrente'}
            />
          </View>
        )}
        <Keypad onKey={(k) => setText((t) => pressKey(t, k === '-' ? 'del' : k))} />
        {failed ? (
          <AppText variant="callout" tone="error" accessibilityRole="alert" style={styles.center}>
            Ça n’a pas pu être enregistré. Réessaie dans un instant.
          </AppText>
        ) : null}
        <Button label={label} onPress={save} disabled={value === null || value <= 0} loading={busy} />
        {after !== null && value ? (
          <AppText variant="caption" tone="subtitle" style={styles.center}>
            {recurring ? `Elle reviendra chaque mois, le ${Number(today.slice(8))}.` : `Il te restera ${euros(after)} ce mois-ci.`}
          </AppText>
        ) : null}
        {editing && onDelete ? <Button label={editing.type === 'revenu' ? 'Supprimer cette rentrée' : 'Supprimer cette dépense'} variant="textDanger" onPress={remove} /> : null}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[3], paddingTop: space[2], paddingBottom: space[2] },
  flex: { flex: 1 },
  center: { textAlign: 'center', alignSelf: 'center' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], justifyContent: 'center' },
  pill: { minHeight: 44, paddingVertical: space[1], paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: space[2] },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 15 },
  recurring: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[1] },
});
