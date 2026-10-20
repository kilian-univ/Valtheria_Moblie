import { ReactNode, useEffect, useEffectEvent, useRef, useState } from 'react';
import { ImageSourcePropType, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import GoldHalo from '@/src/components/common/GoldHalo';
import ValsCoin from '@/src/components/common/ValsCoin';
import { motion, springs, timing } from '@/src/constants/motion';
import { chestLight, fonts, palette, radius, space, titleLetterSpacing, withOpacity } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { useCountUp } from '@/src/hooks/useCountUp';
import { formatInteger } from '@/src/utils/format';
import {
  CHEST_AFTER_OPEN,
  CHEST_COUNT_MS,
  CHEST_FLASH_MS,
  CHEST_FOUNTAIN_MS,
  chestAnticipation,
  growingShake,
} from '@/src/utils/chestTimeline';
import { feedback } from '@/src/utils/feedback';
import { tap } from '@/src/utils/haptics';
import { ChestFountain, ChestLight, LidLight } from './ChestEffects';
import { CHEST_RARITIES, ChestRarity, chestEvolution, chestLabel } from '@/src/utils/lessonPlayer';
import { NBSP } from '@/src/utils/frenchSpaces';

export const CHEST_IMAGES: Record<ChestRarity, ImageSourcePropType> = {
  commun: require('@/assets/images/chests/chest-commun.webp'),
  rare: require('@/assets/images/chests/chest-rare.webp'),
  epique: require('@/assets/images/chests/chest-epique.webp'),
  legendaire: require('@/assets/images/chests/chest-legendaire.webp'),
};

// Coffres ouverts : même cadrage que les fermés, corps recalé dessus
// (ils se superposent exactement pendant le fondu enchaîné)
export const CHEST_OPEN_IMAGES: Record<ChestRarity, ImageSourcePropType> = {
  commun: require('@/assets/images/chests/chest-commun-ouvert.webp'),
  rare: require('@/assets/images/chests/chest-rare-ouvert.webp'),
  epique: require('@/assets/images/chests/chest-epique-ouvert.webp'),
  legendaire: require('@/assets/images/chests/chest-legendaire-ouvert.webp'),
};

export const CHEST_SIZE = 200;
// Pièce à côté du montant (« + X Vals »)
export const COIN_LG = 44;
// Carré du coffre et de son halo
const HALO = 290;
// Rayons de la lumière douce : un peu plus larges que le halo
const LIGHT = 340;
const CLOSED_TILT = -4;
// Tremblement de l'anticipation : de plus en plus fort (degrés), oscillation (ms)
const SHAKE_MIN = 1.5;
const SHAKE_MAX = 7;
const SHAKE_PERIOD = 90;
// Attente : le coffre respire, la lumière pulse dans les fentes (de LEAK_LOW à 1)
const BREATH_MS = 2400;
const BREATH_SCALE = 1.03;
const LEAK_LOW = 0.45;
// Rebond à l'ouverture (squash) : écrasé puis étiré
const SQUASH_X = 1.12;
const SQUASH_Y = 0.86;
// Tampon de la rareté : arrive à 1,6, frappe à 0,94, se pose à 1
const STAMP_FROM = 1.6;
const STAMP_HIT = 0.94;
const TITLE_SIZE = 30;
const AMOUNT_SIZE = 44;
// Départ de la gerbe : le haut du coffre, sous le couvercle
const FOUNTAIN_FROM = HALO / 2 - 24;

const RARITY_NAMES: Record<ChestRarity, string> = {
  commun: 'COMMUN',
  rare: 'RARE',
  epique: 'ÉPIQUE',
  legendaire: 'LÉGENDAIRE',
};

type Phase = 'anticipation' | 'ready' | 'open';

type ChestRevealProps = {
  rarity: ChestRarity;
  amount: number;
  // Vals après la leçon, s'ils sont connus (« Tu en as maintenant … »)
  total: number | null;
  firstName?: string | null;
  // Coffre surprise : pas d'échelle de rareté, le même déroulé
  surprise?: boolean;
  onDone: () => void;
};

// Le coffre, en trois temps (utils/chestTimeline) :
// 1. anticipation, toute seule : fermé, il tremble de plus en plus en
//    montant en rareté (un cran par palier), puis la lumière filtre par les
//    fentes du couvercle ; ensuite il attend (il respire, la lumière pulse
//    dans les fentes) qu'on le touche, ou « Ouvrir le coffre » ;
// 2. moment fort, au toucher : il s'ouvre avec un léger rebond, un flash
//    blanc doré de 120 ms et une gerbe de pièces et d'étincelles en arc ;
// 3. retombée (environ 1,5 s en tout) : les pièces retombent et
//    s'estompent, la rareté s'inscrit d'un petit tampon, le montant défile
//    (son des pièces), puis le coffre reste posé dans une lumière douce de la
//    couleur de sa rareté (halo qui respire, rayons flous qui tournent en 20 s).
// Un toucher pendant la retombée passe directement à la fin ; un toucher
// pendant la montée ouvre tout de suite. Animations réduites : coffre fermé
// de la bonne rareté, ouvert directement au toucher, lumière fixe, sans
// gerbe ni flash.
export default function ChestReveal({ rarity, amount, total, firstName, surprise = false, onDone }: ChestRevealProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const [steps] = useState(() => (surprise ? [rarity] : chestEvolution(rarity)));
  const [plan] = useState(() => chestAnticipation(steps.length));
  const light = chestLight[rarity];

  const [phase, setPhase] = useState<Phase>(reduced ? 'ready' : 'anticipation');
  const [stage, setStage] = useState(reduced ? steps.length - 1 : 0);
  // Retombée : rareté inscrite, montant qui défile, déroulé fini
  const [stamped, setStamped] = useState(false);
  const [counting, setCounting] = useState(false);
  const [settled, setSettled] = useState(false);
  const [fountain, setFountain] = useState(false);
  const current = steps[stage];
  const name = firstName?.trim();

  const tilt = useSharedValue(reduced ? 0 : CLOSED_TILT);
  const breath = useSharedValue(1);
  const squashX = useSharedValue(1);
  const squashY = useSharedValue(1);
  const opened = useSharedValue(0);
  const leak = useSharedValue(0);
  const flash = useSharedValue(0);
  const glow = useSharedValue(0);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const played = useRef({ open: false, coins: false });
  const at = (ms: number, run: () => void) => timers.current.push(setTimeout(run, ms));
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  // Sons de l'ouverture et des pièces : une fois chacun, même si on passe
  const playOpen = () => {
    if (played.current.open) return;
    played.current.open = true;
    feedback.chestOpen();
  };
  const playCoins = () => {
    if (played.current.coins || amount <= 0) return;
    played.current.coins = true;
    feedback.coins();
  };

  // En attente : le coffre respire, la lumière pulse dans les fentes
  const wait = () => {
    setPhase('ready');
    const half = { duration: BREATH_MS / 2, easing: Easing.inOut(Easing.sin) };
    breath.set(withRepeat(withSequence(withTiming(BREATH_SCALE, half), withTiming(1, half)), -1));
    leak.set(withRepeat(withSequence(withTiming(LEAK_LOW, half), withTiming(1, half)), -1));
  };

  // 1. Anticipation, toute seule : tremblement qui grandit, paliers de
  // rareté, lumière qui filtre, puis l'attente. Une seule fois, à l'arrivée
  // (useEffectEvent : les valeurs du moment, sans relancer l'effet)
  const anticipate = useEffectEvent((): (() => void) | undefined => {
    if (reduced) return;
    const shakes = growingShake(plan.ready, SHAKE_PERIOD, SHAKE_MIN, SHAKE_MAX);
    const half = timing(SHAKE_PERIOD / 2);
    tilt.set(
      withSequence(
        ...shakes.flatMap((amp) => [withTiming(CLOSED_TILT - amp, half), withTiming(CLOSED_TILT + amp, half)]),
        withTiming(CLOSED_TILT, timing(motion.tap))
      )
    );
    plan.steps.forEach((ms, i) =>
      at(ms, () => {
        setStage(i + 1);
        // Un peu plus aigu à chaque palier
        feedback.chestStep(i + 1);
      })
    );
    at(plan.leak, () => leak.set(withTiming(1, timing(motion.screen))));
    at(plan.ready, wait);
    return clearTimers;
  });
  useEffect(() => anticipate(), []);

  // Fin de la retombée : coffre ouvert dans sa lumière, rareté inscrite,
  // montant final, sans rejouer ce qui a déjà sonné
  const finish = () => {
    clearTimers();
    tilt.set(0);
    breath.set(1);
    leak.set(0);
    flash.set(0);
    squashX.set(1);
    squashY.set(1);
    opened.set(1);
    glow.set(reduced ? 1 : withTiming(1, timing(motion.state)));
    setStage(steps.length - 1);
    setPhase('open');
    setFountain(false);
    setStamped(true);
    setCounting(true);
    setSettled(true);
    playOpen();
    playCoins();
  };

  // 2 et 3. Le toucher : moment fort puis retombée (un toucher pendant la
  // montée ouvre tout de suite ; pendant la retombée, passe à la fin)
  const open = () => {
    if (settled) return;
    if (phase === 'open') {
      finish();
      return;
    }
    if (reduced) {
      finish();
      return;
    }
    clearTimers();
    setStage(steps.length - 1);
    setPhase('open');
    setFountain(true);
    playOpen();
    tilt.set(withTiming(0, timing(motion.tap)));
    breath.set(withTiming(1, timing(motion.tap)));
    leak.set(withTiming(0, timing(CHEST_FLASH_MS)));
    opened.set(withTiming(1, { duration: 60 }));
    squashX.set(withSequence(withTiming(SQUASH_X, timing(70)), withSpring(1, springs.celebrate)));
    squashY.set(withSequence(withTiming(SQUASH_Y, timing(70)), withSpring(1, springs.celebrate)));
    flash.set(withSequence(withTiming(1, { duration: CHEST_FLASH_MS / 3 }), withTiming(0, timing((CHEST_FLASH_MS * 2) / 3))));
    glow.set(withTiming(1, timing(motion.max)));
    at(CHEST_AFTER_OPEN.stamp, () => {
      setStamped(true);
      tap();
    });
    at(CHEST_AFTER_OPEN.count, () => {
      setCounting(true);
      playCoins();
    });
    at(CHEST_FOUNTAIN_MS, () => setFountain(false));
    at(CHEST_AFTER_OPEN.end, () => setSettled(true));
  };

  // Le montant défile pendant la retombée ; passé : le montant final
  const rolling = Math.round(useCountUp(counting ? amount : 0, { duration: CHEST_COUNT_MS }));
  const shownAmount = settled ? amount : rolling;

  const chestStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${tilt.get()}deg` },
      { scaleX: squashX.get() * breath.get() },
      { scaleY: squashY.get() * breath.get() },
    ],
  }));
  const closedStyle = useAnimatedStyle(() => ({ opacity: 1 - opened.get() }));
  const openStyle = useAnimatedStyle(() => ({ opacity: opened.get() }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.get() }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.get() }));

  const isOpen = phase === 'open';

  return (
    <Pressable style={styles.screen} onPress={open} disabled={settled} accessible={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} scrollEnabled={settled || !isOpen}>
        <View style={styles.texts}>
          <AppText variant="sectionLabel" style={styles.kicker}>
            {isOpen ? (surprise ? 'COFFRE SURPRISE' : chestLabel(rarity).toUpperCase()) : surprise ? 'UNE SURPRISE' : 'TA RÉCOMPENSE'}
          </AppText>
          <AppText accessibilityRole="header" maxFontSizeMultiplier={1.3} style={styles.title}>
            {isOpen
              ? surprise
                ? 'Celui-là, tu ne l’attendais pas.'
                : name
                  ? `Joli coup, ${name}${NBSP}!`
                  : `Joli coup${NBSP}!`
              : surprise
                ? `Un coffre surprise${NBSP}!`
                : 'Un coffre pour toi'}
          </AppText>
        </View>

        <View
          style={styles.haloBox}
          accessible
          accessibilityLabel={isOpen ? `${surprise ? 'Coffre surprise' : chestLabel(rarity)} ouvert` : 'Coffre fermé'}
        >
          {/* Lumière douce de la rareté (rayons fondus, halo qui respire) */}
          <Animated.View pointerEvents="none" style={[styles.lightBox, glowStyle]}>
            <ChestLight size={LIGHT} color={light.color} strength={light.strength} still={reduced} />
          </Animated.View>
          <Animated.View style={chestStyle}>
            <Animated.Image source={CHEST_IMAGES[current]} resizeMode="contain" style={[styles.chest, closedStyle]} />
            {/* Toujours monté (image prête) ; visible à l'ouverture */}
            <Animated.Image source={CHEST_OPEN_IMAGES[rarity]} resizeMode="contain" style={[styles.chest, styles.overlay, openStyle]} />
            {reduced ? null : <LidLight size={CHEST_SIZE} color={light.color} progress={leak} />}
          </Animated.View>
          {/* Flash blanc doré, très bref */}
          <Animated.View pointerEvents="none" style={[styles.flash, flashStyle]}>
            <GoldHalo color={withOpacity(colors.ivory, 0.95)} />
          </Animated.View>
          {fountain && !reduced ? <ChestFountain originY={FOUNTAIN_FROM} /> : null}
        </View>

        {surprise ? (
          stamped ? (
            <Stamp>
              <View style={[styles.rung, { backgroundColor: colors.gold, borderColor: colors.gold }]}>
                <AppText maxFontSizeMultiplier={1.2} style={[styles.rungText, { color: colors.onGold }]}>
                  SURPRISE
                </AppText>
              </View>
            </Stamp>
          ) : null
        ) : (
          <RarityLadder stage={CHEST_RARITIES.indexOf(current)} stamped={stamped} />
        )}

        {isOpen ? (
          // Place gardée dès l'ouverture (rien ne saute), montant visible quand il défile
          <View
            style={[styles.texts, !counting && styles.waiting]}
            accessible
            accessibilityLabel={`${amount} Vals${total !== null ? `. Tu en as maintenant ${total}.` : ''}`}
          >
            <View style={styles.amountRow}>
              <ValsCoin size={COIN_LG} />
              <AppText tone="gold" maxFontSizeMultiplier={1.2} style={styles.amount}>
                {`+${NBSP}${formatInteger(shownAmount)}${NBSP}Vals`}
              </AppText>
            </View>
            {total !== null && shownAmount === amount && counting ? (
              <AppText variant="body" tone="subtitle" style={styles.centerText}>
                Tu en as maintenant {formatInteger(total)}.
              </AppText>
            ) : null}
          </View>
        ) : (
          <AppText variant="callout" tone="subtitle" style={styles.centerText}>
            {phase === 'ready' ? 'Touche le coffre pour l’ouvrir' : surprise ? 'Une surprise t’attend…' : 'Il monte en rareté…'}
          </AppText>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {settled ? (
          <Button label="Super" onPress={onDone} />
        ) : isOpen ? (
          <Button variant="text" label="Passer" onPress={finish} accessibilityHint="Montre tout de suite ce que contient le coffre" />
        ) : (
          <Button label="Ouvrir le coffre" onPress={open} silent />
        )}
      </View>
    </Pressable>
  );
}

// La rareté s'inscrit d'un petit tampon : arrive grande, frappe, se pose
function Stamp({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(reduced ? 1 : STAMP_FROM);
  const opacity = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    opacity.set(withTiming(1, timing(motion.tap)));
    scale.set(withSequence(withTiming(STAMP_HIT, timing(motion.tap)), withSpring(1, springs.press)));
  }, [reduced, scale, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ scale: scale.get() }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

// Échelle de rareté : atteintes en or pâle, l'actuelle en or plein, les
// suivantes en contour ; à la retombée, l'actuelle s'inscrit d'un tampon
function RarityLadder({ stage, stamped }: { stage: number; stamped: boolean }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  return (
    <View style={styles.ladder} accessible accessibilityLabel={`Rareté : ${RARITY_NAMES[CHEST_RARITIES[stage]].toLowerCase()}`}>
      {CHEST_RARITIES.map((r, i) => {
        const look =
          i < stage
            ? { backgroundColor: colors.goldSoft, color: colors.gold, borderColor: 'transparent' }
            : i === stage
              ? { backgroundColor: colors.gold, color: colors.onGold, borderColor: colors.gold }
              : { backgroundColor: 'transparent', color: colors.subtitle, borderColor: colors.border };
        const rung = (
          <View key={r} style={[styles.rung, { backgroundColor: look.backgroundColor, borderColor: look.borderColor }]}>
            <AppText maxFontSizeMultiplier={1.2} style={[styles.rungText, { color: look.color }]}>
              {RARITY_NAMES[r]}
            </AppText>
          </View>
        );
        return i === stage && stamped ? <Stamp key={`${r}-tampon`}>{rung}</Stamp> : rung;
      })}
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
    alignItems: 'center',
    gap: space[5],
    paddingHorizontal: space[5],
    paddingVertical: space[4],
  },
  texts: {
    alignItems: 'center',
    gap: space[2],
  },
  kicker: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.6,
    textAlign: 'center',
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
  waiting: {
    opacity: 0,
  },
  haloBox: {
    width: HALO,
    height: HALO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chest: {
    width: CHEST_SIZE,
    height: CHEST_SIZE,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  flash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Lumière douce : un peu plus large que le coffre et son halo, centrée
  lightBox: {
    position: 'absolute',
    left: (HALO - LIGHT) / 2,
    top: (HALO - LIGHT) / 2,
    width: LIGHT,
    height: LIGHT,
  },
  ladder: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space[1] + 2,
  },
  rung: {
    height: 28,
    justifyContent: 'center',
    paddingHorizontal: space[2] + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  rungText: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    flexWrap: 'wrap',
  },
  amount: {
    fontFamily: fonts.title,
    fontSize: AMOUNT_SIZE,
    lineHeight: AMOUNT_SIZE + 6,
    letterSpacing: titleLetterSpacing(AMOUNT_SIZE),
    fontVariant: ['tabular-nums'],
  },
  footer: {
    paddingHorizontal: space[5],
    paddingBottom: space[4],
  },
});
