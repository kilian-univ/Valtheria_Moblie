import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { fonts, palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { formatAmount, formatVariation } from '@/src/utils/format';
import type { DocumentLine, DocumentScreen as DocumentModel } from '@/src/lesson/model';
import { grade } from '@/src/utils/grade';
import { feedback } from '@/src/utils/feedback';
import ScreenIntro from '../player/ScreenIntro';
import { LessonScreenProps } from '../types';

const LINE_BORDER = 2;
const SMALL_SIZE = 13;
const SMALL_LINE_HEIGHT = 18;
const DATE_WIDTH = 44;
// Marge au-dessus de la ligne à corriger quand on y fait défiler
const SCROLL_MARGIN = 120;
const SCROLL_DELAY = 120;

type LineLook = 'idle' | 'selected' | 'correct' | 'missed' | 'wrong';

// document — un artefact réaliste (relevé…) déjà résolu par le serveur.
// mode pick : toucher une ligne (réponse : son id) ; mode select : toucher
// toutes les lignes demandées (réponse : la liste des ids). Les lignes sans
// id sont décoratives et ne se touchent pas.
export default function DocumentScreen({
  screen,
  answered,
  onDraftChange,
  scrollToY,
}: LessonScreenProps<DocumentModel>) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { lines, header, mode } = screen;

  const [selected, setSelected] = useState<string[]>([]);

  const cardY = useRef(0);
  const linesY = useRef(0);
  const lineY = useRef<Record<string, number>>({});

  useEffect(() => {
    if (selected.length === 0) {
      onDraftChange(null);
      return;
    }
    const raw = mode === 'pick' ? selected[0] : selected;
    const right = lines.filter((l) => l.id !== null && l.correct);
    onDraftChange({
      raw,
      correct: grade(screen.source, raw) === true,
      correctText: right.map((l) => l.libelle).join(', ') || null,
      correctCount: right.length,
    });
  }, [selected, mode, lines, screen.source, onDraftChange]);

  // Correction : défile jusqu'à la première erreur, sinon la première ligne manquée
  useEffect(() => {
    if (!answered) return;
    const touchable = lines.filter((l) => l.id !== null);
    const firstError =
      touchable.find((l) => selected.includes(l.id!) && !l.correct) ??
      touchable.find((l) => l.correct && !selected.includes(l.id!));
    if (!firstError?.id) return;
    const y = cardY.current + linesY.current + (lineY.current[firstError.id] ?? 0);
    const timer = setTimeout(() => scrollToY(Math.max(y - SCROLL_MARGIN, 0)), SCROLL_DELAY);
    return () => clearTimeout(timer);
    // seulement au moment où la réponse est validée
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered]);

  const toggle = (id: string) => {
    if (answered) return;
    feedback.pick();
    if (mode === 'pick') {
      setSelected([id]);
      return;
    }
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const lookOf = (line: DocumentLine): LineLook => {
    if (line.id === null) return 'idle';
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

  // Après validation : révélation des lignes touchées et des lignes à trouver
  const showsRevelation = (line: DocumentLine, look: LineLook) =>
    answered && line.revelation !== null && look !== 'idle';

  const meta = [header.numero, header.periode].filter(Boolean).join(' · ');

  return (
    <View style={styles.wrap}>
      <ScreenIntro screen={screen} />

      <View
        style={[styles.card, { backgroundColor: colors.surface }]}
        onLayout={(e) => (cardY.current = e.nativeEvent.layout.y)}
      >
        <View style={styles.header}>
          {header.etablissement ? <AppText style={styles.bank}>{header.etablissement}</AppText> : null}
          {meta ? (
            <AppText variant="caption" tone="subtitle">
              {meta}
            </AppText>
          ) : null}
          {header.ibanMasque ? (
            <AppText variant="caption" tone="subtitle" style={styles.tabular}>
              {header.ibanMasque}
            </AppText>
          ) : null}
        </View>

        <View style={styles.lines} onLayout={(e) => (linesY.current = e.nativeEvent.layout.y)}>
          {lines.map((line, i) => {
            const look = lookOf(line);
            const key = line.id ?? `deco-${i}`;

            // Intitulé de section : décoratif
            if (line.type === 'section') {
              return (
                <AppText key={key} variant="sectionLabel" tone="subtitle" style={styles.section}>
                  {line.libelle}
                </AppText>
              );
            }

            const strong = line.type === 'total' || line.type === 'gros';
            const content = (
              <>
                <AppText variant="caption" tone="subtitle" style={[styles.date, styles.tabular]}>
                  {line.date ?? ''}
                </AppText>
                <View style={styles.labelColumn}>
                  <AppText style={[styles.label, strong && styles.strong]} numberOfLines={2}>
                    {line.libelle}
                  </AppText>
                  {line.sousLibelle ? (
                    <AppText variant="caption" tone="subtitle">
                      {line.sousLibelle}
                    </AppText>
                  ) : null}
                </View>
                {line.montant !== null ? (
                  <AppText
                    tone={line.montant > 0 ? 'success' : 'text'}
                    style={[styles.amount, strong && styles.strong, styles.tabular]}
                  >
                    {formatVariation(line.montant)}
                  </AppText>
                ) : null}
              </>
            );

            return (
              <View key={key} onLayout={(e) => line.id && (lineY.current[line.id] = e.nativeEvent.layout.y)}>
                {line.id !== null ? (
                  <Pressable
                    onPress={() => toggle(line.id!)}
                    disabled={answered}
                    accessibilityRole={mode === 'pick' ? 'radio' : 'checkbox'}
                    accessibilityState={{ checked: selected.includes(line.id), disabled: answered }}
                    accessibilityHint={
                      look === 'correct' || look === 'missed'
                        ? 'Ligne à repérer'
                        : look === 'wrong'
                          ? 'Cette ligne ne fait pas partie de la réponse'
                          : undefined
                    }
                    style={[styles.line, lookStyle(look)]}
                  >
                    {content}
                  </Pressable>
                ) : (
                  <View style={[styles.line, lookStyle('idle')]}>{content}</View>
                )}

                {showsRevelation(line, look) ? (
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

        {screen.solde ? (
          <View style={[styles.balance, { borderTopColor: colors.border }]}>
            <AppText style={styles.label}>{screen.solde.libelle}</AppText>
            {screen.solde.montant !== null ? (
              <AppText style={[styles.amount, styles.tabular]}>{formatAmount(screen.solde.montant)}</AppText>
            ) : null}
          </View>
        ) : null}

        {screen.aVenir.length > 0 ? (
          <View style={styles.upcoming}>
            <AppText variant="sectionLabel" tone="subtitle">
              À venir
            </AppText>
            {screen.aVenir.map((a, i) => (
              <View key={i} style={styles.upcomingRow}>
                <AppText variant="caption" tone="subtitle" style={[styles.date, styles.tabular]}>
                  {a.date ?? ''}
                </AppText>
                <AppText variant="caption" tone="subtitle" style={styles.labelColumn}>
                  {a.libelle}
                </AppText>
                {a.montant !== null ? (
                  <AppText variant="caption" tone="subtitle" style={styles.tabular}>
                    {formatVariation(a.montant)}
                  </AppText>
                ) : null}
              </View>
            ))}
          </View>
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
  strong: {
    fontFamily: fonts.bodyBold,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  section: {
    marginTop: space[2],
    paddingHorizontal: space[2],
  },
  upcoming: {
    gap: space[1],
    paddingHorizontal: space[2],
  },
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
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
