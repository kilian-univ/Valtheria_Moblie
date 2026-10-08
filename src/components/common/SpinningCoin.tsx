import { useEffect, useRef } from 'react';
import { Animated, Easing, ImageStyle, StyleProp } from 'react-native';

const COIN = require('@/assets/images/coin.png');

export default function SpinningCoin({ style }: { style?: StyleProp<ImageStyle> }) {
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // scaleX simule la rotation 3D de la pièce vue de face (perspective non
  // disponible nativement sur Animated sans libs tierces).
  const scaleX = rotate.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1, 0, -1, 0, 1],
  });

  return <Animated.Image source={COIN} resizeMode="contain" style={[style, { transform: [{ scaleX }] }]} />;
}