import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import GroundShadow from '@/src/components/common/GroundShadow';
import ValFullBody from '@/src/components/common/ValFullBody';
import { fonts, palette, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { onboardingStore } from '@/src/state/onboarding';
import { formatInteger } from '@/src/utils/format';

const VAL_HEIGHT = 220;
const SHADOW_W = 132;
const SHADOW_H = 16;
const TITLE_SIZE = 36;
// Le nombre d'univers n'est pas public (GET /themes exige un compte)
const UNIVERSES_COUNT = 15;
const FALLBACK_WORDS = 200;

// Bienvenue : première ouverture, sans compte
export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { get } = useApi();
  const [words, setWords] = useState<number | null>(null);

  // Vrai nombre de mots du dictionnaire (route publique), sinon 200
  useEffect(() => {
    let active = true;
    get('/dictionary')
      .then((data: unknown) => {
        if (active && Array.isArray(data) && data.length > 0) setWords(data.length);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [get]);

  const start = () => {
    onboardingStore.update({ step: 'prenom' });
    router.push('/bienvenue/prenom');
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + space[4] }]} bounces={false}>
        <AppText maxFontSizeMultiplier={1.2} style={styles.brand} accessibilityRole="header" accessibilityLabel="Valtheria">
          VALT<AppText style={[styles.brand, { color: colors.gold }]}>HERIA</AppText>
        </AppText>

        <View style={styles.val}>
          {/* Ombre au sol, sous les pieds de Val (derrière lui) */}
          <View style={styles.shadowRow} pointerEvents="none">
            <View style={styles.shadowBox}>
              <GroundShadow width={SHADOW_W} height={SHADOW_H} opacity={0.55} left={0} top={0} />
            </View>
          </View>
          <ValFullBody pose="saut" height={VAL_HEIGHT} bounce />
        </View>

        <AppText maxFontSizeMultiplier={1.3} style={styles.title}>
          L’argent, <AppText style={[styles.title, styles.italic, { color: colors.gold }]}>enfin</AppText> expliqué.
        </AppText>
        <AppText variant="body" tone="subtitle" style={styles.center}>
          Budget, épargne, placements : Val t’explique tout, simplement, en jouant.
        </AppText>
        <View style={styles.trust} accessible accessibilityLabel={`Gratuit, ${UNIVERSES_COUNT} univers, ${words ?? FALLBACK_WORDS} mots expliqués`}>
          <AppText variant="caption" tone="subtitle">
            Gratuit
          </AppText>
          <AppText variant="caption" style={{ color: colors.textFaint }}>
            |
          </AppText>
          <AppText variant="caption" tone="subtitle">{`${UNIVERSES_COUNT} univers`}</AppText>
          <AppText variant="caption" style={{ color: colors.textFaint }}>
            |
          </AppText>
          <AppText variant="caption" tone="subtitle">{`${formatInteger(words ?? FALLBACK_WORDS)} mots expliqués`}</AppText>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space[3] }]}>
        <Button label="Essayer une leçon, 1 minute" onPress={start} />
        <Button variant="text" label="J'ai déjà un compte" onPress={() => router.push('/client/login')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: space[6],
    alignItems: 'center',
    gap: space[3],
  },
  brand: {
    fontFamily: fonts.title,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 3,
    textAlign: 'center',
  },
  val: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: space[4],
    marginBottom: space[3],
  },
  shadowRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -SHADOW_H / 2,
    alignItems: 'center',
  },
  shadowBox: {
    width: SHADOW_W,
    height: SHADOW_H,
  },
  title: {
    fontFamily: fonts.title,
    fontSize: TITLE_SIZE,
    lineHeight: 42,
    letterSpacing: titleLetterSpacing(TITLE_SIZE),
    textAlign: 'center',
  },
  italic: {
    fontFamily: fonts.titleItalic,
  },
  center: {
    textAlign: 'center',
  },
  trust: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space[4] - 4,
    marginTop: space[1],
  },
  footer: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
    gap: space[1],
  },
});
