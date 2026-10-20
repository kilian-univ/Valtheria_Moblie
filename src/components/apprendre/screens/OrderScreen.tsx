import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityActionEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import AppText from '@/src/components/common/AppText';
import { motion, springs, timing } from '@/src/constants/motion';
import { fonts, palette, radius, size, space, withOpacity } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { dropRank, moveItem, orderResults } from '@/src/lesson/interactive';
import { grade } from '@/src/utils/grade';
import type { OrderScreen as OrderModel } from '@/src/lesson/model';
import { safeGesture } from '@/src/utils/gestureSafety';
import { feedback } from '@/src/utils/feedback';
import { select } from '@/src/utils/haptics';
import ScreenIntro from '../player/ScreenIntro';
import { useScrollLock } from '../player/ScrollLock';
import { LessonScreenProps } from '../types';

const ROW_GAP = space[3];
const DEPTH = 5;
const RANK_SIZE = 20;
const AXIS_WIDTH = 22;
const AXIS_LINE = 4;
const AXIS_FONT = 10;
// Largeur d'une lettre de l'axe (capitales, interlettrage compris)
const AXIS_CHAR = 7.4;
// Ligne attrapée : soulevée, légèrement inclinée
const LIFT_SCALE = 1.04;
const LIFT_TILT = -1;
const LONG_PRESS = 350;
const PLACEHOLDER_OPACITY = 0.4;

type Slot = { y: number; h: number };

// Places des lignes dans un ordre donné, à partir des hauteurs mesurées
function slotsFor(order: string[], heights: Record<string, number>): Slot[] {
  let y = 0;
  return order.map((id) => {
    const slot = { y, h: heights[id] ?? 0 };
    y += slot.h + ROW_GAP;
    return slot;
  });
}

function topIn(order: string[], heights: Record<string, number>, id: string): number {
  const i = order.indexOf(id);
  return i < 0 ? 0 : slotsFor(order, heights)[i].y;
}

// order — remettre dans l'ordre. On attrape une ligne par sa poignée, ou
// par un appui long : elle se soulève, sa place vide reste en pointillés, les
// autres s'écartent, un cran à chaque rang franchi ; lâchée, elle se pose
// directement sur sa nouvelle place avec un petit rebond. Les lignes gardent
// toujours la même place dans la mise en page (ordre de départ) et ne
// bougent que par décalage : au lâcher, la ligne reste où le doigt l'a
// posée, rien ne saute. Lecteur d'écran : actions « Monter » et
// « Descendre ». Valider : les lignes se colorent une à une de haut en bas,
// puis les mal placées glissent jusqu'à leur bonne place. Réponse : la liste
// des ids dans l'ordre choisi.
export default function OrderScreen({ screen, answered, onDraftChange }: LessonScreenProps<OrderModel>) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const lockScroll = useScrollLock();
  const { items, axis } = screen;
  // Ordre de la mise en page : celui de départ, il ne change jamais
  const [natural] = useState<string[]>(screen.start);

  const [order, setOrder] = useState<string[]>(screen.start);
  const [heights, setHeights] = useState<Record<string, number>>({});
  // Ligne attrapée (id, rang de départ) et rang visé
  const [drag, setDrag] = useState<{ id: string; from: number } | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  // Ligne qu'on vient de lâcher : elle rejoint sa place avec un rebond
  // (key change à chaque dépôt : même posée à sa place de départ, elle y
  // retourne)
  const [landing, setLanding] = useState<{ id: string; key: number } | null>(null);
  // Correction : lignes colorées, puis rangées dans l'ordre juste
  const [colored, setColored] = useState(0);
  const [settled, setSettled] = useState(false);

  const dragY = useSharedValue(0);
  const dragSlot = useSharedValue(-1);
  const aimed = useSharedValue(-1);
  const layout = useSharedValue<Slot[]>([]);

  const n = order.length;
  const shownColored = answered && reduced ? n : colored;
  const isSettled = settled || (answered && reduced);
  const correctIds = items.map((it) => it.id);
  const results = orderResults(screen, order);
  const ready = order.every((id) => heights[id]);
  const textOf = (id: string) => items.find((it) => it.id === id)?.text ?? '';

  // Ordre affiché : juste après correction, aperçu pendant un glissement
  const displayed = isSettled ? correctIds : drag && target !== null ? moveItem(order, drag.from, target) : order;
  const slotsKey = slotsFor(order, heights)
    .map((sl) => `${sl.y}:${sl.h}`)
    .join(',');

  // Avant l'image suivante : un geste lit toujours les places de l'ordre
  // actuel (slotsKey : les places, pas l'identité du tableau)
  const syncLayout = useEffectEvent(() => layout.set(slotsFor(order, heights)));
  useLayoutEffect(() => {
    syncLayout();
  }, [slotsKey]);

  // Un ordre est toujours proposé : Valider est actif dès l'arrivée
  useEffect(() => {
    const correct = grade(screen.source, order) === true;
    onDraftChange({
      raw: order,
      correct,
      correctText: items.map((it) => it.text).join(' → '),
      // Les lignes se colorent, puis se rangent, avant la feuille
      sheetDelay: n * motion.reveal + motion.state + (correct ? 0 : motion.screen),
    });
  }, [order, screen, items, n, onDraftChange]);

  // Correction : une ligne de plus toutes les 80 ms, puis le rangement.
  // Animations réduites : tout de suite (voir shownColored, isSettled).
  // Une seule fois, à la validation.
  const startCorrection = useEffectEvent((): (() => void) | undefined => {
    if (reduced) return;
    const timers = order.map((_, i) => setTimeout(() => setColored(i + 1), (i + 1) * motion.reveal));
    timers.push(setTimeout(() => setSettled(true), n * motion.reveal + motion.state));
    return () => timers.forEach(clearTimeout);
  });
  useEffect(() => {
    if (!answered) return;
    return startCorrection();
  }, [answered]);

  const move = (a: number, b: number) => {
    if (answered) return;
    const next = moveItem(order, a, b);
    if (next === order) return;
    select();
    setOrder(next);
  };

  // Attrapée : soulevée, son « pickup » ; la page ne défile plus
  const grab = (id: string, index: number) => {
    if (answered) return;
    lockScroll(true);
    feedback.pickup();
    setLanding(null);
    setDrag({ id, from: index });
    setTarget(index);
  };

  const aim = (rank: number) => {
    setTarget(rank);
    select();
  };

  // Lâchée : la ligne est encore à l'endroit du dépôt (fil d'interface) ;
  // elle rejoint toujours le rang calculé au lâcher (to, voir dropRank),
  // avec un rebond, son « drop »
  const drop = (id: string, to: number) => {
    lockScroll(false);
    setDrag(null);
    setTarget(null);
    setLanding((prev) => ({ id, key: (prev?.key ?? 0) + 1 }));
    feedback.drop();
    setOrder((prev) => moveItem(prev, prev.indexOf(id), to));
  };

  const draggedId = drag?.id ?? null;

  return (
    <View style={styles.wrap}>
      <ScreenIntro screen={screen} />

      <View style={styles.center}>
        <View style={styles.body}>
          <Axis start={axis.start} end={axis.end} risk={axis.risk} />

          <View style={styles.list}>
            {/* Place vide de la ligne attrapée */}
            {draggedId && ready ? (
              <View
                pointerEvents="none"
                style={[
                  styles.placeholder,
                  {
                    top: topIn(displayed, heights, draggedId),
                    height: (heights[draggedId] ?? 0) - DEPTH,
                    borderColor: withOpacity(colors.gold, PLACEHOLDER_OPACITY),
                  },
                ]}
              />
            ) : null}

            {natural.map((id, slot) => {
              const index = order.indexOf(id);
              return (
                <OrderRow
                  key={id}
                  id={id}
                  slot={slot}
                  index={index}
                  count={n}
                  text={textOf(id)}
                  rank={displayed.indexOf(id) + 1}
                  state={answered && index < shownColored ? (results[index] ? 'right' : 'wrong') : 'idle'}
                  lifted={draggedId === id}
                  offset={ready ? topIn(displayed, heights, id) - topIn(natural, heights, id) : 0}
                  slow={isSettled}
                  landKey={landing?.id === id ? landing.key : 0}
                  dragY={dragY}
                  dragSlot={dragSlot}
                  aimed={aimed}
                  layout={layout}
                  onGrab={grab}
                  onAim={aim}
                  onDrop={drop}
                  onRelease={() => lockScroll(false)}
                  onLayout={(h) => setHeights((prev) => (prev[id] === h ? prev : { ...prev, [id]: h }))}
                  onMove={(to) => move(index, to)}
                  answered={answered}
                />
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

// Axe vertical : libellé du haut, fine ligne en dégradé, libellé du bas
function Axis({ start, end, risk }: { start: string; end: string; risk: boolean }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const top = risk ? colors.success : colors.subtitle;
  const bottom = risk ? colors.error : colors.gold;
  return (
    <View
      style={styles.axis}
      accessible
      accessibilityLabel={`De haut en bas : de « ${start} » à « ${end} »`}
    >
      <VerticalLabel text={start} color={top} />
      <LinearGradient colors={risk ? [top, colors.gold, bottom] : [top, bottom]} style={styles.axisLine} />
      <VerticalLabel text={end} color={bottom} />
    </View>
  );
}

// Libellé couché (se lit de bas en haut) : une boîte de la longueur du
// texte, tournée d'un quart de tour au centre d'une colonne étroite
function VerticalLabel({ text, color }: { text: string; color: string }) {
  const label = text.toUpperCase();
  const length = Math.ceil(label.length * AXIS_CHAR);
  return (
    <View
      style={[styles.axisSlot, { height: length }]}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <View style={[styles.axisTurn, { width: length }]}>
        <AppText numberOfLines={1} maxFontSizeMultiplier={1} style={[styles.axisText, { color }]}>
          {label}
        </AppText>
      </View>
    </View>
  );
}

type OrderRowProps = {
  id: string;
  // Place dans la mise en page (ordre de départ, fixe)
  slot: number;
  // Rang dans l'ordre choisi
  index: number;
  count: number;
  text: string;
  rank: number;
  state: 'idle' | 'right' | 'wrong';
  lifted: boolean;
  // Décalage voulu depuis sa place dans la mise en page
  offset: number;
  // Rangement final : glissement plus long
  slow: boolean;
  // Numéro du dernier dépôt de cette ligne (0 : aucun) : à chaque nouveau
  // dépôt, elle rejoint sa place avec un petit rebond
  landKey: number;
  dragY: SharedValue<number>;
  dragSlot: SharedValue<number>;
  aimed: SharedValue<number>;
  layout: SharedValue<Slot[]>;
  onGrab: (id: string, index: number) => void;
  onAim: (rank: number) => void;
  onDrop: (id: string, to: number) => void;
  onRelease: () => void;
  onLayout: (height: number) => void;
  onMove: (to: number) => void;
  answered: boolean;
};

function OrderRow({
  id,
  slot,
  index,
  count,
  text,
  rank,
  state,
  lifted,
  offset,
  slow,
  landKey,
  dragY,
  dragSlot,
  aimed,
  layout,
  onGrab,
  onAim,
  onDrop,
  onRelease,
  onLayout,
  onMove,
  answered,
}: OrderRowProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const shift = useSharedValue(offset);
  const lift = useSharedValue(0);
  const lastOffset = useRef(offset);
  const lastLand = useRef(landKey);

  // Vers sa place : en douceur quand une autre ligne passe, avec un rebond
  // quand on vient de la lâcher (même si sa place n'a pas changé), en
  // 300 ms au rangement final. Pendant son propre glissement, elle suit le
  // doigt (rien à animer).
  useLayoutEffect(() => {
    if (lifted) return;
    const landed = landKey !== 0 && landKey !== lastLand.current;
    if (!landed && offset === lastOffset.current) return;
    lastOffset.current = offset;
    lastLand.current = landKey;
    if (reduced) shift.set(offset);
    else if (landed) shift.set(withSpring(offset, springs.press));
    else shift.set(withTiming(offset, timing(slow ? motion.screen : motion.state)));
  }, [offset, lifted, landKey, slow, reduced, shift]);

  useEffect(() => {
    lift.set(reduced ? (lifted ? 1 : 0) : withTiming(lifted ? 1 : 0, timing(motion.tap)));
  }, [lifted, reduced, lift]);

  // Un même geste pour la poignée (tout de suite) et la ligne (appui long)
  const dragGesture = (longPress: boolean) => {
    const g = Gesture.Pan()
      .enabled(!answered)
      .onStart(
        safeGesture(() => {
          'worklet';
          dragSlot.set(slot);
          aimed.set(index);
          dragY.set(0);
          scheduleOnRN(onGrab, id, index);
        })
      )
      .onUpdate(
        safeGesture((e: { translationY: number }) => {
          'worklet';
          dragY.set(e.translationY);
          // Emplacement visé, en continu, d'après le centre de la ligne
          const rank = dropRank(layout.get(), index, e.translationY);
          if (rank !== aimed.get()) {
            aimed.set(rank);
            scheduleOnRN(onAim, rank);
          }
        })
      )
      .onEnd(
        safeGesture((e: { translationY: number }) => {
          'worklet';
          // Rang final calculé ici, au lâcher même (jamais une valeur d'un
          // rendu précédent). Dans la même image : la ligne garde l'endroit
          // du dépôt, puis rejoint ce rang (aucun retour en arrière)
          const to = dropRank(layout.get(), index, e.translationY);
          shift.set(shift.get() + dragY.get());
          dragY.set(0);
          dragSlot.set(-1);
          scheduleOnRN(onDrop, id, to);
        })
      )
      .onFinalize(
        safeGesture(() => {
          'worklet';
          scheduleOnRN(onRelease);
        })
      );
    return longPress ? g.activateAfterLongPress(LONG_PRESS) : g.minDistance(0);
  };

  const rowStyle = useAnimatedStyle(() => {
    const dragged = dragSlot.get() === slot;
    const tilt = reduced ? 0 : LIFT_TILT * lift.get();
    return {
      zIndex: dragged || lift.get() > 0 ? 10 : 0,
      transform: [
        { translateY: dragged ? shift.get() + dragY.get() : shift.get() },
        { scale: 1 + (LIFT_SCALE - 1) * lift.get() },
        { rotate: `${tilt}deg` },
      ],
    };
  });

  const look = {
    idle: { border: lifted ? colors.gold : colors.optionBorder, tint: 'transparent', edge: colors.optionEdge },
    right: { border: colors.success, tint: colors.successSoft, edge: colors.successDeep },
    wrong: { border: colors.error, tint: colors.dangerSoft, edge: colors.dangerDeep },
  }[state];

  const onAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'moveUp') onMove(index - 1);
    if (e.nativeEvent.actionName === 'moveDown') onMove(index + 1);
  };

  return (
    <GestureDetector gesture={dragGesture(true)}>
      <Animated.View
        style={[
          styles.rowWrap,
          lifted && { boxShadow: [{ offsetX: 0, offsetY: 16, blurRadius: 26, color: withOpacity(colors.groundShadow, 0.6) }] },
          rowStyle,
        ]}
        onLayout={(e) => onLayout(e.nativeEvent.layout.height)}
        accessible
        accessibilityLabel={`${rank}. ${text}${state === 'right' ? ', bien placé' : state === 'wrong' ? ', mal placé' : ''}`}
        accessibilityActions={
          answered
            ? undefined
            : [
                ...(index > 0 ? [{ name: 'moveUp', label: 'Monter' }] : []),
                ...(index < count - 1 ? [{ name: 'moveDown', label: 'Descendre' }] : []),
              ]
        }
        onAccessibilityAction={onAction}
      >
        <View style={[styles.edge, { backgroundColor: look.edge }]} />
        <View style={[styles.row, { backgroundColor: colors.optionFace, borderColor: look.border }]}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: look.tint }]} />
          <AppText style={[styles.rank, { color: colors.gold }]}>{rank}</AppText>
          <AppText variant="bodyMedium" style={styles.text}>
            {text}
          </AppText>
          {state !== 'idle' ? (
            <Ionicons
              name={state === 'right' ? 'checkmark-circle' : 'close-circle'}
              size={22}
              color={state === 'right' ? colors.success : colors.error}
            />
          ) : (
            <GestureDetector gesture={dragGesture(false)} touchAction="none">
              <View style={styles.handle} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                <Ionicons name="reorder-two" size={24} color={colors.subtitle} />
              </View>
            </GestureDetector>
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    gap: space[6],
  },
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  body: {
    flexDirection: 'row',
    gap: space[2] + 2,
    marginLeft: -space[2],
  },
  axis: {
    width: AXIS_WIDTH,
    alignItems: 'center',
  },
  axisLine: {
    flex: 1,
    width: AXIS_LINE,
    borderRadius: radius.pill,
    marginVertical: space[2],
  },
  axisSlot: {
    width: AXIS_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  axisTurn: {
    height: AXIS_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-90deg' }],
  },
  axisText: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: AXIS_FONT,
    lineHeight: AXIS_FONT + 4,
    letterSpacing: 1,
  },
  list: {
    flex: 1,
    gap: ROW_GAP,
  },
  placeholder: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: radius.card,
    borderCurve: 'continuous',
  },
  rowWrap: {
    paddingBottom: DEPTH,
  },
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: DEPTH,
    borderRadius: radius.card,
    borderCurve: 'continuous',
  },
  row: {
    minHeight: size.rowMin + 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3] + 2,
    paddingLeft: space[4],
    paddingRight: space[1],
    paddingVertical: space[2],
    borderWidth: 2,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  rank: {
    width: 14,
    fontFamily: fonts.title,
    fontSize: RANK_SIZE,
    lineHeight: RANK_SIZE + 6,
    fontVariant: ['tabular-nums'],
  },
  text: {
    flex: 1,
    fontSize: 17,
    lineHeight: 23,
  },
  handle: {
    width: size.tapMin,
    height: size.tapMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
