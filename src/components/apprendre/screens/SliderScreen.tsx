import { useRef, useState } from 'react';
import { PanResponder, Text, View } from 'react-native';

import { getSliderStyles } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import ContinueButton from '../ContinueButton';
import { LessonScreenProps } from '../types';
import ValBubble from '../ValBubble';

// slider — estimation libre, jamais noté. L'utilisateur place un curseur,
// pas de bonne réponse à vérifier ici (contrairement à reveal qui peut avoir
// une phase d'estimation suivie d'une révélation).
export default function SliderScreen({
  screen,
  colors,
  onNext,
  isLast,
  onFinish,
  isSubmitting,
}: LessonScreenProps) {
  const { colorScheme } = useTheme();
  const styles = getSliderStyles(colorScheme);
  const { payload } = screen;
  const { min, max, step = 1, unit, start } = payload;

  const [value, setValue] = useState(start ?? min);
  const trackWidth = useRef(0);

  const clampToStep = (raw: number) => {
    const stepped = Math.round(raw / step) * step;
    return Math.min(max, Math.max(min, stepped));
  };

  const updateFromX = (x: number) => {
    if (trackWidth.current <= 0) return;
    const ratio = Math.min(1, Math.max(0, x / trackWidth.current));
    setValue(clampToStep(min + ratio * (max - min)));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => updateFromX(e.nativeEvent.locationX),
      onPanResponderMove: (e) => updateFromX(e.nativeEvent.locationX),
    })
  ).current;

  const ratio = (value - min) / (max - min || 1);

  return (
    <View style={styles.wrap}>
      <ValBubble val={screen.val.intro} colors={colors} />

      <Text style={styles.question}>{payload.question}</Text>

      <View style={styles.valueWrap}>
        <Text style={styles.valueText}>{value}</Text>
        {unit && <Text style={styles.unitText}>{unit}</Text>}
      </View>

      <View
        style={styles.trackOuter}
        onLayout={(e) => (trackWidth.current = e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        <View style={styles.trackBg}>
          <View style={[styles.trackFill, { width: `${ratio * 100}%` }]} />
        </View>
        <View style={[styles.thumb, { left: `${ratio * 100}%` }]} />
      </View>

      <View style={styles.boundsRow}>
        <Text style={styles.boundText}>
          {min} {unit}
        </Text>
        <Text style={styles.boundText}>
          {max} {unit}
        </Text>
      </View>

      {isLast ? (
        <ContinueButton colors={colors} onPress={onFinish} label="Terminer la leçon" loading={isSubmitting} />
      ) : (
        <ContinueButton colors={colors} onPress={onNext} />
      )}
    </View>
  );
}