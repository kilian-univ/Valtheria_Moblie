import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import AppText from '@/src/components/common/AppText';
import { motion, timing } from '@/src/constants/motion';
import { fonts, moduleColors, palette, radius, space, titleLetterSpacing, withOpacity } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import type { DialogueScreen as DialogueModel } from '@/src/lesson/model';
import { grade } from '@/src/utils/grade';
import { feedback } from '@/src/utils/feedback';
import Cascade from '../player/Cascade';
import ScreenIntro from '../player/ScreenIntro';
import { LessonScreenProps } from '../types';

const HEAD_AVATAR = 48;
const AVATAR = 40;
const DOT = 7;
const REPLY_TINT = 0.06;
const MINE_TINT = 0.16;
// Une bulle envoyée remonte depuis les réponses
const SENT_RISE = 40;
// Le temps de lire la réaction avant la feuille
const READ_PAUSE = motion.max;

// Avatar en attendant un portrait : dégradé d'une couleur de module, choisie
// d'après le prénom (toujours la même pour un personnage)
function characterColors(name: string) {
  const all = Object.values(moduleColors);
  const sum = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return all[sum % all.length];
}

// dialogue — un personnage écrit (trois petits points, puis ses messages en
// bulles). En bas, les réponses : en toucher une l'envoie aussitôt (pas de
// « Valider ») ; elle remonte et devient ta bulle, le personnage écrit puis
// réagit, et la feuille de réponse arrive. Corrigé comme sur le site
// (grade.ts : replies[].correct). Réponse : l'id de la réplique choisie.
export default function DialogueScreen({ screen, answered, onDraftChange, enterDelay }: LessonScreenProps<DialogueModel>) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const { character, messages, replies } = screen;
  const tint = characterColors(character.name);

  // Messages du personnage déjà écrits ; « il écrit » pendant 600 ms avant chacun
  const [shown, setShown] = useState(reduced ? messages.length : 0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [reacted, setReacted] = useState(false);
  const reply = replies.find((r) => r.id === chosen) ?? null;
  const typing = (!reduced && shown < messages.length) || (reply !== null && !reacted && !reduced);
  const ready = shown >= messages.length;

  useEffect(() => {
    if (reduced) return;
    const timers = messages.map((_, i) =>
      setTimeout(() => setShown(i + 1), enterDelay + (i + 1) * motion.typing + i * motion.state)
    );
    return () => timers.forEach(clearTimeout);
  }, [messages, enterDelay, reduced]);

  // Réponse envoyée : il écrit, réagit, puis la feuille
  useEffect(() => {
    if (!chosen) return;
    const typed = reduced ? 0 : motion.sheet + motion.typing;
    const react = setTimeout(() => setReacted(true), typed);
    const sheet = setTimeout(() => {
      onDraftChange({
        raw: chosen,
        correct: grade(screen.source, chosen) === true,
        correctText: replies.find((r) => r.correct)?.text ?? null,
        autoSubmit: true,
      });
    }, typed + READ_PAUSE);
    return () => {
      clearTimeout(react);
      clearTimeout(sheet);
    };
  }, [chosen, replies, screen.source, onDraftChange, reduced]);

  const send = (id: string) => {
    if (chosen || answered || !ready) return;
    feedback.pick();
    setChosen(id);
  };

  const avatar = (diameter: number) => (
    <LinearGradient
      colors={[tint.face, tint.deep]}
      start={{ x: 0.3, y: 0.2 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.avatar, { width: diameter, height: diameter }]}
    >
      <AppText
        maxFontSizeMultiplier={1}
        style={[styles.initial, { color: tint.onFace, fontSize: diameter * 0.46, lineHeight: diameter * 0.6 }]}
      >
        {character.name.charAt(0)}
      </AppText>
    </LinearGradient>
  );

  const theirBubble = (text: string, key: string) => (
    <Cascade key={key} index={0} style={styles.theirRow}>
      {avatar(AVATAR)}
      <View style={[styles.bubble, styles.theirs, { backgroundColor: colors.chatBubble }]}>
        <AppText variant="bodyMedium" style={styles.bubbleText}>
          {text}
        </AppText>
      </View>
    </Cascade>
  );

  return (
    <View style={styles.wrap}>
      {/* L'en-tête du personnage */}
      <View style={[styles.head, { borderBottomColor: colors.border }]} accessible accessibilityRole="header">
        {avatar(HEAD_AVATAR)}
        <View style={styles.headTexts}>
          <AppText style={styles.name}>{character.name}</AppText>
          {character.role ? (
            <AppText variant="caption" tone="subtitle">
              {character.role}
            </AppText>
          ) : null}
        </View>
      </View>

      <ScreenIntro screen={screen} size="md" />

      <View style={styles.thread} accessibilityLiveRegion="polite">
        {messages.slice(0, shown).map((m, i) => theirBubble(m, `m${i}`))}
        {reply ? (
          <Cascade index={0} rise={SENT_RISE} style={styles.mineRow}>
            <View style={[styles.bubble, styles.mine, { backgroundColor: withOpacity(colors.gold, MINE_TINT) }]}>
              <AppText variant="bodyMedium" style={styles.bubbleText}>
                {reply.text}
              </AppText>
            </View>
          </Cascade>
        ) : null}
        {reply && reacted && reply.reaction ? theirBubble(reply.reaction, 'reaction') : null}
        {typing ? <TypingDots /> : null}
      </View>

      {!chosen && ready ? (
        <Cascade index={0} style={styles.replies}>
          <AppText variant="sectionLabel" style={styles.repliesLabel}>
            Touche ta réponse pour l’envoyer
          </AppText>
          {replies.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => send(r.id)}
              disabled={answered}
              accessibilityRole="button"
              accessibilityLabel={r.text}
              accessibilityHint="Envoie cette réponse"
              style={({ pressed }) => [
                styles.reply,
                {
                  borderColor: colors.goldRing,
                  backgroundColor: withOpacity(colors.gold, pressed ? MINE_TINT : REPLY_TINT),
                },
              ]}
            >
              <AppText variant="bodyMedium" style={styles.replyText}>
                {r.text}
              </AppText>
              <Ionicons name="send" size={18} color={colors.gold} />
            </Pressable>
          ))}
        </Cascade>
      ) : null}
    </View>
  );
}

// « Il écrit » : trois petits points qui s'allument tour à tour
function TypingDots() {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  return (
    <Cascade index={0} style={styles.theirRow}>
      <View style={{ width: AVATAR }} />
      <View
        style={[styles.bubble, styles.theirs, styles.dots, { backgroundColor: colors.chatBubble }]}
        accessible
        accessibilityLabel="Il écrit"
      >
        {[0, 1, 2].map((i) => (
          <Dot key={i} index={i} />
        ))}
      </View>
    </Cascade>
  );
}

function Dot({ index }: { index: number }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const opacity = useSharedValue(0.3);
  useEffect(() => {
    if (reduced) return;
    opacity.set(
      withDelay(
        index * motion.state,
        withRepeat(withSequence(withTiming(0.9, timing(motion.sheet)), withTiming(0.3, timing(motion.sheet))), -1)
      )
    );
  }, [index, reduced, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.View style={[styles.dot, { backgroundColor: colors.subtitle }, style]} />;
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    gap: space[4],
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingBottom: space[3] + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headTexts: {
    gap: 2,
  },
  name: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    lineHeight: 22,
  },
  avatar: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: fonts.title,
    letterSpacing: titleLetterSpacing(20),
  },
  thread: {
    flex: 1,
    gap: space[2] + 2,
  },
  theirRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space[2] + 2,
    paddingRight: space[8],
  },
  mineRow: {
    alignItems: 'flex-end',
    paddingLeft: space[10],
  },
  bubble: {
    paddingHorizontal: space[3] + 2,
    paddingVertical: space[3],
    borderRadius: radius.lg - 2,
    borderCurve: 'continuous',
    flexShrink: 1,
  },
  theirs: {
    borderBottomLeftRadius: space[1],
  },
  mine: {
    borderBottomRightRadius: space[1],
  },
  bubbleText: {
    fontFamily: fonts.body,
  },
  dots: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: space[4],
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: radius.pill,
  },
  replies: {
    gap: space[2] + 2,
  },
  repliesLabel: {
    fontSize: 11,
    lineHeight: 14,
    marginBottom: space[1],
  },
  reply: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2] + 2,
    paddingHorizontal: space[4],
    paddingVertical: space[3] + 2,
    borderWidth: 1.5,
    borderRadius: radius.lg - 2,
    borderCurve: 'continuous',
  },
  replyText: {
    flex: 1,
  },
});
