import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useReducedMotion,
} from 'react-native-reanimated';

import AppText from '@/src/components/common/AppText';
import { durations } from '@/src/constants/motion';
import {
  fonts,
  ModuleColors,
  opacityDisabled,
  palette,
  reliefDepth,
  size,
  space,
  titleLetterSpacing,
  withOpacity,
} from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { tap } from '@/src/utils/haptics';
import { LessonView } from '@/src/utils/learning';
import { useReliefPress } from '@/src/hooks/useReliefPress';

const RADIUS = 18;
const TIP = 16;
const TITLE_SIZE = 22;
const TITLE_LINE_HEIGHT = 28;
const META_SIZE = 14;
const BUTTON_TEXT = 16;

type LessonCardProps = {
  view: LessonView;
  colors: ModuleColors;
  // Position de la carte dans l'écran, et centre horizontal du rond visé
  top: number;
  pointX: number;
  onClose: () => void;
  onStart: (view: LessonView) => void;
  disabled: boolean;
  disabledReason?: string;
  loading: boolean;
};

// Carte d'une leçon terminée ou en cours, sous son rond, sur un voile.
// Toucher le voile la ferme.
export default function LessonCard({
  view,
  colors,
  top,
  pointX,
  onClose,
  onStart,
  disabled,
  disabledReason,
  loading,
}: LessonCardProps) {
  const { colorScheme } = useTheme();
  const theme = palette[colorScheme];
  const reduced = useReducedMotion();
  const { faceStyle, onPressIn, onPressOut } = useReliefPress();

  const replay = view.status === 'completed';
  const label = replay ? 'REFAIRE' : `COMMENCER + ${view.lesson.xp_reward} XP`;
  const inactive = disabled || loading;

  const fade = reduced ? undefined : FadeIn.duration(durations.fade);
  const fadeOut = reduced ? undefined : FadeOut.duration(durations.fade);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View entering={fade} exiting={fadeOut} style={[StyleSheet.absoluteFill, { backgroundColor: theme.pathScrim }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fermer la carte de la leçon"
        />
      </Animated.View>

      <Animated.View entering={fade} exiting={fadeOut} style={[styles.card, { top }]} accessibilityViewIsModal>
        {/* Pointe vers le rond */}
        <View style={[styles.tip, { left: pointX - space[5] - TIP / 2, backgroundColor: colors.face }]} />
        <View style={[styles.body, { backgroundColor: colors.face }]}>
          <AppText accessibilityRole="header" maxFontSizeMultiplier={1.3} style={[styles.title, { color: colors.onFace }]}>
            {view.lesson.title}
          </AppText>
          <AppText maxFontSizeMultiplier={1.4} style={[styles.meta, { color: withOpacity(colors.onFace, 0.75) }]}>
            {`Leçon ${view.number} sur ${view.total}`}
          </AppText>

          <Pressable
            onPress={() => {
              tap();
              onStart(view);
            }}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            disabled={inactive}
            accessibilityRole="button"
            accessibilityLabel={replay ? 'Refaire la leçon' : `Commencer la leçon, ${view.lesson.xp_reward} XP à gagner`}
            accessibilityHint={disabled && disabledReason ? disabledReason : undefined}
            accessibilityState={{ disabled: inactive, busy: loading }}
            style={[styles.buttonWrap, disabled && !loading && styles.disabled]}
          >
            <View style={[styles.buttonEdge, { backgroundColor: theme.cardEdge }]} />
            <Animated.View style={[styles.buttonFace, { backgroundColor: theme.text }, faceStyle]}>
              {loading ? <ActivityIndicator size="small" color={colors.deep} /> : null}
              <AppText maxFontSizeMultiplier={1.3} style={[styles.buttonText, { color: colors.deep }]}>
                {label}
              </AppText>
            </Animated.View>
          </Pressable>
          {disabled && disabledReason ? (
            <AppText variant="caption" style={{ color: withOpacity(colors.onFace, 0.75) }}>
              {disabledReason}
            </AppText>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: space[5],
    right: space[5],
  },
  tip: {
    position: 'absolute',
    top: -TIP / 2 + 2,
    width: TIP,
    height: TIP,
    borderRadius: 3,
    transform: [{ rotate: '45deg' }],
  },
  body: {
    borderRadius: RADIUS,
    borderCurve: 'continuous',
    padding: space[4],
    gap: space[2],
  },
  title: {
    fontFamily: fonts.title,
    fontSize: TITLE_SIZE,
    lineHeight: TITLE_LINE_HEIGHT,
    letterSpacing: titleLetterSpacing(TITLE_SIZE),
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: META_SIZE,
    lineHeight: 20,
  },
  buttonWrap: {
    marginTop: space[2],
    paddingBottom: reliefDepth,
  },
  buttonEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: reliefDepth,
    borderRadius: 14,
    borderCurve: 'continuous',
  },
  buttonFace: {
    minHeight: size.buttonHeight,
    borderRadius: 14,
    borderCurve: 'continuous',
    flexDirection: 'row',
    gap: space[2],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[4],
  },
  buttonText: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: BUTTON_TEXT,
    lineHeight: 20,
    textAlign: 'center',
  },
  disabled: {
    opacity: opacityDisabled,
  },
});
