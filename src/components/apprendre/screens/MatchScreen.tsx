import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import AppText from '@/src/components/common/AppText';
import { motion, timing } from '@/src/constants/motion';
import { fonts, palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { isMatch } from '@/src/lesson/interactive';
import { grade } from '@/src/utils/grade';
import type { MatchScreen as MatchModel } from '@/src/lesson/model';
import { feedback } from '@/src/utils/feedback';
import ScreenIntro from '../player/ScreenIntro';
import StepDots from '../player/StepDots';
import { LessonScreenProps } from '../types';

const DEPTH = 5;
const LIFT = 3;
const SHAKE = 6;
const CELL_MIN = 64;
// Mauvaise paire : rouge le temps du tremblement et d'un clignement
const WRONG_SHOWN = motion.shake + motion.state;

type Side = 'left' | 'right';
type Pick = { side: Side; id: string };
type CellState = 'idle' | 'picked' | 'found' | 'wrong';

// match — associer. On touche un élément d'une colonne puis un de l'autre.
// Bonne paire : les deux passent en vert avec une coche et se verrouillent.
// Mauvaise : elles clignotent en rouge et tremblent, puis se libèrent. Pas de
// « Valider » : la dernière paire ouvre la feuille. Réussi avec au plus
// screen.maxErrors erreurs. Réponse : { errors, found }.
export default function MatchScreen({ screen, answered, onDraftChange }: LessonScreenProps<MatchModel>) {
  const { pairs, rightOrder } = screen;

  const [picked, setPicked] = useState<Pick | null>(null);
  const [found, setFound] = useState<string[]>([]);
  const [errors, setErrors] = useState(0);
  const [wrong, setWrong] = useState<{ left: string; right: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  // Toutes les paires trouvées : le lecteur ouvre la feuille
  useEffect(() => {
    if (found.length !== pairs.length) return;
    onDraftChange({
      raw: { errors, found },
      correct: grade(screen.source, { errors, found }) === true,
      correctText: null,
      explanation:
        errors === 0 ? 'Toutes les paires du premier coup.' : `${errors} ${errors >= 2 ? 'erreurs' : 'erreur'} en chemin.`,
      autoSubmit: true,
    });
  }, [found, errors, pairs.length, screen, onDraftChange]);

  const tap = (side: Side, id: string) => {
    if (answered || found.includes(id) || wrong) return;
    if (!picked || picked.side === side) {
      feedback.pick();
      setPicked(picked?.side === side && picked.id === id ? null : { side, id });
      return;
    }
    const left = side === 'left' ? id : picked.id;
    const right = side === 'right' ? id : picked.id;
    setPicked(null);
    if (isMatch(left, right)) {
      feedback.match();
      setFound((prev) => [...prev, left]);
    } else {
      feedback.mismatch();
      setErrors((n) => n + 1);
      setWrong({ left, right });
      timer.current = setTimeout(() => setWrong(null), WRONG_SHOWN);
    }
  };

  const stateOf = (side: Side, id: string): CellState => {
    if (found.includes(id)) return 'found';
    if (wrong && wrong[side] === id) return 'wrong';
    if (picked?.side === side && picked.id === id) return 'picked';
    return 'idle';
  };

  return (
    <View style={styles.wrap}>
      <ScreenIntro screen={screen} />

      <View style={styles.center}>
        <StepDots
          steps={pairs.map((_, i) => (i < found.length ? 'right' : 'todo'))}
          accessibilityLabel={`${found.length} ${found.length >= 2 ? 'paires trouvées' : 'paire trouvée'} sur ${pairs.length}`}
        />
        <View style={styles.columns}>
          <View style={[styles.column, styles.words]}>
            {pairs.map((p) => (
              <MatchCell key={p.id} text={p.left} state={stateOf('left', p.id)} disabled={answered} onPress={() => tap('left', p.id)} />
            ))}
          </View>
          <View style={[styles.column, styles.definitions]}>
            {rightOrder.map((id) => (
              <MatchCell
                key={id}
                text={pairs.find((p) => p.id === id)?.right ?? ''}
                state={stateOf('right', id)}
                disabled={answered}
                onPress={() => tap('right', id)}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

// Élément en relief : or et soulevé quand on l'a touché, vert et verrouillé
// avec une coche quand sa paire est trouvée, rouge et tremblant quand la
// paire est fausse (couleur jamais seule : coche, croix)
function MatchCell({ text, state, disabled, onPress }: { text: string; state: CellState; disabled: boolean; onPress: () => void }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const lift = useSharedValue(0);
  const shake = useSharedValue(0);

  useEffect(() => {
    lift.set(reduced ? (state === 'picked' ? 1 : 0) : withTiming(state === 'picked' ? 1 : 0, timing(motion.tap)));
    if (state === 'wrong' && !reduced) {
      const quarter = timing(motion.shake / 4);
      shake.set(withSequence(withTiming(SHAKE, quarter), withTiming(-SHAKE, quarter), withTiming(SHAKE / 2, quarter), withTiming(0, quarter)));
    }
  }, [state, reduced, lift, shake]);

  const moveStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }, { translateY: -LIFT * lift.get() }] }));

  const look = {
    idle: { border: colors.optionBorder, tint: 'transparent', edge: colors.optionEdge },
    picked: { border: colors.gold, tint: colors.goldSoft, edge: colors.goldDeep },
    found: { border: colors.success, tint: colors.successSoft, edge: colors.successDeep },
    wrong: { border: colors.error, tint: colors.dangerSoft, edge: colors.dangerDeep },
  }[state];
  const locked = state === 'found';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || locked}
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityState={{ selected: state === 'picked', disabled: disabled || locked }}
      accessibilityHint={locked ? 'Paire trouvée' : state === 'wrong' ? 'Pas la bonne paire' : undefined}
    >
      <Animated.View style={[styles.cellWrap, moveStyle]}>
        <View style={[styles.edge, { backgroundColor: look.edge }]} />
        <View style={[styles.cell, { backgroundColor: colors.optionFace, borderColor: look.border }]}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: look.tint }]} />
          <AppText style={styles.text}>{text}</AppText>
          {state === 'found' || state === 'wrong' ? (
            <Ionicons name={state === 'found' ? 'checkmark-circle' : 'close-circle'} size={18} color={look.border} />
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    gap: space[5],
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    gap: space[5],
  },
  columns: {
    flexDirection: 'row',
    gap: space[3],
  },
  column: {
    gap: space[3],
  },
  words: {
    flex: 0.8,
  },
  definitions: {
    flex: 1.2,
  },
  cellWrap: {
    paddingBottom: DEPTH,
  },
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: DEPTH,
    borderRadius: radius.option,
    borderCurve: 'continuous',
  },
  cell: {
    minHeight: CELL_MIN,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[3] + 2,
    paddingVertical: space[2] + 2,
    borderWidth: 2,
    borderRadius: radius.option,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  text: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    lineHeight: 20,
  },
});
