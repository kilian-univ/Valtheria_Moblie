import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityActionEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
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
import { moveItem, orderCorrect, orderResults } from '@/src/lesson/interactive';
import type { OrderScreen as OrderModel } from '@/src/lesson/model';
import { select } from '@/src/utils/haptics';
import ScreenIntro from '../player/ScreenIntro';
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

// Places des lignes dans l'ordre donné : positions calculées à partir des
// seules hauteurs mesurées (plus fiable que la position mesurée sur le web)
function slotsFor(order: string[], heights: Record<string, number>): Slot[] {
  let y = 0;
  return order.map((id) => {
    const slot = { y, h: heights[id] ?? 0 };
    y += slot.h + ROW_GAP;
    return slot;
  });
}

// order — remettre dans l'ordre. On attrape une ligne par sa poignée, ou
// par un appui long : elle se soulève, sa place vide reste en pointillés, les
// autres s'écartent, un cran à chaque rang franchi ; lâchée, elle se pose
// avec un petit rebond. Lecteur d'écran : actions « Monter » et
// « Descendre ». Valider : les lignes se colorent une à une de haut en bas,
// puis les mal placées glissent jusqu'à leur bonne place. Réponse : la liste
// des ids dans l'ordre choisi.
export default function OrderScreen({ screen, answered, onDraftChange }: LessonScreenProps<OrderModel>) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const { items, axis } = screen;

  const [order, setOrder] = useState<string[]>(screen.start);
  const [heights, setHeights] = useState<Record<string, number>>({});
  // Ligne attrapée (rang de départ) et rang visé
  const [from, setFrom] = useState<number | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  // Pose : décalage de départ du rebond de la ligne lâchée
  const [landing, setLanding] = useState<{ id: string; offset: number } | null>(null);
  // Correction : lignes colorées, puis rangées dans l'ordre juste
  const [colored, setColored] = useState(0);
  const [settled, setSettled] = useState(false);

  const dragY = useSharedValue(0);
  const dragFrom = useSharedValue(-1);
  const aimed = useSharedValue(-1);
  const layout = useSharedValue<Slot[]>([]);

  const shownColored = answered && reduced ? order.length : colored;
  const isSettled = settled || (answered && reduced);
  const textOf = (id: string) => items.find((it) => it.id === id)?.text ?? '';
  const results = orderResults(screen, order);
  const ready = order.every((id) => heights[id]);
  const n = order.length;
  const slots = slotsFor(order, heights);
  const slotsKey = slots.map((sl) => `${sl.y}:${sl.h}`).join(',');

  useEffect(() => {
    layout.set(slotsFor(order, heights));
    // slotsKey : les places, pas l'identité du tableau
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotsKey, layout]);

  // Un ordre est toujours proposé : Valider est actif dès l'arrivée
  useEffect(() => {
    onDraftChange({
      raw: order,
      correct: orderCorrect(screen, order),
      correctText: items.map((it) => it.text).join(' → '),
      // Les lignes se colorent, puis se rangent, avant la feuille
      sheetDelay: n * motion.reveal + motion.state + (orderCorrect(screen, order) ? 0 : motion.screen),
    });
  }, [order, screen, items, n, onDraftChange]);

  // Correction : une ligne de plus toutes les 80 ms, puis le rangement.
  // Animations réduites : tout de suite (voir shownColored, isSettled)
  useEffect(() => {
    if (!answered || reduced) return;
    const timers = order.map((_, i) => setTimeout(() => setColored(i + 1), (i + 1) * motion.reveal));
    timers.push(setTimeout(() => setSettled(true), n * motion.reveal + motion.state));
    return () => timers.forEach(clearTimeout);
    // Une seule fois, à la validation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered]);

  const move = (a: number, b: number) => {
    if (answered) return;
    const next = moveItem(order, a, b);
    if (next === order) return;
    select();
    setOrder(next);
  };

  // Attrapée : soulevée, un cran
  const grab = (index: number) => {
    if (answered) return;
    select();
    setFrom(index);
    setTarget(index);
  };

  const aim = (index: number) => {
    setTarget(index);
    select();
  };

  // Place du rang visé, pour la ligne attrapée
  const slotTop = (a: number, b: number) => {
    if (!slots[a] || !slots[b]) return 0;
    return b > a ? slots[b].y + slots[b].h - slots[a].h : slots[b].y;
  };

  // Lâchée : l'ordre change, elle se pose sur sa nouvelle place
  const drop = (index: number, dy: number) => {
    const to = aimed.get() < 0 ? index : aimed.get();
    const offset = slots[index] ? slots[index].y + dy - slotTop(index, to) : 0;
    const id = order[index];
    setFrom(null);
    setTarget(null);
    dragFrom.set(-1);
    aimed.set(-1);
    if (to !== index) {
      select();
      setOrder(moveItem(order, index, to));
    }
    setLanding({ id, offset });
  };

  // Un même geste pour la poignée (tout de suite) et la ligne (appui long)
  const dragGesture = (index: number, longPress: boolean) => {
    const g = Gesture.Pan()
      .enabled(!answered)
      .onStart(() => {
        dragFrom.set(index);
        aimed.set(index);
        dragY.set(0);
        scheduleOnRN(grab, index);
      })
      .onUpdate((e) => {
        dragY.set(e.translationY);
        const rows = layout.get();
        const me = rows[index];
        if (!me) return;
        const center = me.y + me.h / 2 + e.translationY;
        let rank = 0;
        for (let k = 0; k < rows.length; k++) {
          if (k !== index && rows[k].y + rows[k].h / 2 < center) rank += 1;
        }
        if (rank !== aimed.get()) {
          aimed.set(rank);
          scheduleOnRN(aim, rank);
        }
      })
      .onEnd((e) => {
        scheduleOnRN(drop, index, e.translationY);
      });
    return longPress ? g.activateAfterLongPress(LONG_PRESS) : g.minDistance(0);
  };

  // Décalage d'une ligne pendant qu'une autre est déplacée, ou au rangement
  const shiftOf = (index: number, id: string): number => {
    if (isSettled) {
      // Place dans l'ordre juste, avec les hauteurs réelles
      const correct = slotsFor(
        items.map((it) => it.id),
        heights
      );
      const rank = items.findIndex((it) => it.id === id);
      return (correct[rank]?.y ?? 0) - (slots[index]?.y ?? 0);
    }
    if (from === null || target === null || index === from || !slots[from]) return 0;
    const room = slots[from].h + ROW_GAP;
    if (from < target && index > from && index <= target) return -room;
    if (from > target && index >= target && index < from) return room;
    return 0;
  };

  const correctRank = (id: string) => items.findIndex((it) => it.id === id);

  return (
    <View style={styles.wrap}>
      <ScreenIntro screen={screen} />

      <View style={styles.center}>
        <View style={styles.body}>
          <Axis start={axis.start} end={axis.end} risk={axis.risk} />

          <GestureHandlerRootView style={styles.list}>
            {/* Place vide de la ligne attrapée */}
            {from !== null && target !== null && ready ? (
              <View
                pointerEvents="none"
                style={[
                  styles.placeholder,
                  {
                    top: slotTop(from, target),
                    height: (slots[from]?.h ?? 0) - DEPTH,
                    borderColor: withOpacity(colors.gold, PLACEHOLDER_OPACITY),
                  },
                ]}
              />
            ) : null}

            {order.map((id, i) => (
              <OrderRow
                key={id}
                text={textOf(id)}
                rank={isSettled ? correctRank(id) + 1 : i + 1}
                index={i}
                count={n}
                state={answered && i < shownColored ? (results[i] ? 'right' : 'wrong') : 'idle'}
                lifted={from === i}
                shift={shiftOf(i, id)}
                slow={isSettled}
                // Hors glissement et hors rangement : le décalage tombe à 0
                // parce que l'ordre vient d'être posé
                instant={from === null && !isSettled}
                landing={landing?.id === id ? landing.offset : null}
                onLanded={() => setLanding(null)}
                dragY={dragY}
                dragFrom={dragFrom}
                handleGesture={dragGesture(i, false)}
                rowGesture={dragGesture(i, true)}
                onLayout={(h) => setHeights((prev) => (prev[id] === h ? prev : { ...prev, [id]: h }))}
                onMove={(to) => move(i, to)}
                answered={answered}
              />
            ))}
          </GestureHandlerRootView>
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
  text: string;
  rank: number;
  index: number;
  count: number;
  state: 'idle' | 'right' | 'wrong';
  lifted: boolean;
  // Décalage voulu (autre ligne déplacée, rangement final)
  shift: number;
  // Rangement final : glissement plus long
  slow: boolean;
  // Nouvel ordre posé : la ligne est déjà à sa place, sans glissement
  instant: boolean;
  // Ligne qu'on vient de lâcher : d'où part son rebond
  landing: number | null;
  onLanded: () => void;
  dragY: SharedValue<number>;
  dragFrom: SharedValue<number>;
  handleGesture: ReturnType<typeof Gesture.Pan>;
  rowGesture: ReturnType<typeof Gesture.Pan>;
  onLayout: (height: number) => void;
  onMove: (to: number) => void;
  answered: boolean;
};

function OrderRow({
  text,
  rank,
  index,
  count,
  state,
  lifted,
  shift,
  slow,
  instant,
  landing,
  onLanded,
  dragY,
  dragFrom,
  handleGesture,
  rowGesture,
  onLayout,
  onMove,
  answered,
}: OrderRowProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const offset = useSharedValue(0);
  const lift = useSharedValue(0);
  const lastShift = useRef(shift);

  // Les autres s'écartent en douceur ; au rangement, glissement de 300 ms.
  // Avant l'affichage : au lâcher, la ligne passe sans saut à sa nouvelle place
  useLayoutEffect(() => {
    if (shift === lastShift.current) return;
    lastShift.current = shift;
    offset.set(reduced || instant ? shift : withTiming(shift, timing(slow ? motion.screen : motion.state)));
  }, [shift, slow, instant, reduced, offset]);

  // Lâchée : elle part d'où était le doigt et se pose avec un petit rebond
  useLayoutEffect(() => {
    if (landing === null) return;
    offset.set(landing);
    offset.set(reduced ? 0 : withSpring(0, springs.press));
    onLanded();
  }, [landing, reduced, offset, onLanded]);

  useEffect(() => {
    lift.set(reduced ? (lifted ? 1 : 0) : withTiming(lifted ? 1 : 0, timing(motion.tap)));
  }, [lifted, reduced, lift]);

  const rowStyle = useAnimatedStyle(() => {
    const dragged = dragFrom.get() === index;
    const tilt = reduced ? 0 : LIFT_TILT * lift.get();
    return {
      zIndex: dragged ? 10 : 0,
      transform: [
        { translateY: dragged ? dragY.get() : offset.get() },
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
    <GestureDetector gesture={rowGesture}>
      <Animated.View
        style={[styles.rowWrap, lifted && { boxShadow: [{ offsetX: 0, offsetY: 16, blurRadius: 26, color: withOpacity(colors.groundShadow, 0.6) }] }, rowStyle]}
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
            <GestureDetector gesture={handleGesture}>
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
