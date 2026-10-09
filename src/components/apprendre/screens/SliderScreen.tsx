import { useRef, useState } from 'react';
import { AccessibilityActionEvent, GestureResponderEvent, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { fonts, palette, radius, reliefDepth, size, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { formatNumber } from '@/src/utils/format';
import { select } from '@/src/utils/haptics';
import ScreenIntro from '../player/ScreenIntro';
import { LessonScreenProps } from '../types';

const VALUE_SIZE = 72;
const VALUE_LINE_HEIGHT = 80;
const TRACK_HEIGHT = 8;
const THUMB = 32;
const THUMB_BORDER = 3;
// Zone de toucher autour de la piste
const TOUCH_HEIGHT = THUMB + reliefDepth + space[3];

// slider — estimation libre, jamais noté. L'utilisateur place un curseur,
// pas de bonne réponse à vérifier ici.
export default function SliderScreen({ screen }: LessonScreenProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { payload } = screen;
  const min = Number(payload.min ?? 0);
  const max = Number(payload.max ?? 100);
  const step = Number(payload.step) > 0 ? Number(payload.step) : 1;
  const unit = payload.unit ? String(payload.unit) : '';

  const clampToStep = (raw: number) => {
    const stepped = min + Math.round((raw - min) / step) * step;
    return Math.min(max, Math.max(min, stepped));
  };

  const [value, setValue] = useState(() => clampToStep(Number(payload.start ?? min)));
  const [trackWidth, setTrackWidth] = useState(0);
  const trackRef = useRef<View>(null);
  const trackX = useRef(0);
  const trackW = useRef(0);
  const valueRef = useRef(value);

  // Un cran franchi : nouvelle valeur et petite vibration
  const commit = (next: number) => {
    if (next === valueRef.current) return;
    valueRef.current = next;
    select();
    setValue(next);
  };

  const updateFromPageX = (pageX: number) => {
    if (trackW.current <= 0) return;
    const ratio = Math.min(1, Math.max(0, (pageX - trackX.current) / trackW.current));
    commit(clampToStep(min + ratio * (max - min)));
  };

  // Position de la piste mesurée au toucher : juste même si l'écran a défilé
  const onGrant = (e: GestureResponderEvent) => {
    const { pageX } = e.nativeEvent;
    trackRef.current?.measure((_x, _y, width, _h, px) => {
      trackX.current = px;
      trackW.current = width;
      updateFromPageX(pageX);
    });
  };

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'increment') commit(clampToStep(valueRef.current + step));
    if (e.nativeEvent.actionName === 'decrement') commit(clampToStep(valueRef.current - step));
  };

  const ratio = max > min ? (value - min) / (max - min) : 0;
  const fillWidth = ratio * trackWidth;
  const withUnit = (n: number) => `${formatNumber(n)}${unit ? ` ${unit}` : ''}`;

  return (
    <View style={styles.wrap}>
      <ScreenIntro screen={screen} question={payload.question} subtitle={payload.subtitle} />

      <View style={styles.valueBlock} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <AppText tone="gold" maxFontSizeMultiplier={1.2} style={styles.value}>
          {formatNumber(value)}
        </AppText>
        {unit ? (
          <AppText variant="callout" tone="subtitle" style={styles.center}>
            {unit}
          </AppText>
        ) : null}
      </View>

      <View>
        <View
          ref={trackRef}
          style={styles.touch}
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={payload.question ?? 'Curseur'}
          accessibilityValue={{ min, max, now: value, text: withUnit(value) }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={onAccessibilityAction}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          // Le défilement vertical ne vole pas le curseur en cours de glissé
          onResponderTerminationRequest={() => false}
          onResponderGrant={onGrant}
          onResponderMove={(e) => updateFromPageX(e.nativeEvent.pageX)}
        >
          <View style={[styles.track, { backgroundColor: colors.surface }]} pointerEvents="none">
            <View style={[styles.fill, { width: fillWidth, backgroundColor: colors.gold }]} />
          </View>
          <View style={[styles.thumb, { left: fillWidth - THUMB / 2 }]} pointerEvents="none">
            <View style={[styles.thumbEdge, { backgroundColor: colors.goldDeep }]} />
            <View style={[styles.thumbFace, { backgroundColor: colors.gold, borderColor: colors.background }]} />
          </View>
        </View>

        <View style={styles.bounds}>
          <AppText variant="caption" tone="subtitle" style={styles.tabular}>
            {withUnit(min)}
          </AppText>
          <AppText variant="caption" tone="subtitle" style={styles.tabular}>
            {withUnit(max)}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space[6],
  },
  valueBlock: {
    alignItems: 'center',
  },
  value: {
    fontFamily: fonts.title,
    fontSize: VALUE_SIZE,
    lineHeight: VALUE_LINE_HEIGHT,
    letterSpacing: titleLetterSpacing(VALUE_SIZE),
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  center: {
    textAlign: 'center',
  },
  // La piste laisse une demi-poignée de chaque côté pour que la poignée
  // reste dans l'écran aux bornes
  touch: {
    height: Math.max(TOUCH_HEIGHT, size.tapMin),
    justifyContent: 'center',
    marginHorizontal: THUMB / 2,
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  thumb: {
    position: 'absolute',
    top: (Math.max(TOUCH_HEIGHT, size.tapMin) - THUMB) / 2 - reliefDepth / 2,
    width: THUMB,
    height: THUMB + reliefDepth,
  },
  thumbEdge: {
    position: 'absolute',
    top: reliefDepth,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
  },
  thumbFace: {
    position: 'absolute',
    top: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: THUMB_BORDER,
  },
  bounds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: space[1],
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});
