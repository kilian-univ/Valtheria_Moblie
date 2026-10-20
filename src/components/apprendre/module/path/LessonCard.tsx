import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useReducedMotion,
} from 'react-native-reanimated';

import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import { durations } from '@/src/constants/motion';
import { fonts, ModuleColors, palette, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { LessonView } from '@/src/utils/learning';

const RADIUS = 18;
const TIP = 16;
const TITLE_SIZE = 22;
const TITLE_LINE_HEIGHT = 28;
const BORDER = 1.5;

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

// Carte d'une leçon terminée ou en cours, sous son rond, sur un voile :
// carte sombre à liseré de la couleur de l'univers, bouton doré
// « COMMENCER » (« REFAIRE » pour une leçon terminée). Toucher le voile la
// ferme.
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
  const replay = view.status === 'completed';

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
        {/* Pointe vers le rond, dans la matière et le liseré de la carte */}
        <View
          style={[
            styles.tip,
            { left: pointX - space[5] - TIP / 2, backgroundColor: theme.surface, borderColor: colors.face },
          ]}
        />
        <View style={[styles.body, { backgroundColor: theme.surface, borderColor: colors.face }]}>
          <AppText maxFontSizeMultiplier={1.3} style={[styles.kicker, { color: colors.face }]}>
            {`LEÇON ${view.number} SUR ${view.total}`}
          </AppText>
          <AppText accessibilityRole="header" maxFontSizeMultiplier={1.3} style={styles.title}>
            {view.lesson.title}
          </AppText>
          {replay ? (
            <AppText variant="callout" tone="subtitle">
              Déjà terminée : tu peux la refaire.
            </AppText>
          ) : null}

          <Button
            label={replay ? 'Refaire' : 'Commencer'}
            uppercase
            icon={replay ? 'refresh' : 'play'}
            onPress={() => onStart(view)}
            loading={loading}
            disabled={disabled}
            disabledReason={disabledReason}
            accessibilityHint={replay ? 'Refaire la leçon' : `Commencer la leçon, ${view.lesson.xp_reward} XP à gagner`}
            style={styles.button}
          />
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
  // Carré tourné : seuls ses bords haut et gauche (la pointe) sont visibles
  tip: {
    position: 'absolute',
    top: -TIP / 2 + 2,
    width: TIP,
    height: TIP,
    borderRadius: 3,
    borderTopWidth: BORDER,
    borderLeftWidth: BORDER,
    transform: [{ rotate: '45deg' }],
    zIndex: 1,
  },
  body: {
    borderRadius: RADIUS,
    borderCurve: 'continuous',
    borderWidth: BORDER,
    padding: space[4],
    gap: space[1],
  },
  kicker: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: fonts.title,
    fontSize: TITLE_SIZE,
    lineHeight: TITLE_LINE_HEIGHT,
    letterSpacing: titleLetterSpacing(TITLE_SIZE),
  },
  button: {
    marginTop: space[3],
  },
});
