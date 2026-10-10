import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import AppText from '@/src/components/common/AppText';
import { durations } from '@/src/constants/motion';
import { fonts, palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import type { DialogueScreen as DialogueModel } from '@/src/lesson/model';
import { grade } from '@/src/utils/grade';
import { select } from '@/src/utils/haptics';
import ReliefOption from '../player/ReliefOption';
import ScreenIntro from '../player/ScreenIntro';
import { LessonScreenProps } from '../types';

const AVATAR = 36;
// Le personnage « répond » un instant après le choix, puis la feuille s'ouvre
// le temps de lire sa réaction
const REACTION_DELAY = 700;
const SHEET_DELAY = 1600;

// dialogue — les bulles du personnage, puis trois réponses en relief. Après
// le choix : la réponse choisie, la réaction du personnage en bulle, puis la
// feuille de réponse avec la réplique de Val. Corrigé comme sur le site
// (grade.ts : replies[].correct). Réponse : l'id de la réplique choisie.
export default function DialogueScreen({ screen, answered, onDraftChange }: LessonScreenProps<DialogueModel>) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const { character, messages, replies } = screen;
  const [chosen, setChosen] = useState<string | null>(null);
  const [reacted, setReacted] = useState(false);

  const reply = replies.find((r) => r.id === chosen) ?? null;

  useEffect(() => {
    if (!chosen) return;
    const reaction = setTimeout(() => setReacted(true), REACTION_DELAY);
    const sheet = setTimeout(() => {
      onDraftChange({
        raw: chosen,
        correct: grade(screen.source, chosen) === true,
        correctText: replies.find((r) => r.correct)?.text ?? null,
        autoSubmit: true,
      });
    }, SHEET_DELAY);
    return () => {
      clearTimeout(reaction);
      clearTimeout(sheet);
    };
  }, [chosen, replies, screen.source, onDraftChange]);

  const choose = (id: string) => {
    if (chosen || answered) return;
    select();
    setChosen(id);
  };

  const entering = reduced ? undefined : FadeInDown.duration(durations.enterOpacity);

  const characterBubble = (text: string, key: string) => (
    <Animated.View key={key} entering={entering} style={styles.theirRow}>
      <View style={[styles.avatar, { backgroundColor: colors.surfaceAlt }]}>
        <AppText style={styles.initial}>{character.name.charAt(0)}</AppText>
      </View>
      <View style={[styles.bubble, styles.theirs, { backgroundColor: colors.surface }]}>
        <AppText variant="callout">{text}</AppText>
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.wrap}>
      <ScreenIntro screen={screen} />

      <View style={styles.thread} accessibilityLiveRegion="polite">
        <AppText variant="caption" tone="subtitle">
          {character.name}
          {character.role ? `, ${character.role}` : ''}
        </AppText>
        {messages.map((m, i) => characterBubble(m, `m${i}`))}
        {reply ? (
          <Animated.View entering={entering} style={styles.mineRow}>
            <View style={[styles.bubble, styles.mine, { backgroundColor: colors.goldSoft }]}>
              <AppText variant="callout">{reply.text}</AppText>
            </View>
          </Animated.View>
        ) : null}
        {reply && reacted && reply.reaction ? characterBubble(reply.reaction, 'reaction') : null}
      </View>

      <View style={styles.options} accessibilityRole="radiogroup">
        <AppText variant="sectionLabel">Ta réponse</AppText>
        {replies.map((r) => (
          <ReliefOption
            key={r.id}
            label={r.text}
            state={answered ? (r.correct ? 'correct' : r.id === chosen ? 'wrong' : 'idle') : r.id === chosen ? 'selected' : 'idle'}
            selected={r.id === chosen}
            disabled={chosen !== null || answered}
            onPress={() => choose(r.id)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space[6],
  },
  thread: {
    gap: space[3],
  },
  theirRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space[2],
    paddingRight: space[8],
  },
  mineRow: {
    alignItems: 'flex-end',
    paddingLeft: space[10],
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: fonts.bodySemibold,
  },
  bubble: {
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    flexShrink: 1,
  },
  theirs: {
    borderBottomLeftRadius: radius.sm,
  },
  mine: {
    borderBottomRightRadius: radius.sm,
  },
  options: {
    gap: space[3],
  },
});
