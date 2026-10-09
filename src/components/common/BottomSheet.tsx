import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useEffect } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { durations, springs } from '@/src/constants/motion';
import { palette, radius, size, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

const HANDLE_WIDTH = 36;
const HANDLE_HEIGHT = 5;
const CLOSE_SIZE = 22;
// Glisser au-delà du quart de la feuille, ou d'un geste vif, la ferme
const DISMISS_RATIO = 0.25;
const DISMISS_VELOCITY = 800;

type BottomSheetProps = {
  open: boolean;
  // Demande de fermeture (voile, glissé, bouton fermer, retour Android)
  onRequestClose: () => void;
  // Fin de l'animation de fermeture : le parent peut démonter la feuille
  onClosed: () => void;
  children: ReactNode;
  // false : pas de voile (le contenu derrière reste visible, mais ne se
  // touche pas)
  scrim?: boolean;
  // false : ni poignée, ni croix, ni glissé, ni toucher hors de la feuille.
  // Le retour Android appelle quand même onRequestClose.
  dismissible?: boolean;
  // Couleur de la feuille (jeton de la palette), surface par défaut
  backgroundColor?: string;
};

// Feuille qui monte du bas sur un voile, ressort « screen ». Le parent la
// monte avec open = true, passe open à false pour la fermer, puis la démonte
// dans onClosed. Animations réduites : simple fondu, sans glissement.
export default function BottomSheet({
  open,
  onRequestClose,
  onClosed,
  children,
  scrim = true,
  dismissible = true,
  backgroundColor,
}: BottomSheetProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { height: windowHeight } = useWindowDimensions();

  const sheetHeight = useSharedValue(windowHeight);
  const translateY = useSharedValue(reduced ? 0 : windowHeight);
  const sheetOpacity = useSharedValue(reduced ? 0 : 1);
  const scrimOpacity = useSharedValue(0);

  useEffect(() => {
    if (open) {
      scrimOpacity.set(withTiming(1, { duration: durations.fade }));
      if (reduced) {
        sheetOpacity.set(withTiming(1, { duration: durations.fade }));
      } else {
        translateY.set(withSpring(0, springs.screen));
      }
      return;
    }

    scrimOpacity.set(withTiming(0, { duration: durations.fade }));
    const finish = (finished?: boolean) => {
      'worklet';
      if (finished) scheduleOnRN(onClosed);
    };
    if (reduced) {
      sheetOpacity.set(withTiming(0, { duration: durations.fade }, finish));
    } else {
      translateY.set(withSpring(sheetHeight.get(), { ...springs.screen, overshootClamping: true }, finish));
    }
  }, [open, reduced, onClosed, scrimOpacity, sheetOpacity, translateY, sheetHeight]);

  const pan = Gesture.Pan()
    .enabled(dismissible)
    .onUpdate((e) => {
      translateY.set(Math.max(0, e.translationY));
    })
    .onEnd((e) => {
      if (e.translationY > sheetHeight.get() * DISMISS_RATIO || e.velocityY > DISMISS_VELOCITY) {
        scheduleOnRN(onRequestClose);
      } else {
        translateY.set(withSpring(0, springs.screen));
      }
    });

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrimOpacity.get() }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.get(),
    transform: [{ translateY: translateY.get() }],
  }));

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onRequestClose}
    >
      <GestureHandlerRootView style={styles.root}>
        <Animated.View
          style={[StyleSheet.absoluteFill, scrim && { backgroundColor: colors.scrim }, scrimStyle]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={dismissible ? onRequestClose : undefined}
            accessible={false}
            importantForAccessibility="no"
          />
        </Animated.View>

        <GestureDetector gesture={pan}>
          <Animated.View
            accessibilityViewIsModal
            onLayout={(e) => sheetHeight.set(e.nativeEvent.layout.height)}
            style={[
              styles.sheet,
              {
                backgroundColor: backgroundColor ?? colors.surface,
                paddingBottom: insets.bottom + space[5],
              },
              !dismissible && styles.fixedSheet,
              sheetStyle,
            ]}
          >
            {dismissible ? (
              <>
                <View style={[styles.handle, { backgroundColor: colors.controlBorder }]} />

                <Pressable
                  onPress={onRequestClose}
                  accessibilityRole="button"
                  accessibilityLabel="Fermer"
                  style={({ pressed }) => [styles.close, pressed && { backgroundColor: colors.surface2 }]}
                >
                  <Ionicons name="close" size={CLOSE_SIZE} color={colors.subtitle} />
                </Pressable>
              </>
            ) : null}

            {children}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderCurve: 'continuous',
    paddingHorizontal: space[5],
    // Pas d'overflow hidden : un halo posé dans la feuille ne doit pas être rogné
  },
  // Sans poignée : la place qu'elle occupait devient une marge
  fixedSheet: {
    paddingTop: space[5],
  },
  handle: {
    alignSelf: 'center',
    width: HANDLE_WIDTH,
    height: HANDLE_HEIGHT,
    borderRadius: radius.pill,
    marginTop: space[2],
  },
  close: {
    position: 'absolute',
    top: space[2],
    right: space[2],
    width: size.tapMin,
    height: size.tapMin,
    borderRadius: size.tapMin / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});
