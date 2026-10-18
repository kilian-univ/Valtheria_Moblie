import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import BigNumber from '@/src/components/common/BigNumber';
import BottomSheet from '@/src/components/common/BottomSheet';
import Button from '@/src/components/common/Button';
import { fonts, palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { categoryLabel } from '@/src/utils/budget/categories';
import { padDisplay, padText, padValue, pressKey } from '@/src/utils/budget/keypad';
import { select } from '@/src/utils/haptics';
import Keypad from './Keypad';

const ALERTS = [70, 80, 90, 100];

type Props = {
  open: boolean;
  onRequestClose: () => void;
  onClosed: () => void;
  // Enveloppe existante (catégorie et plafond), sinon une nouvelle à choisir
  category: string | null;
  cap: number | null;
  // Catégories sans enveloppe, pour en créer une
  free: string[];
  alertPct: number;
  onSave: (category: string, cap: number) => Promise<boolean>;
  onRemove?: () => Promise<boolean>;
  onAlert: (pct: number) => void;
};

// Une enveloppe : son plafond du mois, au pavé ; le seuil de l'alerte douce
// (80 % par défaut) ; la retirer
export default function EnvelopeSheet({ open, onRequestClose, onClosed, category, cap, free, alertPct, onSave, onRemove, onAlert }: Props) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { height } = useWindowDimensions();
  const [chosen, setChosen] = useState<string | null>(category ?? free[0] ?? null);
  const [text, setText] = useState(() => padText(cap));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const value = padValue(text);

  const run = async (job: () => Promise<boolean>) => {
    setBusy(true);
    const ok = await job();
    setBusy(false);
    setFailed(!ok);
  };

  const chip = (on: boolean) => [styles.chip, on ? { backgroundColor: colors.gold, borderColor: colors.gold } : { borderColor: colors.controlBorder }];
  const chipText = (on: boolean) => [styles.chipText, { color: on ? colors.onGold : colors.text }];

  return (
    <BottomSheet open={open} onRequestClose={onRequestClose} onClosed={onClosed}>
      <ScrollView style={{ maxHeight: height * 0.82 }} contentContainerStyle={styles.body}>
        <AppText variant="title3" accessibilityRole="header" style={styles.center}>
          {category ? `Enveloppe ${categoryLabel(category)}` : 'Nouvelle enveloppe'}
        </AppText>
        <AppText variant="callout" tone="subtitle" style={styles.center}>
          Ce que tu t’autorises chaque mois. Elle repart de zéro le 1er.
        </AppText>
        {!category ? (
          <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Catégorie">
            {free.map((c) => (
              <Pressable
                key={c}
                onPress={() => {
                  select();
                  setChosen(c);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: chosen === c }}
                aria-checked={chosen === c}
                accessibilityLabel={categoryLabel(c)}
                style={chip(chosen === c)}
              >
                <AppText style={chipText(chosen === c)}>{categoryLabel(c)}</AppText>
              </Pressable>
            ))}
          </View>
        ) : null}
        <View accessible accessibilityLabel={`Plafond tapé : ${padDisplay(text)}`} accessibilityLiveRegion="polite">
          <BigNumber text={padDisplay(text)} size={48} tone="text" style={styles.center} />
        </View>
        <Keypad onKey={(k) => setText((t) => pressKey(t, k))} />
        <View style={styles.alert}>
          <AppText variant="caption" tone="subtitle">
            Me prévenir doucement à
          </AppText>
          <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Seuil de l’alerte">
            {ALERTS.map((p) => (
              <Pressable
                key={p}
                onPress={() => {
                  select();
                  onAlert(p);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: alertPct === p }}
                aria-checked={alertPct === p}
                accessibilityLabel={`${p} %`}
                style={chip(alertPct === p)}
              >
                <AppText style={chipText(alertPct === p)}>
                  {p}
                  {' '}%
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
        {failed ? (
          <AppText variant="callout" tone="error" accessibilityRole="alert" style={styles.center}>
            Ça n’a pas pu être enregistré. Réessaie dans un instant.
          </AppText>
        ) : null}
        <Button
          label="Enregistrer"
          onPress={() => chosen && value !== null && run(() => onSave(chosen, value))}
          disabled={!chosen || value === null || value <= 0}
          loading={busy}
        />
        {onRemove ? <Button label="Retirer cette enveloppe" variant="textDanger" onPress={() => run(onRemove)} /> : null}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[3], paddingTop: space[2], paddingBottom: space[2] },
  center: { textAlign: 'center', alignSelf: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], justifyContent: 'center' },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 14 },
  alert: { gap: space[2], alignItems: 'center' },
});
