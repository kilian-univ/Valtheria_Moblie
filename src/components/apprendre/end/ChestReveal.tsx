import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ImageSourcePropType, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';

import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import GoldHalo from '@/src/components/common/GoldHalo';
import ValsCoin from '@/src/components/common/ValsCoin';
import { loops, motion, springs, timing } from '@/src/constants/motion';
import { fonts, palette, radius, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { useCountUp } from '@/src/hooks/useCountUp';
import { formatInteger } from '@/src/utils/format';
import { celebrate, select } from '@/src/utils/haptics';
import { CHEST_RARITIES, ChestRarity, chestEvolution, chestLabel } from '@/src/utils/lessonPlayer';

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

const NBSP = ' ';
export const CHEST_SIZE = 200;
// Pièce à côté du montant (« + X Vals »)
export const COIN_LG = 44;
// Carré du halo et des rayons : au plus 1,5 fois le coffre
const HALO = 290;
const CLOSED_TILT = -4;
const SHAKE_DEG = 5;
const BREATH_SCALE = 1.03;
const OPEN_POP = 1.1;
const FLASH_PEAK = 0.3;
const RAYS = 9;
const RAY_WIDTH = 10;
const RAY_OPACITY = 0.35;
const TITLE_SIZE = 30;
const AMOUNT_SIZE = 44;
// Étoiles autour du coffre ouvert : position (fraction du carré), taille
const STARS = [
  { x: 0.16, y: 0.22, size: 16 },
  { x: 0.84, y: 0.18, size: 20 },
  { x: 0.1, y: 0.62, size: 12 },
  { x: 0.9, y: 0.58, size: 14 },
  { x: 0.5, y: 0.04, size: 12 },
];

const RARITY_NAMES: Record<ChestRarity, string> = {
  commun: 'COMMUN',
  rare: 'RARE',
  epique: 'ÉPIQUE',
  legendaire: 'LÉGENDAIRE',
};

type Phase = 'climb' | 'ready' | 'open';

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

// Le coffre : fermé, légèrement penché sous un halo, il monte en rareté sous
// les yeux (450 ms par palier, tremblement et cran), puis attend en
// respirant. Un toucher sur lui ou sur « Ouvrir le coffre » l'ouvre : coffre
// ouvert en fondu, éclat, rayons dorés, étoiles, vibration de fête, puis le
// montant qui défile. Animations réduites : coffre de la bonne rareté déjà
// ouvert, montant final.
export default function ChestReveal({ rarity, amount, total, firstName, surprise = false, onDone }: ChestRevealProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const [steps] = useState(() => (surprise ? [rarity] : chestEvolution(rarity)));

  const [phase, setPhase] = useState<Phase>(reduced ? 'open' : steps.length > 1 ? 'climb' : 'ready');
  const [stage, setStage] = useState(reduced ? steps.length - 1 : 0);
  const current = steps[stage];
  const name = firstName?.trim();

  const tilt = useSharedValue(reduced ? 0 : CLOSED_TILT);
  const breath = useSharedValue(1);
  const pop = useSharedValue(1);
  const flash = useSharedValue(0);
  const opened = useSharedValue(reduced ? 1 : 0);
  const rays = useSharedValue(reduced ? 1 : 0);

  // Montée en rareté, palier par palier
  useEffect(() => {
    if (phase !== 'climb') return;
    const timers = steps.slice(1).map((_, i) =>
      setTimeout(() => {
        setStage(i + 1);
        select();
        const quarter = timing(motion.tap / 2);
        tilt.set(
          withSequence(
            withTiming(CLOSED_TILT - SHAKE_DEG, quarter),
            withTiming(CLOSED_TILT + SHAKE_DEG, quarter),
            withTiming(CLOSED_TILT - SHAKE_DEG / 2, quarter),
            withTiming(CLOSED_TILT, quarter)
          )
        );
      }, (i + 1) * motion.chestStep)
    );
    timers.push(setTimeout(() => setPhase('ready'), steps.length * motion.chestStep));
    return () => timers.forEach(clearTimeout);
  }, [phase, steps, tilt]);

  // En attente : le coffre respire doucement
  useEffect(() => {
    if (phase !== 'ready' || reduced) return;
    const half = { duration: loops.breath / 2, easing: Easing.inOut(Easing.sin) };
    breath.set(withRepeat(withSequence(withTiming(BREATH_SCALE, half), withTiming(1, half)), -1));
  }, [phase, reduced, breath]);

  const open = () => {
    if (phase === 'open') return;
    setStage(steps.length - 1);
    setPhase('open');
    celebrate();
    breath.set(withTiming(1, timing(motion.state)));
    tilt.set(withTiming(0, timing(motion.state)));
    opened.set(withTiming(1, timing(motion.state)));
    pop.set(withSequence(withTiming(OPEN_POP, timing(motion.tap)), withSpring(1, springs.celebrate)));
    flash.set(withSequence(withTiming(FLASH_PEAK, timing(motion.state)), withTiming(0, timing(motion.max))));
    rays.set(withTiming(1, timing(motion.max)));
  };

  // Le montant défile une fois le coffre ouvert
  const shownAmount = Math.round(useCountUp(phase === 'open' ? amount : 0, { delay: reduced ? 0 : motion.sheet }));
  const counted = shownAmount === amount;

  const chestStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${tilt.get()}deg` }, { scale: breath.get() * pop.get() }],
  }));
  const closedStyle = useAnimatedStyle(() => ({ opacity: 1 - opened.get() }));
  const openStyle = useAnimatedStyle(() => ({ opacity: opened.get() }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.get() }));
  const raysStyle = useAnimatedStyle(() => ({ opacity: rays.get(), transform: [{ scale: 0.7 + 0.3 * rays.get() }] }));

  const isOpen = phase === 'open';

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

        <Pressable
          onPress={open}
          disabled={isOpen}
          accessibilityRole="button"
          accessibilityLabel={isOpen ? `${surprise ? 'Coffre surprise' : chestLabel(rarity)} ouvert` : 'Ouvrir le coffre'}
          style={styles.haloBox}
        >
          <GoldHalo />
          <Animated.View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[StyleSheet.absoluteFill, raysStyle]}
          >
            <Rays color={colors.gold} />
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.flash, { backgroundColor: colors.gold }, flashStyle]} />
          <Animated.View style={chestStyle}>
            <Animated.Image source={CHEST_IMAGES[current]} resizeMode="contain" style={[styles.chest, closedStyle]} />
            {/* Toujours monté (image prête) ; visible à l'ouverture */}
            <Animated.Image source={CHEST_OPEN_IMAGES[rarity]} resizeMode="contain" style={[styles.chest, styles.overlay, openStyle]} />
          </Animated.View>
          {isOpen && !reduced ? STARS.map((star, i) => <Star key={i} {...star} index={i} color={colors.gold} />) : null}
        </Pressable>

        {surprise ? null : <RarityLadder stage={CHEST_RARITIES.indexOf(current)} />}

        {isOpen ? (
          <View style={styles.texts} accessible accessibilityLabel={`${amount} Vals${total !== null ? `. Tu en as maintenant ${total}.` : ''}`}>
            <View style={styles.amountRow}>
              <ValsCoin size={COIN_LG} />
              <AppText tone="gold" maxFontSizeMultiplier={1.2} style={styles.amount}>
                {`+${NBSP}${formatInteger(shownAmount)}${NBSP}Vals`}
              </AppText>
            </View>
            {total !== null && counted ? (
              <AppText variant="body" tone="subtitle" style={styles.centerText}>
                Tu en as maintenant {formatInteger(total)}.
              </AppText>
            ) : null}
          </View>
        ) : (
          <AppText variant="callout" tone="subtitle" style={styles.centerText}>
            {surprise ? 'Touche-le pour l’ouvrir' : 'Il monte en rareté… touche-le pour l’ouvrir'}
          </AppText>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {isOpen ? <Button label="Super" onPress={onDone} /> : <Button label="Ouvrir le coffre" onPress={open} silent />}
      </View>
    </View>
  );
}

// Échelle de rareté : atteintes en or pâle, l'actuelle en or plein, les
// suivantes en contour
function RarityLadder({ stage }: { stage: number }) {
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
        return (
          <View key={r} style={[styles.rung, { backgroundColor: look.backgroundColor, borderColor: look.borderColor }]}>
            <AppText maxFontSizeMultiplier={1.2} style={[styles.rungText, { color: look.color }]}>
              {RARITY_NAMES[r]}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

// Rayons dorés qui partent du centre du coffre
function Rays({ color }: { color: string }) {
  const c = HALO / 2;
  return (
    <Svg width={HALO} height={HALO}>
      {Array.from({ length: RAYS }, (_, i) => {
        // Éventail vers le haut, de 200° à 340°
        const angle = ((200 + (140 * i) / (RAYS - 1)) * Math.PI) / 180;
        return (
          <Line
            key={i}
            x1={c}
            y1={c}
            x2={c + Math.cos(angle) * c}
            y2={c + Math.sin(angle) * c}
            stroke={color}
            strokeWidth={RAY_WIDTH}
            strokeLinecap="round"
            strokeOpacity={RAY_OPACITY}
          />
        );
      })}
    </Svg>
  );
}

// Une étoile qui apparaît d'un petit bond autour du coffre ouvert
function Star({ x, y, size, index, color }: { x: number; y: number; size: number; index: number; color: string }) {
  const scale = useSharedValue(0);
  useEffect(() => {
    scale.set(withDelay(motion.state + index * motion.stagger * 2, withSpring(1, springs.celebrate)));
  }, [index, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }], opacity: Math.min(1, scale.get()) }));
  return (
    <Animated.View pointerEvents="none" style={[styles.star, { left: x * HALO - size / 2, top: y * HALO - size / 2 }, style]}>
      <Ionicons name="star" size={size} color={color} />
    </Animated.View>
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
    width: CHEST_SIZE,
    height: CHEST_SIZE,
    borderRadius: radius.pill,
  },
  star: {
    position: 'absolute',
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
