import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { AccessibilityActionEvent, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import AppText from '@/src/components/common/AppText';
import { palette, radius, reliefDepth, size, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { moveItem, orderCorrect, orderResults } from '@/src/lesson/interactive';
import type { OrderScreen as OrderModel } from '@/src/lesson/model';
import { select } from '@/src/utils/haptics';
import ScreenIntro from '../player/ScreenIntro';
import { LessonScreenProps } from '../types';

const ROW_GAP = space[3];
const ARROW = 20;

// order — remettre dans l'ordre. Glisser par la poignée à droite, ou les
// boutons monter / descendre (aussi en actions du lecteur d'écran). Valider :
// chaque élément passe en vert ou en rouge, puis l'ordre juste est montré.
// Réponse : la liste des ids dans l'ordre choisi.
export default function OrderScreen({ screen, answered, onDraftChange }: LessonScreenProps<OrderModel>) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { items } = screen;
  const [order, setOrder] = useState<string[]>(screen.start);
  const [dragging, setDragging] = useState<number | null>(null);
  const [rowHeight, setRowHeight] = useState<number>(size.rowMin);
  const dy = useSharedValue(0);

  const textOf = (id: string) => items.find((it) => it.id === id)?.text ?? '';
  const results = orderResults(screen, order);

  // Un ordre est toujours proposé : Valider est actif dès l'arrivée
  useEffect(() => {
    onDraftChange({
      raw: order,
      correct: orderCorrect(screen, order),
      correctText: items.map((it) => it.text).join(' → '),
    });
  }, [order, screen, items, onDraftChange]);

  const move = (from: number, to: number) => {
    if (answered) return;
    const next = moveItem(order, from, to);
    if (next === order) return;
    select();
    setOrder(next);
  };

  const endDrag = (from: number, translation: number) => {
    setDragging(null);
    dy.set(0);
    move(from, from + Math.round(translation / (rowHeight + ROW_GAP)));
  };

  const draggedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: dy.get() }, { scale: 1.02 }] }));

  return (
    <View style={styles.wrap}>
      <ScreenIntro screen={screen} hint="Glisse par la poignée, ou utilise les flèches." />

      <GestureHandlerRootView>
        <View style={styles.list}>
          {order.map((id, i) => {
            const state = answered ? (results[i] ? 'correct' : 'wrong') : 'idle';
            const border = state === 'correct' ? colors.success : state === 'wrong' ? colors.error : colors.controlBorder;
            const edge = state === 'correct' ? colors.successDeep : state === 'wrong' ? colors.dangerDeep : colors.reliefEdge;
            const tint = state === 'correct' ? colors.successSoft : state === 'wrong' ? colors.dangerSoft : 'transparent';

            const drag = Gesture.Pan()
              .enabled(!answered)
              .minDistance(2)
              .onStart(() => {
                scheduleOnRN(setDragging, i);
              })
              .onUpdate((e) => {
                dy.set(e.translationY);
              })
              .onEnd((e) => {
                scheduleOnRN(endDrag, i, e.translationY);
              });

            const onAction = (e: AccessibilityActionEvent) => {
              if (e.nativeEvent.actionName === 'moveUp') move(i, i - 1);
              if (e.nativeEvent.actionName === 'moveDown') move(i, i + 1);
            };

            return (
              <Animated.View
                key={id}
                style={[styles.rowWrap, dragging === i && [styles.dragged, draggedStyle]]}
                onLayout={i === 0 ? (e) => setRowHeight(e.nativeEvent.layout.height) : undefined}
                accessible
                accessibilityLabel={`${i + 1}. ${textOf(id)}${answered ? (results[i] ? ', bien placé' : ', mal placé') : ''}`}
                accessibilityActions={answered ? undefined : [
                  { name: 'moveUp', label: 'Monter' },
                  { name: 'moveDown', label: 'Descendre' },
                ]}
                onAccessibilityAction={onAction}
              >
                <View style={[styles.edge, { backgroundColor: edge }]} />
                <View style={[styles.row, { backgroundColor: colors.background, borderColor: border }]}>
                  <View style={[styles.tint, { backgroundColor: tint }]} />
                  <AppText variant="bodyMedium" tone="subtitle" style={styles.rank}>
                    {i + 1}
                  </AppText>
                  <AppText variant="bodyMedium" style={styles.text}>
                    {textOf(id)}
                  </AppText>
                  {answered ? (
                    <Ionicons
                      name={results[i] ? 'checkmark-circle' : 'close-circle'}
                      size={22}
                      color={results[i] ? colors.success : colors.error}
                    />
                  ) : (
                    <>
                      <View style={styles.arrows} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                        <Pressable onPress={() => move(i, i - 1)} disabled={i === 0} hitSlop={6} style={styles.arrow}>
                          <Ionicons name="chevron-up" size={ARROW} color={i === 0 ? colors.textFaint : colors.subtitle} />
                        </Pressable>
                        <Pressable
                          onPress={() => move(i, i + 1)}
                          disabled={i === order.length - 1}
                          hitSlop={6}
                          style={styles.arrow}
                        >
                          <Ionicons
                            name="chevron-down"
                            size={ARROW}
                            color={i === order.length - 1 ? colors.textFaint : colors.subtitle}
                          />
                        </Pressable>
                      </View>
                      <GestureDetector gesture={drag}>
                        <View style={styles.handle} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                          <Ionicons name="reorder-three" size={26} color={colors.subtitle} />
                        </View>
                      </GestureDetector>
                    </>
                  )}
                </View>
              </Animated.View>
            );
          })}
        </View>
      </GestureHandlerRootView>

      {answered && !orderCorrect(screen, order) ? (
        <View style={styles.solution} accessible accessibilityLabel={`L’ordre juste : ${items.map((it) => it.text).join(', ')}`}>
          <AppText variant="sectionLabel">L’ordre juste</AppText>
          {items.map((it, i) => (
            <AppText key={it.id} variant="callout">
              {i + 1}. {it.text}
            </AppText>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space[6],
  },
  list: {
    gap: ROW_GAP,
  },
  rowWrap: {
    paddingBottom: reliefDepth,
  },
  dragged: {
    zIndex: 10,
  },
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: reliefDepth,
    borderRadius: radius.option,
    borderCurve: 'continuous',
  },
  row: {
    minHeight: size.rowMin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingLeft: space[4],
    paddingRight: space[2],
    paddingVertical: space[2],
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
  rank: {
    width: 16,
    fontVariant: ['tabular-nums'],
  },
  text: {
    flex: 1,
  },
  arrows: {
    gap: 2,
  },
  arrow: {
    padding: 2,
  },
  handle: {
    width: size.tapMin,
    height: size.tapMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solution: {
    gap: space[2],
  },
});
