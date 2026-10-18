import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import BigNumber from '@/src/components/common/BigNumber';
import Button from '@/src/components/common/Button';
import HelpTerm from '@/src/components/patrimoine/HelpTerm';
import { fonts, palette, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import type { SavingLine, Spendable } from '@/src/utils/budget/calc';
import { agoLabel, monthOf, longDay } from '@/src/utils/budget/dates';
import { tap } from '@/src/utils/haptics';
import { NBSP } from '@/src/utils/frenchSpaces';
import { euros, signedEuros } from '@/src/utils/budget/format';

const EDGE = 5;

// « Tu peux encore dépenser » (maquette, écran 1) : le chiffre en grand, par
// jour jusqu'à la paie, le détail du calcul, et le seul geste à faire :
// mettre à jour le solde. Un solde ancien reste affiché, signalé « à confirmer ».
// L'épargne : un montant tant qu'elle compte dans le calcul, « prévue le 31 »
// avant son jour (toucher pour dire qu'elle est déjà faite), puis « déjà mise
// de côté ».
export default function SpendableCard({ s, today, saving, onUpdate, onConfirmSaving }: { s: Spendable; today: string; saving: SavingLine; onUpdate: () => void; onConfirmSaving: () => void }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const sameMonth = monthOf(s.payDate).month === monthOf(today).month;
  const until = s.payDay !== null ? `jusqu’à ta paie, le${NBSP}${Number(s.payDate.slice(8))}` : `jusqu’au ${longDay(s.payDate)}`;
  const savingValue =
    saving.kind === 'amount'
      ? signedEuros(-saving.amount)
      : saving.kind === 'planned'
        ? saving.date === today
          ? 'prévue aujourd’hui'
          : `prévue le${NBSP}${Number(saving.date.slice(8))}`
        : saving.kind === 'done'
          ? 'déjà mise de côté'
          : signedEuros(0);
  const lines: { label: string; value: string; tone?: 'gold' | 'success'; onPress?: () => void }[] = [
    { label: 'Sur ton compte', value: euros(s.balance) },
    { label: sameMonth ? 'Encore à payer ce mois' : `Encore à payer d’ici le ${Number(s.payDate.slice(8))}`, value: signedEuros(-s.toPay) },
    { label: 'Épargne prévue', value: savingValue, tone: 'gold', onPress: saving.kind === 'planned' ? onConfirmSaving : undefined },
  ];
  if (s.incoming > 0) lines.push({ label: 'Rentrées depuis ton solde', value: signedEuros(s.incoming), tone: 'success' });
  if (s.spent > 0) lines.push({ label: 'Dépenses notées depuis', value: signedEuros(-s.spent) });
  if (s.received > 0) lines.push({ label: 'Rentrées notées depuis', value: signedEuros(s.received), tone: 'success' });
  const negative = s.amount < 0;

  return (
    <View>
      <View style={[styles.edge, { backgroundColor: colors.surfaceEdge }]} />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <View
          accessible
          accessibilityLabel={`Tu peux encore dépenser ${euros(s.amount)}, soit ${euros(s.perDay)} par jour ${until}.${s.stale ? ` À confirmer : ton solde date de ${s.balanceAge} jours.` : ''}`}
        >
          <AppText variant="callout" tone="subtitle">
            Tu peux encore dépenser
          </AppText>
          <BigNumber text={euros(s.amount)} size={48} tone={negative ? 'error' : 'text'} style={styles.left} />
          <AppText variant="body">
            soit{' '}
            <AppText variant="body" style={[styles.bold, { color: negative ? colors.error : colors.success }]}>
              {euros(s.perDay)} par jour
            </AppText>{' '}
            <AppText variant="body" tone="subtitle">
              {until}
            </AppText>
          </AppText>
          {s.stale ? (
            <AppText variant="caption" style={[styles.stale, { color: colors.streak }]}>
              À confirmer : ton solde date de {s.balanceAge}
              {NBSP}jours.
            </AppText>
          ) : null}
        </View>
        <View style={[styles.detail, { borderTopColor: colors.border }]}>
          {lines.map((l) =>
            l.onPress ? (
              <Pressable
                key={l.label}
                onPress={() => {
                  tap();
                  l.onPress?.();
                }}
                accessibilityRole="button"
                accessibilityLabel={`${l.label} : ${l.value}`}
                accessibilityHint="Indique si tu l’as déjà mise de côté"
                hitSlop={8}
                style={({ pressed }) => [styles.line, pressed && styles.pressed]}
              >
                <AppText variant="caption" tone="subtitle" style={styles.lineLabel}>
                  {l.label}
                </AppText>
                <AppText variant="caption" tone={l.tone ?? 'text'} style={styles.underline}>
                  {l.value}
                </AppText>
              </Pressable>
            ) : (
              <View key={l.label} style={styles.line} accessible accessibilityLabel={`${l.label} : ${l.value}`}>
                <AppText variant="caption" tone="subtitle" style={styles.lineLabel}>
                  {l.label}
                </AppText>
                <AppText variant="caption" tone={l.tone ?? 'text'}>
                  {l.value}
                </AppText>
              </View>
            )
          )}
        </View>
        {/* Hors du bloc lu d'un trait : le « ? » reste touchable au lecteur d'écran */}
        <View style={styles.help}>
          <HelpTerm term="Reste à vivre" />
        </View>
        <Button
          label={`Mettre à jour mon solde · ${agoLabel(s.balanceAge)}`}
          variant="goldOutline"
          onPress={onUpdate}
          accessibilityHint="Un seul nombre : le solde de ton compte courant"
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  help: { position: 'absolute', top: space[4], right: space[4] },
  edge: { position: 'absolute', left: 0, right: 0, top: EDGE, bottom: -EDGE, borderRadius: 24, borderCurve: 'continuous' },
  card: { borderRadius: 24, borderCurve: 'continuous', borderWidth: 1, padding: 18 },
  left: { textAlign: 'left' },
  bold: { fontFamily: fonts.bodyBold },
  stale: { marginTop: space[1], fontFamily: fonts.bodySemibold },
  detail: { marginTop: 14, paddingTop: space[3], borderTopWidth: 1, gap: 2 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: space[2] },
  lineLabel: { flex: 1 },
  pressed: { opacity: 0.6 },
  underline: { textDecorationLine: 'underline', textDecorationStyle: 'dotted' },
  button: { marginTop: 14 },
});
