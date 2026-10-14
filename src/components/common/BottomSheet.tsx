import { ReactNode, useEffect } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { motion, springs, timing } from '@/src/constants/motion';
import { palette, radius, size, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import IconButton from './IconButton';

const HANDLE_WIDTH = 36;
const HANDLE_HEIGHT = 5;
const CLOSE_SIZE = 22;
// Glisser au-delà du quart de la feuille, ou d'un geste vif, la ferme
const DISMISS_RATIO = 0.25;
const DISMISS_VELOCITY = 800;
// Feuille repliable : distance ou vitesse qui fait changer de position, et
// longueur maximale du tirage vers le haut (la feuille reste posée en bas)
const COLLAPSE_DISTANCE = 40;
const COLLAPSE_VELOCITY = 600;
const MAX_PULL_UP = 24;

// Changement de hauteur entre les deux positions : ressort « screen ».
// Animations réduites : passage direct (ReduceMotion.System).
const collapseTransition = LinearTransition.springify()
  .damping(springs.screen.damping)
  .stiffness(springs.screen.stiffness)
  .mass(springs.screen.mass)
  .reduceMotion(ReduceMotion.System);

export type SheetCollapse = {
  collapsed: boolean;
  onChange: (collapsed: boolean) => void;
};

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
  // Feuille non fermable à deux positions (dépliée / repliée) : poignée,
  // glissé vers le bas pour replier, vers le haut pour déplier. Le parent
  // choisit le contenu de chaque position.
  collapse?: SheetCollapse;
};

// Feuille qui monte du bas sur un voile (250 ms, ease-out). Le parent la
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
  collapse,
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
    // Monte du bas en 250 ms (ease-out), redescend de même
    if (open) {
      scrimOpacity.set(withTiming(1, timing(motion.sheet)));
      if (reduced) {
        sheetOpacity.set(withTiming(1, timing(motion.state)));
      } else {
        translateY.set(withTiming(0, timing(motion.sheet)));
      }
      return;
    }

    scrimOpacity.set(withTiming(0, timing(motion.sheet)));
    const finish = (finished?: boolean) => {
      'worklet';
      if (finished) scheduleOnRN(onClosed);
    };
    if (reduced) {
      sheetOpacity.set(withTiming(0, timing(motion.state), finish));
    } else {
      translateY.set(withTiming(sheetHeight.get(), timing(motion.sheet), finish));
    }
  }, [open, reduced, onClosed, scrimOpacity, sheetOpacity, translateY, sheetHeight]);

  const collapsible = !dismissible && collapse !== undefined;
  const collapsed = collapse?.collapsed ?? false;
  const onCollapseChange = collapse?.onChange;

  const setCollapsed = (next: boolean) => {
    if (next !== collapsed) onCollapseChange?.(next);
  };

  const pan = Gesture.Pan()
    .enabled(dismissible || collapsible)
    .onUpdate((e) => {
      translateY.set(collapsible ? Math.max(-MAX_PULL_UP, e.translationY) : Math.max(0, e.translationY));
    })
    .onEnd((e) => {
      if (collapsible) {
        const down = e.translationY > COLLAPSE_DISTANCE || e.velocityY > COLLAPSE_VELOCITY;
        const up = e.translationY < -COLLAPSE_DISTANCE || e.velocityY < -COLLAPSE_VELOCITY;
        if (down) scheduleOnRN(setCollapsed, true);
        else if (up) scheduleOnRN(setCollapsed, false);
        translateY.set(reduced ? 0 : withSpring(0, springs.screen));
        return;
      }
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
            layout={collapsible ? collapseTransition : undefined}
            onLayout={(e) => sheetHeight.set(e.nativeEvent.layout.height)}
            style={[
              styles.sheet,
              {
                backgroundColor: backgroundColor ?? colors.surface,
                paddingBottom: insets.bottom + space[5],
              },
              !dismissible && !collapsible && styles.fixedSheet,
              sheetStyle,
            ]}
          >
            {dismissible ? (
              <>
                <View style={[styles.handle, { backgroundColor: colors.controlBorder }]} />

                <IconButton
                  icon="close"
                  iconSize={CLOSE_SIZE}
                  color={colors.subtitle}
                  onPress={onRequestClose}
                  accessibilityLabel="Fermer"
                  style={styles.close}
                />
              </>
            ) : null}

            {collapsible ? (
              <Pressable
                onPress={() => setCollapsed(!collapsed)}
                accessibilityRole="button"
                accessibilityLabel={collapsed ? 'Déplier la correction' : 'Replier la correction'}
                hitSlop={space[3]}
                style={styles.handleZone}
              >
                <View style={[styles.handle, styles.handleInZone, { backgroundColor: colors.controlBorder }]} />
              </Pressable>
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
  // Poignée d'une feuille repliable : elle se touche aussi
  handleZone: {
    alignSelf: 'center',
    paddingVertical: space[2],
    paddingHorizontal: space[6],
    marginBottom: space[1],
  },
  handleInZone: {
    marginTop: 0,
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
