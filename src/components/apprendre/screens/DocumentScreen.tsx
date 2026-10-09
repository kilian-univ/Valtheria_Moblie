import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { fonts, palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { formatAmount, formatVariation } from '@/src/utils/format';
import { select } from '@/src/utils/haptics';
import { isExactSelection } from '@/src/utils/lessonPlayer';
import ScreenIntro from '../player/ScreenIntro';
import { LessonScreenProps } from '../types';
import FallbackScreen from './FallbackScreen';

const LINE_BORDER = 2;
const SMALL_SIZE = 13;
const SMALL_LINE_HEIGHT = 18;
const DATE_WIDTH = 44;
// Marge au-dessus de la ligne à corriger quand on y fait défiler
const SCROLL_MARGIN = 120;
const SCROLL_DELAY = 120;

type LineLook = 'idle' | 'selected' | 'correct' | 'missed' | 'wrong';

// document : un artefact réaliste (relevé, bulletin...). Seul le mode "select"
// (toucher les lignes demandées) est géré pour l'instant.
export default function DocumentScreen(props: LessonScreenProps) {
  if (props.screen.payload?.mode !== 'select') {
    return <FallbackScreen {...props} />;
  }
  return <SelectDocument {...props} />;
}

function SelectDocument({ screen, answered, onDraftChange, scrollToY }: LessonScreenProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { payload } = screen;
  const lines: any[] = payload.lines ?? [];
  const entete = payload.entete ?? {};

  const [selected, setSelected] = useState<string[]>([]);

  const cardY = useRef(0);
  const linesY = useRef(0);
  const lineY = useRef<Record<string, number>>({});

  const selectableLines = lines.filter((l) => l.zone === 'ligne');
  const correctLines = selectableLines.filter((l) => l.correct);
  const correctIds = correctLines.map((l) => l.id);

  useEffect(() => {
    if (selected.length === 0) {
      onDraftChange(null);
      return;
    }
    onDraftChange({
      raw: selected, // ids des lignes touchées
      correct: isExactSelection(selected, correctIds),
      correctText: correctLines.map((l) => l.libelle).join(', ') || null,
    });
    // correctIds / correctLines dérivent du payload, fixe pour cet écran
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, onDraftChange]);

  // Correction : défile jusqu'à la première erreur, sinon la première ligne manquée
  useEffect(() => {
    if (!answered) return;
    const firstError =
      selectableLines.find((l) => selected.includes(l.id) && !l.correct) ??
      selectableLines.find((l) => l.correct && !selected.includes(l.id));
    if (!firstError) return;
    const y = cardY.current + linesY.current + (lineY.current[firstError.id] ?? 0);
    const timer = setTimeout(() => scrollToY(Math.max(y - SCROLL_MARGIN, 0)), SCROLL_DELAY);
    return () => clearTimeout(timer);
    // seulement au moment où la réponse est validée
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered]);

  const toggle = (id: string) => {
    if (answered) return;
    select();
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const lookOf = (line: any): LineLook => {
    const isSelected = selected.includes(line.id);
    if (answered) {
      if (line.correct && isSelected) return 'correct';
      if (line.correct) return 'missed';
      if (isSelected) return 'wrong';
      return 'idle';
    }
    return isSelected ? 'selected' : 'idle';
  };

  const lookStyle = (look: LineLook) => {
    switch (look) {
      case 'selected':
        return { borderColor: colors.gold, backgroundColor: colors.goldSoft };
      case 'correct':
        return { borderColor: colors.success, backgroundColor: colors.successSoft };
      case 'missed':
        return { borderColor: colors.success, backgroundColor: 'transparent' };
      case 'wrong':
        return { borderColor: colors.error, backgroundColor: colors.dangerSoft };
      default:
        return { borderColor: 'transparent', backgroundColor: 'transparent' };
    }
  };

  const meta = [entete.numero, entete.periode].filter(Boolean).join(' · ');

  return (
    <View style={styles.wrap}>
      <ScreenIntro screen={screen} question={payload.question} subtitle={payload.subtitle} />

      <View
        style={[styles.card, { backgroundColor: colors.surface }]}
        onLayout={(e) => (cardY.current = e.nativeEvent.layout.y)}
      >
        <View style={styles.header}>
          {entete.etablissement ? <AppText style={styles.bank}>{entete.etablissement}</AppText> : null}
          {meta ? (
            <AppText variant="caption" tone="subtitle">
              {meta}
            </AppText>
          ) : null}
          {entete.iban_masque ? (
            <AppText variant="caption" tone="subtitle" style={styles.tabular}>
              {entete.iban_masque}
            </AppText>
          ) : null}
        </View>

        <View style={styles.lines} onLayout={(e) => (linesY.current = e.nativeEvent.layout.y)}>
          {lines.map((line) => {
            const selectable = line.zone === 'ligne';
            const look = lookOf(line);
            const amount = Number(line.montant);
            return (
              <View key={line.id} onLayout={(e) => (lineY.current[line.id] = e.nativeEvent.layout.y)}>
                <Pressable
                  onPress={() => selectable && toggle(line.id)}
                  disabled={answered || !selectable}
                  accessibilityRole={selectable ? 'checkbox' : undefined}
                  accessibilityState={selectable ? { checked: selected.includes(line.id), disabled: answered } : undefined}
                  accessibilityHint={
                    look === 'correct' || look === 'missed'
                      ? 'Ligne à repérer'
                      : look === 'wrong'
                        ? 'Cette ligne ne fait pas partie de la réponse'
                        : undefined
                  }
                  style={[styles.line, lookStyle(look)]}
                >
                  <AppText variant="caption" tone="subtitle" style={[styles.date, styles.tabular]}>
                    {line.date}
                  </AppText>
                  <View style={styles.labelColumn}>
                    <AppText style={styles.label} numberOfLines={2}>
                      {line.libelle}
                    </AppText>
                    {line.sous_libelle ? (
                      <AppText variant="caption" tone="subtitle">
                        {line.sous_libelle}
                      </AppText>
                    ) : null}
                  </View>
                  {Number.isFinite(amount) ? (
                    <AppText tone={amount > 0 ? 'success' : 'text'} style={[styles.amount, styles.tabular]}>
                      {formatVariation(amount)}
                    </AppText>
                  ) : null}
                </Pressable>

                {answered && line.revelation ? (
                  <View style={[styles.revelation, { borderLeftColor: colors.goldLine }]}>
                    <AppText variant="callout" tone="subtitle">
                      {line.revelation}
                    </AppText>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {payload.solde ? (
          <View style={[styles.balance, { borderTopColor: colors.border }]}>
            <AppText style={styles.label}>{payload.solde.libelle}</AppText>
            {Number.isFinite(Number(payload.solde.montant)) ? (
              <AppText style={[styles.amount, styles.tabular]}>{formatAmount(Number(payload.solde.montant))}</AppText>
            ) : null}
          </View>
        ) : null}
        {payload.a_venir ? (
          <AppText variant="caption" tone="subtitle">
            À venir : {payload.a_venir}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space[6],
  },
  card: {
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    padding: space[4],
    gap: space[3],
  },
  header: {
    gap: space[1] / 2,
    paddingHorizontal: space[2],
  },
  bank: {
    fontFamily: fonts.bodyBold,
    fontSize: SMALL_SIZE,
    lineHeight: SMALL_LINE_HEIGHT,
  },
  lines: {
    gap: space[1],
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    borderWidth: LINE_BORDER,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    paddingVertical: space[2],
    paddingHorizontal: space[2],
  },
  date: {
    width: DATE_WIDTH,
  },
  labelColumn: {
    flex: 1,
  },
  label: {
    fontFamily: fonts.bodySemibold,
    fontSize: SMALL_SIZE,
    lineHeight: SMALL_LINE_HEIGHT,
  },
  amount: {
    fontFamily: fonts.bodySemibold,
    fontSize: SMALL_SIZE,
    lineHeight: SMALL_LINE_HEIGHT,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  revelation: {
    marginTop: space[1],
    marginBottom: space[2],
    marginLeft: space[3],
    paddingLeft: space[3],
    borderLeftWidth: LINE_BORDER,
  },
  balance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space[3],
    borderTopWidth: 1,
    paddingTop: space[3],
    paddingHorizontal: space[2],
  },
});
