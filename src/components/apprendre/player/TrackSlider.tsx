import { useEffect, useRef, useState } from 'react';
import { AccessibilityActionEvent, GestureResponderEvent, StyleSheet, View } from 'react-native';

import { palette, radius, reliefDepth, size, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { select } from '@/src/utils/haptics';

const TRACK_HEIGHT = 8;
const THUMB = 28;
const THUMB_BORDER = 3;
const TOUCH_HEIGHT = Math.max(THUMB + reliefDepth + space[3], size.tapMin);

type TrackSliderProps = {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  // Lecteur d'écran : nom du curseur et valeur lue (« 30 ans »)
  accessibilityLabel: string;
  valueText: string;
  // Piste seule, sans poignée (pot réservoir du répartir)
  readOnly?: boolean;
};

// Piste de curseur en relief, commune au répartir et au simulateur (même
// toucher que SliderScreen : un cran franchi = une petite vibration).
export default function TrackSlider({
  value,
  min,
  max,
  step,
  onChange,
  disabled,
  accessibilityLabel,
  valueText,
  readOnly,
}: TrackSliderProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const [trackWidth, setTrackWidth] = useState(0);
  const trackRef = useRef<View>(null);
  const trackX = useRef(0);
  const trackW = useRef(0);
  // Dernière valeur connue : celle du parent, ou celle qu'on vient d'envoyer
  const last = useRef(value);
  useEffect(() => {
    last.current = value;
  }, [value]);

  const clampToStep = (raw: number) => {
    const stepped = min + Math.round((raw - min) / step) * step;
    return Math.min(max, Math.max(min, stepped));
  };

  const commit = (next: number) => {
    if (disabled || readOnly || next === last.current) return;
    last.current = next;
    select();
    onChange(next);
  };

  const updateFromPageX = (pageX: number) => {
    if (trackW.current <= 0) return;
    const ratio = Math.min(1, Math.max(0, (pageX - trackX.current) / trackW.current));
    commit(clampToStep(min + ratio * (max - min)));
  };

  const onGrant = (e: GestureResponderEvent) => {
    const { pageX } = e.nativeEvent;
    trackRef.current?.measure((_x, _y, width, _h, px) => {
      trackX.current = px;
      trackW.current = width;
      updateFromPageX(pageX);
    });
  };

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'increment') commit(clampToStep(last.current + step));
    if (e.nativeEvent.actionName === 'decrement') commit(clampToStep(last.current - step));
  };

  const ratio = max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;
  const fillWidth = ratio * trackWidth;
  const interactive = !disabled && !readOnly;

  return (
    <View
      ref={trackRef}
      style={styles.touch}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole={readOnly ? undefined : 'adjustable'}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !interactive }}
      accessibilityValue={{ min, max, now: value, text: valueText }}
      accessibilityActions={interactive ? [{ name: 'increment' }, { name: 'decrement' }] : undefined}
      onAccessibilityAction={onAccessibilityAction}
      onStartShouldSetResponder={() => interactive}
      onMoveShouldSetResponder={() => interactive}
      onResponderTerminationRequest={() => false}
      onResponderGrant={onGrant}
      onResponderMove={(e) => updateFromPageX(e.nativeEvent.pageX)}
    >
      <View style={[styles.track, { backgroundColor: colors.surface }]} pointerEvents="none">
        <View style={[styles.fill, { width: fillWidth, backgroundColor: readOnly ? colors.subtitle : colors.gold }]} />
      </View>
      {readOnly ? null : (
        <View style={[styles.thumb, { left: fillWidth - THUMB / 2 }]} pointerEvents="none">
          <View style={[styles.thumbEdge, { backgroundColor: colors.goldDeep }]} />
          <View style={[styles.thumbFace, { backgroundColor: colors.gold, borderColor: colors.background }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Une demi-poignée de marge de chaque côté : la poignée reste dans l'écran
  touch: {
    height: TOUCH_HEIGHT,
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
    top: (TOUCH_HEIGHT - THUMB) / 2 - reliefDepth / 2,
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
});
