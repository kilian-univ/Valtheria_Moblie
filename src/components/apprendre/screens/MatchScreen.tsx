import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { isMatch, matchPassed } from '@/src/lesson/interactive';
import type { MatchScreen as MatchModel } from '@/src/lesson/model';
import { error as errorHaptic, select, success as successHaptic } from '@/src/utils/haptics';
import ScreenIntro from '../player/ScreenIntro';
import { LessonScreenProps } from '../types';

const FLASH = 450;

type Side = 'left' | 'right';
type Pick = { side: Side; id: string };

// match — associer. On touche un élément d'une colonne puis un de l'autre.
// Bonne paire : les deux se verrouillent en vert (vibration). Mauvaise :
// clignotement rouge. Réussi avec au plus screen.maxErrors erreurs.
// Réponse : { errors, found }.
export default function MatchScreen({ screen, answered, onDraftChange }: LessonScreenProps<MatchModel>) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { pairs, rightOrder } = screen;

  const [picked, setPicked] = useState<Pick | null>(null);
  const [found, setFound] = useState<string[]>([]);
  const [errors, setErrors] = useState(0);
  const [flash, setFlash] = useState<{ left: string; right: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Toutes les paires trouvées : le lecteur ouvre la feuille
  useEffect(() => {
    if (found.length !== pairs.length) return;
    onDraftChange({
      raw: { errors, found },
      correct: matchPassed(screen, found.length, errors),
      correctText: null,
      explanation:
        errors === 0 ? 'Toutes les paires du premier coup.' : `${errors} ${errors >= 2 ? 'erreurs' : 'erreur'} en chemin.`,
      autoSubmit: true,
    });
  }, [found, errors, pairs.length, screen, onDraftChange]);

  const tap = (side: Side, id: string) => {
    if (answered || found.includes(id) || flash) return;
    if (!picked || picked.side === side) {
      select();
      setPicked({ side, id });
      return;
    }
    const left = side === 'left' ? id : picked.id;
    const right = side === 'right' ? id : picked.id;
    setPicked(null);
    if (isMatch(left, right)) {
      successHaptic();
      setFound((prev) => [...prev, left]);
    } else {
      errorHaptic();
      setErrors((n) => n + 1);
      setFlash({ left, right });
      timer.current = setTimeout(() => setFlash(null), FLASH);
    }
  };

  const look = (side: Side, id: string) => {
    if (found.includes(id)) return { border: colors.success, tint: colors.successSoft };
    if (flash && flash[side] === id) return { border: colors.error, tint: colors.dangerSoft };
    if (picked?.side === side && picked.id === id) return { border: colors.gold, tint: colors.goldSoft };
    return { border: colors.controlBorder, tint: 'transparent' };
  };

  const cell = (side: Side, id: string, text: string) => {
    const { border, tint } = look(side, id);
    const locked = found.includes(id);
    return (
      <Pressable
        key={id}
        onPress={() => tap(side, id)}
        disabled={answered || locked}
        accessibilityRole="button"
        accessibilityLabel={text}
        accessibilityState={{ selected: picked?.side === side && picked.id === id, disabled: answered || locked }}
        accessibilityHint={locked ? 'Paire trouvée' : undefined}
        style={[styles.cell, { borderColor: border, backgroundColor: colors.background }]}
      >
        <View style={[styles.tint, { backgroundColor: tint }]} />
        <AppText variant={side === 'left' ? 'bodyMedium' : 'callout'}>{text}</AppText>
      </Pressable>
    );
  };

  return (
    <View style={styles.wrap}>
      <ScreenIntro screen={screen} hint="Touche un mot, puis sa définition." />
      <View style={styles.columns}>
        <View style={[styles.column, styles.left]}>{pairs.map((p) => cell('left', p.id, p.left))}</View>
        <View style={styles.column}>
          {rightOrder.map((id) => cell('right', id, pairs.find((p) => p.id === id)?.right ?? ''))}
        </View>
      </View>
      <AppText variant="caption" tone="subtitle" style={styles.center} accessibilityLiveRegion="polite">
        {found.length} sur {pairs.length} paires
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space[6],
  },
  columns: {
    flexDirection: 'row',
    gap: space[3],
  },
  column: {
    flex: 1,
    gap: space[3],
  },
  left: {
    flex: 0.8,
  },
  cell: {
    minHeight: 64,
    justifyContent: 'center',
    padding: space[3],
    borderWidth: 2,
    borderRadius: radius.option,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  tint: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  center: {
    textAlign: 'center',
  },
});
