import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import XpPill from '@/src/components/apprendre/XpPill';
import AppText from '@/src/components/common/AppText';
import GoldHalo from '@/src/components/common/GoldHalo';
import { valAccessibilityLabel, ValAvatar, ValSpeechBubble } from '@/src/components/common/ValBubble';
import { fonts, opacityDisabled, palette, reliefDepth, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { LessonStatus, LessonView } from '@/src/utils/learning';

// --- Géométrie --------------------------------------------------------------
const OFFSET_X = 95; // ronds de côté : la courbe passe à côté des titres (larges de 140)
const X_PATTERN = [0, -OFFSET_X, 0, OFFSET_X]; // centre, gauche, centre, droite…
const NODE_DONE = 64;
const NODE_CURRENT = 92;
const CURRENT_FACE = 72;
const NODE_LOCKED = 60;
const RING = 3;
const MIN_SPACING = 105; // écart vertical minimal entre deux ronds
const LABEL_WIDTH = 140;
const LABEL_GAP = 6; // rond → titre
const CLEARANCE = 12; // bas d'un titre → haut de l'élément suivant
const LINE_WIDTH = 4;
const DOTS = '0.1 10'; // avec des extrémités rondes : des points
// Halo de la leçon en cours : 1,5 fois le rond, jamais plus (voir GoldHalo)
const HALO_SIZE = NODE_CURRENT * 1.5;
const PULSE_MIN = 0.6;
const PULSE_HALF = 800; // 0,6 → 1 → 0,6 en 1,6 s
const ICON_DONE = 26;
const ICON_PLAY = 30;
const ICON_LOCK = 22;
// Val à côté de la leçon en cours
const VAL_SIZE = 64;
const VAL_GAP = 8; // bulle → Val
const VAL_BUBBLE_MAX = 150;
const VAL_BLOCK_ESTIMATE = VAL_SIZE + VAL_GAP + 72;
// Titres
const DONE_TITLE = { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 18 } as const;
const CURRENT_TITLE = {
  fontFamily: fonts.title,
  fontSize: 18,
  lineHeight: 24,
  letterSpacing: titleLetterSpacing(18),
} as const;
const LOCKED_LINE = 17;

const STATUS_LABEL: Record<LessonStatus, string> = {
  completed: 'terminée',
  current: 'en cours',
  locked: 'verrouillée',
};

function nodeSize(status: LessonStatus): number {
  return status === 'current' ? NODE_CURRENT : status === 'completed' ? NODE_DONE : NODE_LOCKED;
}

// Avant mesure : estimation de la hauteur du titre sous chaque rond
function labelEstimate(view: LessonView): number {
  if (view.status === 'current') return CURRENT_TITLE.lineHeight * 2 + LABEL_GAP + 28;
  if (view.status === 'completed') return DONE_TITLE.lineHeight * 2;
  return LOCKED_LINE * (view.isFirstLocked ? 3 : 2);
}

// Courbe d'un rond au suivant : part à l'horizontale (au-dessus du titre du
// rond de départ), puis descend à la verticale dans le rond d'arrivée.
function segment(a: { x: number; y: number }, b: { x: number; y: number }): string {
  return ` C ${b.x} ${a.y}, ${b.x} ${a.y}, ${b.x} ${b.y}`;
}

type Point = { x: number; y: number };

type LessonPathProps = {
  views: LessonView[];
  onOpen: (view: LessonView) => void;
  onLocked: (view: LessonView) => void;
  // Réplique de Val à côté de la leçon en cours (absente : pas de Val)
  valLine?: string;
  // Position verticale du rond en cours, pour y faire défiler l'écran
  onCurrentY?: (y: number) => void;
};

export default function LessonPath({ views, onOpen, onLocked, valLine, onCurrentY }: LessonPathProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const [width, setWidth] = useState(0);
  const [labelHeights, setLabelHeights] = useState<Record<number, number>>({});
  const [valBlockHeight, setValBlockHeight] = useState(VAL_BLOCK_ESTIMATE);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const labelHeight = (view: LessonView) => labelHeights[view.lesson.id] ?? labelEstimate(view);
  const measureLabel = (id: number) => (e: LayoutChangeEvent) => {
    const h = Math.ceil(e.nativeEvent.layout.height);
    if (labelHeights[id] !== h) setLabelHeights((prev) => ({ ...prev, [id]: h }));
  };

  const currentIndex = views.findIndex((v) => v.status === 'current');
  const showVal = !!valLine && currentIndex >= 0;

  // --- Positions ------------------------------------------------------------
  const centerX = width / 2;
  const points: Point[] = [];
  let y = 0;
  views.forEach((view, i) => {
    const r = nodeSize(view.status) / 2;
    const valAbove = showVal && i === currentIndex ? valBlockHeight - VAL_SIZE / 2 : 0;
    if (i === 0) {
      // Place pour le halo, et pour Val si la première leçon est en cours
      y = Math.max(r, HALO_SIZE / 2, valAbove + CLEARANCE);
    } else {
      const prev = views[i - 1];
      const prevBottom = nodeSize(prev.status) / 2 + LABEL_GAP + labelHeight(prev) + CLEARANCE;
      // Le rond (ou Val et sa bulle, au-dessus de lui) passe sous le titre précédent
      const needed = prevBottom + Math.max(r, valAbove);
      y += Math.max(MIN_SPACING, needed);
    }
    points.push({ x: centerX + X_PATTERN[i % X_PATTERN.length], y });
  });
  const lastView = views[views.length - 1];
  const height = lastView
    ? y + nodeSize(lastView.status) / 2 + LABEL_GAP + labelHeight(lastView) + CLEARANCE
    : 0;

  // --- Courbe : pleine et dorée jusqu'à la leçon en cours, pointillée après ---
  const split = currentIndex >= 0 ? currentIndex : views.length - 1;
  let solid = points.length > 0 ? `M ${points[0].x} ${points[0].y}` : '';
  for (let i = 1; i <= split; i++) solid += segment(points[i - 1], points[i]);
  let dotted = points[split] ? `M ${points[split].x} ${points[split].y}` : '';
  for (let i = split + 1; i < points.length; i++) dotted += segment(points[i - 1], points[i]);

  // --- Val : du côté opposé, là où la courbe ne passe pas --------------------
  let valSide = 1;
  if (showVal) {
    const offset = X_PATTERN[currentIndex % X_PATTERN.length];
    const prevOffset = currentIndex > 0 ? X_PATTERN[(currentIndex - 1) % X_PATTERN.length] : -OFFSET_X;
    valSide = offset !== 0 ? -Math.sign(offset) : Math.sign(prevOffset);
  }

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 ? (
        <>
          {currentIndex >= 0 ? (
            <PulsingHalo x={points[currentIndex].x} y={points[currentIndex].y} />
          ) : null}

          <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
            {dotted && split < points.length - 1 ? (
              <Path
                d={dotted}
                stroke={colors.controlBorder}
                strokeWidth={LINE_WIDTH}
                strokeLinecap="round"
                strokeDasharray={DOTS}
                fill="none"
              />
            ) : null}
            {split > 0 || currentIndex < 0 ? (
              <Path d={solid} stroke={colors.gold} strokeWidth={LINE_WIDTH} strokeLinecap="round" fill="none" />
            ) : null}
          </Svg>

          {views.map((view, i) => {
            const { x, y: cy } = points[i];
            const diameter = nodeSize(view.status);
            const r = diameter / 2;
            const locked = view.status === 'locked';
            const labelLeft = Math.min(Math.max(x - LABEL_WIDTH / 2, 0), Math.max(width - LABEL_WIDTH, 0));

            return (
              <View key={view.lesson.id} style={StyleSheet.absoluteFill} pointerEvents="box-none">
                <Pressable
                  onPress={() => (locked ? onLocked(view) : onOpen(view))}
                  onLayout={view.status === 'current' && onCurrentY ? () => onCurrentY(cy) : undefined}
                  accessibilityRole="button"
                  accessibilityLabel={`Leçon ${view.number} sur ${view.total}, ${view.lesson.title}, ${STATUS_LABEL[view.status]}`}
                  accessibilityHint={
                    view.isFirstLocked && view.previousTitle ? `Disponible après ${view.previousTitle}` : undefined
                  }
                  hitSlop={space[2]}
                  style={{ position: 'absolute', left: x - r, top: cy - r, width: diameter, height: diameter }}
                >
                  {({ pressed }) => <NodeFace status={view.status} pressed={pressed} />}
                </Pressable>

                <View
                  pointerEvents="none"
                  importantForAccessibility="no-hide-descendants"
                  accessibilityElementsHidden
                  onLayout={measureLabel(view.lesson.id)}
                  style={[styles.label, { left: labelLeft, top: cy + r + LABEL_GAP }]}
                >
                  <NodeLabel view={view} />
                </View>
              </View>
            );
          })}

          {showVal && valLine ? (
            <ValNearCurrent
              text={valLine}
              x={centerX + valSide * OFFSET_X}
              y={points[currentIndex].y}
              width={width}
              onHeight={setValBlockHeight}
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
}

// Rond d'une leçon, selon son état
function NodeFace({ status, pressed }: { status: LessonStatus; pressed: boolean }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];

  if (status === 'completed') {
    return (
      <View
        style={[
          styles.fill,
          styles.circle,
          { backgroundColor: colors.surface, borderWidth: RING, borderColor: colors.gold },
          pressed && styles.pressedScale,
        ]}
      >
        <Ionicons name="checkmark" size={ICON_DONE} color={colors.gold} />
      </View>
    );
  }

  if (status === 'current') {
    const inset = (NODE_CURRENT - CURRENT_FACE) / 2;
    return (
      <View style={styles.fill}>
        <View style={[styles.fill, styles.circle, { borderWidth: RING, borderColor: colors.goldRing }]} />
        {/* Tranche du relief, comme le bouton principal : la face s'y enfonce */}
        <View
          style={[
            styles.face,
            { top: inset + reliefDepth, left: inset, backgroundColor: colors.goldDeep },
          ]}
        />
        <View
          style={[
            styles.face,
            styles.circle,
            { top: inset, left: inset, backgroundColor: colors.gold },
            pressed && { transform: [{ translateY: reliefDepth }] },
          ]}
        >
          <Ionicons name="play" size={ICON_PLAY} color={colors.onGold} style={styles.playNudge} />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.fill,
        styles.circle,
        { backgroundColor: colors.surface, opacity: opacityDisabled },
        pressed && styles.pressedScale,
      ]}
    >
      <Ionicons name="lock-closed" size={ICON_LOCK} color={colors.subtitle} />
    </View>
  );
}

// Titre sous un rond, selon son état
function NodeLabel({ view }: { view: LessonView }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];

  if (view.status === 'current') {
    return (
      <View style={styles.currentLabel}>
        <Text maxFontSizeMultiplier={1.3} style={[CURRENT_TITLE, styles.center, { color: colors.text }]}>
          {view.lesson.title}
        </Text>
        <XpPill xp={view.lesson.xp_reward} />
      </View>
    );
  }

  if (view.status === 'completed') {
    return (
      <Text maxFontSizeMultiplier={1.6} style={[DONE_TITLE, styles.center, { color: colors.subtitle }]}>
        {view.lesson.title}
      </Text>
    );
  }

  return (
    <>
      <AppText variant="caption" style={[styles.lockedText, styles.dimmed]}>
        {view.lesson.title}
      </AppText>
      {view.isFirstLocked && view.previousTitle ? (
        <AppText variant="caption" tone="subtitle" style={styles.lockedText}>
          {`Après ${view.previousTitle}`}
        </AppText>
      ) : null}
    </>
  );
}

// Halo doré autour de la leçon en cours : pulse doucement (0,6 ↔ 1 en 1,6 s),
// immobile si l'utilisateur réduit les animations.
function PulsingHalo({ x, y }: { x: number; y: number }) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(reduced ? 1 : PULSE_MIN);

  useEffect(() => {
    if (reduced) {
      opacity.set(1);
      return;
    }
    opacity.set(
      withRepeat(
        withSequence(withTiming(1, { duration: PULSE_HALF }), withTiming(PULSE_MIN, { duration: PULSE_HALF })),
        -1
      )
    );
    return () => cancelAnimation(opacity);
  }, [reduced, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.halo,
        { left: x - HALO_SIZE / 2, top: y - HALO_SIZE / 2 },
        style,
      ]}
    >
      <GoldHalo />
    </Animated.View>
  );
}

// Val en cercle à côté de la leçon en cours, sa bulle au-dessus de lui
function ValNearCurrent({
  text,
  x,
  y,
  width,
  onHeight,
}: {
  text: string;
  x: number;
  y: number;
  width: number;
  onHeight: (h: number) => void;
}) {
  const [blockHeight, setBlockHeight] = useState(VAL_BLOCK_ESTIMATE);
  // Bulle centrée sur Val, sans jamais atteindre l'axe central de la courbe
  const bubbleWidth = Math.max(Math.min(VAL_BUBBLE_MAX, width / 2 - space[5]), VAL_SIZE);
  const left = Math.min(Math.max(x - bubbleWidth / 2, 0), Math.max(width - bubbleWidth, 0));

  return (
    <View
      accessible
      accessibilityLabel={valAccessibilityLabel(text)}
      pointerEvents="box-none"
      onLayout={(e) => {
        const h = Math.ceil(e.nativeEvent.layout.height);
        setBlockHeight(h);
        onHeight(h);
      }}
      style={[styles.valBlock, { left, width: bubbleWidth, top: y + VAL_SIZE / 2 - blockHeight }]}
    >
      <ValSpeechBubble key={text} text={text} tail="bottomLeft" bordered />
      <View style={{ marginTop: VAL_GAP, marginLeft: x - VAL_SIZE / 2 - left }}>
        <ValAvatar mood="complice" diameter={VAL_SIZE} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    borderRadius: NODE_CURRENT,
  },
  face: {
    position: 'absolute',
    width: CURRENT_FACE,
    height: CURRENT_FACE,
    borderRadius: CURRENT_FACE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedScale: {
    transform: [{ scale: 0.96 }],
  },
  // Le triangle « play » paraît décentré à gauche : léger recentrage optique
  playNudge: {
    marginLeft: 4,
  },
  label: {
    position: 'absolute',
    width: LABEL_WIDTH,
    alignItems: 'center',
  },
  center: {
    textAlign: 'center',
  },
  currentLabel: {
    alignItems: 'center',
    gap: LABEL_GAP,
  },
  lockedText: {
    lineHeight: LOCKED_LINE,
    textAlign: 'center',
  },
  dimmed: {
    opacity: opacityDisabled,
  },
  halo: {
    position: 'absolute',
    width: HALO_SIZE,
    height: HALO_SIZE,
  },
  valBlock: {
    position: 'absolute',
  },
});
