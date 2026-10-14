import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import GoldConfetti from '@/src/components/common/GoldConfetti';
import ValFullBody from '@/src/components/common/ValFullBody';
import { motion } from '@/src/constants/motion';
import { fonts, palette, radius, space, titleLetterSpacing, withOpacity } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { useCountUp } from '@/src/hooks/useCountUp';
import { formatInteger } from '@/src/utils/format';
import { celebrate } from '@/src/utils/haptics';
import { recoveredLabel, scoreLabel } from '@/src/utils/lessonPlayer';
import Cascade from '../player/Cascade';

const NBSP = ' ';
const VAL_HEIGHT = 200;
const TITLE_SIZE = 32;
const CARD_VALUE_SIZE = 26;
const TAKEAWAY_SIZE = 20;
const TAKEAWAY_BORDER = 0.35;
const TAKEAWAY_TINT = 0.08;
// Les cartes arrivent après Val et le titre
const CARDS_RANK = 2;

export type LessonRecapProps = {
  firstName?: string | null;
  lessonTitle: string | null;
  // XP gagnés (null : inconnus, la carte n'apparaît pas)
  xp: number | null;
  correct: number;
  total: number;
  recovered: number;
  // Série de jours (null ou 0 : la carte n'apparaît pas)
  streak: number | null;
  // Phrase clé de la leçon (null : pas de carte « À RETENIR »)
  takeaway: string | null;
  onContinue: () => void;
  buttonLabel?: string;
};

// Bilan de fin de leçon : Val qui saute sous un halo, « Bravo, <prénom> ! »,
// trois cartes (XP qui défile, justes, série) qui arrivent en cascade, la
// phrase à retenir, confettis dorés et vibration de fête. Un toucher
// accélère la cascade. Animations réduites : tout est posé, sans confettis.
export default function LessonRecap({
  firstName,
  lessonTitle,
  xp,
  correct,
  total,
  recovered,
  streak,
  takeaway,
  onContinue,
  buttonLabel = 'Continuer',
}: LessonRecapProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const [fast, setFast] = useState(false);
  const name = firstName?.trim();

  const cardsAt = CARDS_RANK * motion.stagger + motion.sheet;
  const counted = Math.round(useCountUp(xp ?? 0, { delay: cardsAt }));
  const xpShown = fast ? (xp ?? 0) : counted;
  const extra = recoveredLabel(recovered);

  useEffect(() => {
    celebrate();
  }, []);

  const cards = [
    xp !== null ? { key: 'xp', label: 'XP', ink: colors.gold, value: `+${NBSP}${formatInteger(xpShown)}`, a11y: `${xp} XP gagnés` } : null,
    total > 0
      ? {
          key: 'justes',
          label: 'JUSTES',
          ink: colors.success,
          value: scoreLabel(correct, total),
          note: extra,
          a11y: `${scoreLabel(correct, total)} justes${extra ? `, ${extra.replace(NBSP, ' ')}` : ''}`,
        }
      : null,
    streak !== null && streak > 0
      ? { key: 'serie', label: 'SÉRIE', ink: colors.gold, value: `🔥${NBSP}${formatInteger(streak)}`, a11y: `Série de ${streak} ${streak >= 2 ? 'jours' : 'jour'}` }
      : null,
  ].filter((c) => c !== null);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Un toucher fait tout arriver d'un coup */}
        <Pressable onPress={() => setFast(true)} disabled={fast} accessible={false} style={styles.center}>
          <Cascade index={0} skip={fast}>
            <ValFullBody pose="saut" height={VAL_HEIGHT} bounce halo />
          </Cascade>

          <Cascade index={1} skip={fast} style={styles.texts}>
            <AppText accessibilityRole="header" maxFontSizeMultiplier={1.3} style={styles.title}>
              {name ? `Bravo, ${name}${NBSP}!` : 'Leçon terminée !'}
            </AppText>
            {lessonTitle ? (
              <AppText variant="callout" tone="subtitle" style={styles.centerText}>
                {name ? `${lessonTitle} : leçon terminée.` : lessonTitle}
              </AppText>
            ) : null}
          </Cascade>

          {cards.length > 0 ? (
            <View style={styles.cards}>
              {cards.map((card, i) => (
                <Cascade key={card.key} index={CARDS_RANK + i} skip={fast} style={styles.cardSlot}>
                  <View
                    style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.border }]}
                    accessible
                    accessibilityLabel={card.a11y}
                  >
                    <AppText style={[styles.cardLabel, { color: card.ink }]}>{card.label}</AppText>
                    <AppText maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit style={styles.cardValue}>
                      {card.value}
                    </AppText>
                    {'note' in card && card.note ? (
                      <AppText variant="caption" tone="success" style={styles.centerText}>
                        {card.note}
                      </AppText>
                    ) : null}
                  </View>
                </Cascade>
              ))}
            </View>
          ) : null}

          {takeaway ? (
            <Cascade index={CARDS_RANK + cards.length} skip={fast}>
              <View
                style={[
                  styles.takeaway,
                  { borderColor: withOpacity(colors.gold, TAKEAWAY_BORDER), backgroundColor: withOpacity(colors.gold, TAKEAWAY_TINT) },
                ]}
                accessible
                accessibilityLabel={`À retenir : ${takeaway}`}
              >
                <View style={styles.takeawayHead}>
                  <Ionicons name="star" size={14} color={colors.gold} />
                  <AppText style={[styles.cardLabel, { color: colors.gold }]}>À RETENIR</AppText>
                </View>
                <AppText maxFontSizeMultiplier={1.3} style={styles.takeawayText}>
                  {takeaway}
                </AppText>
              </View>
            </Cascade>
          ) : null}
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <Button label={buttonLabel} onPress={onContinue} />
      </View>
      <GoldConfetti />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: space[4],
  },
  center: {
    gap: space[5],
    paddingHorizontal: space[5],
  },
  texts: {
    alignItems: 'center',
    gap: space[1] + 2,
  },
  title: {
    fontFamily: fonts.title,
    fontSize: TITLE_SIZE,
    lineHeight: TITLE_SIZE + 6,
    letterSpacing: titleLetterSpacing(TITLE_SIZE),
    textAlign: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  cards: {
    flexDirection: 'row',
    gap: space[2] + 2,
  },
  cardSlot: {
    flex: 1,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    gap: space[1] + 2,
    paddingVertical: space[3] + 2,
    paddingHorizontal: space[2] + 2,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardLabel: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
  },
  cardValue: {
    fontFamily: fonts.title,
    fontSize: CARD_VALUE_SIZE,
    lineHeight: CARD_VALUE_SIZE + 6,
    letterSpacing: titleLetterSpacing(CARD_VALUE_SIZE),
    fontVariant: ['tabular-nums'],
  },
  takeaway: {
    gap: space[2],
    padding: space[4] + 2,
    borderRadius: radius.lg - 2,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  takeawayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  takeawayText: {
    fontFamily: fonts.title,
    fontSize: TAKEAWAY_SIZE,
    lineHeight: TAKEAWAY_SIZE + 7,
    letterSpacing: titleLetterSpacing(TAKEAWAY_SIZE),
  },
  footer: {
    paddingHorizontal: space[5],
    paddingBottom: space[4],
  },
});
