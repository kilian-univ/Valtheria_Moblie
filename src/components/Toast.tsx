import { useEffect, useRef } from 'react';
import { Animated, Text } from 'react-native';

import { fonts, palette } from '../constants/style/Style';
import { useTheme } from '../context/ThemeContext';

type ToastProps = {
  message: string;
  visible: boolean;
  onHide: () => void;
  duration?: number; // ms
};

export default function Toast({ message, visible, onHide, duration = 2000 }: ToastProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => onHide());
    }, duration);

    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 40,
        alignSelf: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        opacity,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 14, fontFamily: fonts.body }}>{message}</Text>
    </Animated.View>
  );
}