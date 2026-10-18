import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import BigNumber from '@/src/components/common/BigNumber';
import BottomSheet from '@/src/components/common/BottomSheet';
import Button from '@/src/components/common/Button';
import Pill from '@/src/components/common/Pill';
import { palette, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { padDisplay, padText, padValue, pressKey } from '@/src/utils/budget/keypad';
import { tap } from '@/src/utils/haptics';
import DayChips from './DayChips';
import Keypad from './Keypad';

type Props = {
  open: boolean;
  onRequestClose: () => void;
  onClosed: () => void;
  title: string;
  subtitle?: string;
  // Valeur de départ (null : rien de tapé)
  initial: number | null;
  // Le solde peut être négatif (découvert) : un interrupteur le permet
  allowNegative?: boolean;
  confirmLabel: string;
  // false : l'enregistrement a échoué (la feuille reste ouverte, avec le message)
  onConfirm: (value: number) => Promise<boolean>;
  errorText?: string;
  // Jour du mois à choisir aussi (paie, charge fixe)
  day?: { value: number | null; onChange: (day: number) => void; label: string };
  // Bouton secondaire (« Retirer cette charge »)
  secondary?: { label: string; onPress: () => void };
};

// Feuille à un seul nombre (maquette, écran 2) : le chiffre en grand, le
// pavé numérique, un bouton. Sert au solde et aux montants de la mise en route.
export default function AmountSheet({ open, onRequestClose, onClosed, title, subtitle, initial, allowNegative, confirmLabel, onConfirm, errorText, day, secondary }: Props) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  // Feuille montée à chaque ouverture : la saisie part de la valeur de départ
  const [text, setText] = useState(() => padText(initial));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const value = padValue(text);
  const negative = text.startsWith('-');

  const confirm = async () => {
    if (value === null) return;
    setBusy(true);
    const ok = await onConfirm(value);
    setBusy(false);
    setFailed(!ok);
  };

  return (
    <BottomSheet open={open} onRequestClose={onRequestClose} onClosed={onClosed}>
      <View style={styles.body}>
        <AppText variant="title3" accessibilityRole="header" style={styles.center}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="callout" tone="subtitle" style={styles.center}>
            {subtitle}
          </AppText>
        ) : null}
        <View accessible accessibilityLabel={`Montant tapé : ${padDisplay(text)}`} accessibilityLiveRegion="polite">
          <BigNumber text={padDisplay(text)} size={56} tone={negative ? 'error' : 'text'} style={styles.center} />
        </View>
        {allowNegative ? (
          <Pressable
            onPress={() => {
              tap();
              setText((t) => pressKey(t, '-'));
            }}
            hitSlop={8}
            accessibilityRole="switch"
            accessibilityState={{ checked: negative }}
            aria-checked={negative}
            accessibilityLabel="Mon compte est à découvert"
            style={styles.center}
          >
            <Pill
              size="sm"
              icon={negative ? 'checkmark' : 'remove'}
              label="À découvert"
              background={negative ? colors.dangerSoft : colors.panelStrong}
              color={negative ? colors.error : colors.subtitle}
            />
          </Pressable>
        ) : null}
        {day ? (
          <View style={styles.day}>
            <AppText variant="caption" tone="subtitle">
              {day.label}
            </AppText>
            <DayChips value={day.value} onChange={day.onChange} label={day.label} />
          </View>
        ) : null}
        <Keypad onKey={(k) => setText((t) => pressKey(t, k))} />
        {failed && errorText ? (
          <AppText variant="callout" tone="error" accessibilityRole="alert" style={styles.center}>
            {errorText}
          </AppText>
        ) : null}
        <Button
          label={confirmLabel}
          onPress={confirm}
          disabled={value === null || (!!day && day.value === null)}
          disabledReason={day && day.value === null && value !== null ? 'Choisis le jour du mois' : undefined}
          loading={busy}
        />
        {secondary ? <Button label={secondary.label} variant="text" onPress={secondary.onPress} /> : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[3], paddingTop: space[2] },
  center: { textAlign: 'center', alignSelf: 'center' },
  day: { gap: space[1] },
});
