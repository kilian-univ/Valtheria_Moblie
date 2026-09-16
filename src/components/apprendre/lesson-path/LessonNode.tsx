import { Lesson } from '@/src/context/ApiContext';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { darken } from './colorUtils';

type LessonStatus = 'completed' | 'available' | 'locked';

const BEVEL = 6; // hauteur du "socle" 3D sous le bouton

export default function LessonNode({
  lesson,
  x,
  y,
  isCurrent,
  colors,
  styles,
  moduleColor,
  isStarting,
  onPress,
}: {
  lesson: Lesson & { status: LessonStatus };
  x: number;
  y: number;
  isCurrent: boolean;
  colors: any;
  styles: any;
  moduleColor?: string;
  isStarting?: boolean;
  onPress?: () => void;
}) {
  const size = isCurrent ? 72 : 60;
  const { status } = lesson;

  const pulse = useRef(new Animated.Value(1)).current;
  const bounce = useRef(new Animated.Value(0)).current;
  const pressDown = useRef(new Animated.Value(0)).current; // 0 = relâché, 1 = enfoncé
  const ringRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isCurrent) return;
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    const bounceLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -6, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    const spinLoop = Animated.loop(
      Animated.timing(ringRotate, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true })
    );
    pulseLoop.start();
    bounceLoop.start();
    if (status !== 'locked') spinLoop.start();
    return () => {
      pulseLoop.stop();
      bounceLoop.stop();
      spinLoop.stop();
    };
  }, [isCurrent, status]);

  const baseColor =
    status === 'completed' ? colors.gold : status === 'available' ? moduleColor || colors.primary : colors.surface;
  const shadowColorBevel = status === 'locked' ? colors.border : darken(baseColor, 0.28);
  const glyphColor = status === 'locked' ? colors.subtitle : colors.primaryText;

  const handlePressIn = () => {
    if (status === 'locked') return;
    Animated.timing(pressDown, { toValue: 1, duration: 90, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(pressDown, { toValue: 0, friction: 4, tension: 120, useNativeDriver: true }).start();
  };

  const translateY = pressDown.interpolate({ inputRange: [0, 1], outputRange: [0, BEVEL] });
  const spin = ringRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={{ position: 'absolute', left: x - size / 2, top: y - size / 2 - BEVEL / 2, alignItems: 'center' }}>
      {/* Bulle "COMMENCER" flottante au-dessus */}
      {isCurrent && status !== 'locked' && (
        <Animated.View style={[styles.nodeBubble, { transform: [{ translateY: bounce }] }]}>
          <Text style={styles.nodeBubbleText}>COMMENCER</Text>
          <View style={styles.nodeBubbleArrow} />
        </Animated.View>
      )}

      <View style={{ width: size, height: size + BEVEL }}>
        {/* Anneau tournant discret autour de la leçon active/complétée */}
        {isCurrent && status !== 'locked' && (
          <Animated.View
            style={{
              position: 'absolute',
              top: -6,
              left: -6,
              width: size + 12,
              height: size + 12,
              borderRadius: (size + 12) / 2,
              borderWidth: 2,
              borderColor: baseColor,
              borderStyle: 'dashed',
              opacity: 0.35,
              transform: [{ rotate: spin }],
            }}
          />
        )}

        {/* Socle : couleur foncée fixe, donne l'effet de profondeur 3D */}
        <View
          style={{
            position: 'absolute',
            top: BEVEL,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: shadowColorBevel,
          }}
        />

        {/* Face du bouton : se translate vers le bas au clic pour "s'enfoncer" dans le socle */}
        <Animated.View style={{ transform: [{ scale: pulse }, { translateY }] }}>
          <Pressable
            disabled={status === 'locked' || isStarting}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: baseColor,
              borderWidth: status === 'locked' ? 2 : 0,
              borderColor: status === 'locked' ? colors.border : 'transparent',
              borderStyle: status === 'locked' ? 'dashed' : 'solid',
              opacity: status === 'locked' ? 0.55 : isStarting ? 0.75 : 1,
            }}
          >
            {isStarting ? (
              <Text style={styles.nodeSpinnerGlyph}>⏳</Text>
            ) : status === 'completed' ? (
              <Text style={{ fontSize: isCurrent ? 30 : 24 }}>⭐</Text>
            ) : status === 'locked' ? (
              <LockGlyph color={glyphColor} size={isCurrent ? 22 : 18} />
            ) : (
              <PlayGlyph color={glyphColor} size={isCurrent ? 24 : 20} />
            )}
          </Pressable>
        </Animated.View>
      </View>

      <Text style={isCurrent ? styles.nodeTitleCurrent : styles.nodeTitle} numberOfLines={2}>
        {lesson.title}
      </Text>
      {status !== 'locked' && <Text style={styles.nodeXpText}>+{lesson.xp_reward} XP</Text>}
    </View>
  );
}

// Triangle "play" propre, dessiné en pure View plutôt qu'en emoji (rendu net sur tous les appareils)
function PlayGlyph({ color, size }: { color: string; size: number }) {
  return (
    <View
      style={{
        width: 0,
        height: 0,
        marginLeft: 3, // recentre optiquement le triangle
        borderTopWidth: size * 0.6,
        borderBottomWidth: size * 0.6,
        borderLeftWidth: size,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: color,
      }}
    />
  );
}

// Cadenas simplifié en pure View (anse + corps), plus net que l'emoji 🔒
function LockGlyph({ color, size }: { color: string; size: number }) {
  const bodyW = size;
  const bodyH = size * 0.75;
  const shackleSize = size * 0.65;

  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: shackleSize,
          height: shackleSize,
          borderRadius: shackleSize / 2,
          borderWidth: 2.5,
          borderColor: color,
          borderBottomWidth: 0,
          marginBottom: -shackleSize * 0.35,
        }}
      />
      <View style={{ width: bodyW, height: bodyH, borderRadius: 3, backgroundColor: color }} />
    </View>
  );
}