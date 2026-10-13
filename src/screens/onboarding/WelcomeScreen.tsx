import { useRouter } from 'expo-router';
import { ReactNode, useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StatusBarShade } from '@/src/components/common/AppBackground';
import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import Pill from '@/src/components/common/Pill';
import VaultScene, { VAULT_RATIO } from '@/src/components/onboarding/VaultScene';
import { springs } from '@/src/constants/motion';
import { fonts, palette, space, titleLetterSpacing, withOpacity } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { onboardingStore } from '@/src/state/onboarding';
import { track } from '@/src/utils/track';
import { trustPills } from '@/src/utils/welcome';

const TITLE_SIZE = 38;
const VAL_LINE = 'Salut ! Moi, c’est Val.';
// Scène du coffre : environ la moitié haute de l'écran ; sa hauteur est ce qui
// reste une fois posés le texte et les boutons (iPhone SE compris), sans
// dépasser l'image entière
const SCENE_MIN = 280;
const RESERVED = 380;
const RESERVED_PER_FONT_SCALE = 200;

// Cascade du texte et des boutons, après la lumière, Val et la bulle (1,2 s au
// plus en tout)
const CASCADE_START = 600;
const CASCADE_STEP = 80;
const REVEAL_FADE = 260;
const REVEAL_RISE = 8;
// La bande de la barre d'état n'apparaît qu'une fois l'écran défilé (avant,
// le décor passe sous l'heure, assombri)
const SHADE_SCROLL = 16;

// Bienvenue : le tout premier écran, sans compte. En haut, le décor du
// coffre-fort entrouvert, Val debout dans sa lumière et sa bulle ; dessous, la
// promesse, deux pastilles de confiance, puis « Commencer » dans la zone du
// pouce. Les boutons répondent dès la première image.
export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { get } = useApi();
  const { width, height, fontScale } = useWindowDimensions();
  const [words, setWords] = useState<number | null>(null);

  useEffect(() => {
    track('bienvenue_vue');
  }, []);

  // Vrai nombre de mots du dictionnaire (route publique) ; indisponible : la
  // pastille ne s'affiche pas
  useEffect(() => {
    let active = true;
    get('/dictionary')
      .then((data: unknown) => {
        if (active && Array.isArray(data)) setWords(data.length);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [get]);

  const start = () => {
    track('bienvenue_commencer');
    onboardingStore.update({ step: 'prenom' });
    router.push('/bienvenue/prenom');
  };

  const login = () => {
    track('bienvenue_deja_compte');
    router.push('/client/login');
  };

  const reserved = RESERVED + insets.bottom + Math.max(0, fontScale - 1) * RESERVED_PER_FONT_SCALE;
  const sceneHeight = Math.round(Math.min(width / VAULT_RATIO, Math.max(SCENE_MIN, height - reserved)));

  // Bande de la barre d'état, seulement une fois l'écran défilé
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });
  const shadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [0, SHADE_SCROLL], [0, 1], 'clamp'),
  }));

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        contentContainerStyle={styles.content}
        bounces={false}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <VaultScene width={width} height={sceneHeight} topInset={insets.top} tab="apprendre" line={VAL_LINE} />

        <View style={styles.texts}>
          <Reveal delay={CASCADE_START}>
            <AppText maxFontSizeMultiplier={1.3} style={styles.title} accessibilityRole="header">
              L’argent, <AppText style={[styles.title, styles.italic, { color: colors.gold }]}>enfin</AppText>
              {'\n'}expliqué.
            </AppText>
          </Reveal>
          <Reveal delay={CASCADE_START + CASCADE_STEP}>
            <AppText variant="body" tone="subtitle" style={styles.center}>
              Budget, épargne, placements : je t’explique tout, simplement, en jouant.
            </AppText>
          </Reveal>
          <Reveal delay={CASCADE_START + CASCADE_STEP * 2}>
            <View style={styles.pills}>
              {trustPills(words).map((pill) => (
                <Pill
                  key={pill.key}
                  size="md"
                  icon={pill.icon}
                  label={pill.label}
                  background={withOpacity(colors.text, 0.05)}
                  borderColor={colors.border}
                  color={colors.text}
                  iconColor={colors.gold}
                />
              ))}
            </View>
          </Reveal>
        </View>
      </Animated.ScrollView>

      {/* Zone du pouce : toujours visible, touchable dès la première image */}
      <Reveal delay={CASCADE_START + CASCADE_STEP * 3} rise={false}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + space[2] }]}>
          <Button label="Commencer" onPress={start} />
          <AppText variant="caption" tone="subtitle" style={styles.center}>
            Une leçon d’une minute, sans inscription.
          </AppText>
          <Button variant="text" label="J’ai déjà un compte" onPress={login} />
        </View>
      </Reveal>

      {/* Rien ne passe sous la barre d'état en défilant */}
      <Animated.View style={[StyleSheet.absoluteFill, shadeStyle]} pointerEvents="none">
        <StatusBarShade tab="apprendre" />
      </Animated.View>
    </View>
  );
}

// Apparition en cascade (fondu et légère montée) après `delay`. Ne bloque
// jamais le toucher : le contenu est touchable dès la première image.
// Animations réduites : affiché directement.
function Reveal({ delay, rise = true, children }: { delay: number; rise?: boolean; children: ReactNode }) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(reduced ? 1 : 0);
  const offset = useSharedValue(reduced || !rise ? 0 : REVEAL_RISE);

  useEffect(() => {
    if (reduced) return;
    opacity.set(withDelay(delay, withTiming(1, { duration: REVEAL_FADE })));
    if (rise) offset.set(withDelay(delay, withSpring(0, springs.enter)));
  }, [reduced, delay, rise, opacity, offset]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ translateY: offset.get() }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: space[3],
  },
  texts: {
    paddingHorizontal: space[6],
    paddingTop: space[2],
    alignItems: 'center',
    gap: space[3],
  },
  title: {
    fontFamily: fonts.title,
    fontSize: TITLE_SIZE,
    lineHeight: 43,
    letterSpacing: titleLetterSpacing(TITLE_SIZE),
    textAlign: 'center',
  },
  italic: {
    fontFamily: fonts.titleItalic,
  },
  center: {
    textAlign: 'center',
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space[2],
    marginTop: space[1],
  },
  footer: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
    gap: space[1],
  },
});
