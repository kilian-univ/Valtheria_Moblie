import { useEffect, useState } from 'react';
import { Image, ImageSourcePropType, StyleSheet, View } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import AppText, { TextTone } from '@/src/components/common/AppText';
import GoldHalo from '@/src/components/common/GoldHalo';
import { durations, springs } from '@/src/constants/motion';
import { palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { useCountUp } from '@/src/hooks/useCountUp';
import { formatInteger } from '@/src/utils/format';
import { celebrate, select } from '@/src/utils/haptics';
import { ChestRarity, chestEvolution, chestLabel } from '@/src/utils/lessonPlayer';

export const CHEST_IMAGES: Record<ChestRarity, ImageSourcePropType> = {
  commun: require('@/assets/images/chests/chest-commun.webp'),
  rare: require('@/assets/images/chests/chest-rare.webp'),
  epique: require('@/assets/images/chests/chest-epique.webp'),
  legendaire: require('@/assets/images/chests/chest-legendaire.webp'),
};

const NBSP = ' '; // espace insécable
export const CHEST_SIZE = 200;
// Carré du halo : au plus 1,5 fois le coffre
const HALO = 280;
const STEP_MS = 450;
const SHAKE_DEG = 4;
const SHAKE_MS = 55;
const OPEN_POP = 1.12;
const FLASH_FROM_SCALE = 0.5;
const FLASH_TO_SCALE = 1.5;
const FLASH_PEAK = 0.45;
const FLASH_MS = 420;
// Éclats dorés du légendaire
const SPARKS = 10;
const SPARK_SIZE = 6;
const SPARK_DISTANCE = 130;
const SPARK_MS = 900;

// Libellé de la rareté, aux couleurs de la charte (ni bleu ni violet)
const LABEL_TONE: Record<ChestRarity, TextTone> = {
  commun: 'subtitle',
  rare: 'text',
  epique: 'gold',
  legendaire: 'gold',
};

type ChestRevealProps = {
  rarity: ChestRarity;
  amount: number;
};

// Ouverture d'un coffre, comme sur le site : il apparaît en commun, monte de
// rareté en rareté jusqu'à la sienne (tremblement + vibration à chaque
// palier), puis s'ouvre (éclat, libellé, montant qui défile).
// Animations réduites : coffre de la bonne rareté, ouvert, montant final.
export default function ChestReveal({ rarity, amount }: ChestRevealProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const [steps] = useState(() => chestEvolution(rarity));

  const [stage, setStage] = useState(reduced ? steps.length - 1 : 0);
  const [opened, setOpened] = useState(reduced);

  const rotate = useSharedValue(0);
  const pop = useSharedValue(1);
  const flashOpacity = useSharedValue(0);
  const flashScale = useSharedValue(FLASH_FROM_SCALE);
  const reveal = useSharedValue(reduced ? 1 : 0);
  const sparks = useSharedValue(0);

  // Paliers puis ouverture
  useEffect(() => {
    if (reduced) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    steps.forEach((_, i) => {
      if (i === 0) return;
      timers.push(
        setTimeout(() => {
          setStage(i);
          select();
          rotate.set(
            withSequence(
              withTiming(-SHAKE_DEG, { duration: SHAKE_MS }),
              withTiming(SHAKE_DEG, { duration: SHAKE_MS * 2 }),
              withTiming(-SHAKE_DEG / 2, { duration: SHAKE_MS * 1.5 }),
              withTiming(0, { duration: SHAKE_MS })
            )
          );
        }, i * STEP_MS)
      );
    });
    timers.push(
      setTimeout(() => {
        setOpened(true);
        celebrate();
        pop.set(withSequence(withTiming(OPEN_POP, { duration: durations.pressIn }), withSpring(1, springs.celebrate)));
        flashScale.set(withTiming(FLASH_TO_SCALE, { duration: FLASH_MS }));
        flashOpacity.set(
          withSequence(
            withTiming(FLASH_PEAK, { duration: FLASH_MS / 3 }),
            withTiming(0, { duration: (FLASH_MS * 2) / 3 })
          )
        );
        reveal.set(withTiming(1, { duration: durations.enterOpacity }));
        sparks.set(withTiming(1, { duration: SPARK_MS }));
      }, steps.length * STEP_MS)
    );
    return () => timers.forEach(clearTimeout);
  }, [reduced, steps, rotate, pop, flashOpacity, flashScale, reveal, sparks]);

  // Le montant défile une fois le coffre ouvert
  const shownAmount = Math.round(useCountUp(opened ? amount : 0));

  const chestStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.get()}deg` }, { scale: pop.get() }],
  }));
  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.get(),
    transform: [{ scale: flashScale.get() }],
  }));
  const revealStyle = useAnimatedStyle(() => ({ opacity: reveal.get() }));

  const current = steps[stage];
  const legendary = rarity === 'legendaire';

  return (
    <View style={styles.wrap} accessible accessibilityLabel={`${chestLabel(rarity)} : ${amount} Vals`}>
      <View style={styles.haloBox} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {legendary && opened ? (
          <Animated.View style={[StyleSheet.absoluteFill, revealStyle]}>
            <GoldHalo />
          </Animated.View>
        ) : null}

        <Animated.View
          pointerEvents="none"
          style={[styles.flash, { backgroundColor: colors.gold }, flashStyle]}
        />

        {legendary && opened && !reduced ? (
          <View pointerEvents="none" style={styles.sparks}>
            {Array.from({ length: SPARKS }, (_, i) => (
              <Spark key={i} index={i} progress={sparks} color={colors.gold} />
            ))}
          </View>
        ) : null}

        <Animated.View style={chestStyle}>
          <Image source={CHEST_IMAGES[current]} resizeMode="contain" style={styles.chest} />
        </Animated.View>
      </View>

      <Animated.View style={[styles.texts, revealStyle]}>
        <AppText variant="sectionLabel" tone={LABEL_TONE[rarity]} style={styles.center}>
          {chestLabel(rarity)}
        </AppText>
        <AppText variant="hero" tone="gold" style={styles.center}>
          {`+${NBSP}${formatInteger(shownAmount)}${NBSP}Vals`}
        </AppText>
      </Animated.View>
    </View>
  );
}

// Un éclat doré qui part du centre et s'éteint en s'éloignant
function Spark({ index, progress, color }: { index: number; progress: SharedValue<number>; color: string }) {
  const angle = (index / SPARKS) * Math.PI * 2;
  const style = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: p < 1 ? 1 - p : 0,
      transform: [
        { translateX: Math.cos(angle) * SPARK_DISTANCE * p },
        { translateY: Math.sin(angle) * SPARK_DISTANCE * p },
        { scale: 1 - p * 0.5 },
      ],
    };
  });
  return <Animated.View style={[styles.spark, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: space[4],
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
  flash: {
    position: 'absolute',
    width: CHEST_SIZE,
    height: CHEST_SIZE,
    borderRadius: radius.pill,
  },
  sparks: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spark: {
    position: 'absolute',
    width: SPARK_SIZE,
    height: SPARK_SIZE,
    borderRadius: radius.pill,
  },
  texts: {
    alignItems: 'center',
    gap: space[2],
  },
  center: {
    textAlign: 'center',
  },
});
