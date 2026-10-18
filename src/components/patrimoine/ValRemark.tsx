import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { ValAvatar } from '@/src/components/common/ValBubble';
import { fonts, palette, radius, space, withOpacity } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { useLearningSnapshot } from '@/src/hooks/useLearningData';
import { tap } from '@/src/utils/haptics';
import { lessonHref } from '@/src/utils/patrimoine/lessonLink';
import type { LessonTarget } from '@/src/utils/patrimoine/valTips';

// Remarque de Val reliée à une leçon (toucher la carte ouvre le module) :
// patrimoine et budget
export default function ValRemark({ tip }: { tip: { text: string; link: LessonTarget } }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { modules, universes } = useLearningSnapshot();
  const open = () => {
    tap();
    router.push(lessonHref(tip.link, modules, universes) as never);
  };
  return (
    <Pressable
      onPress={open}
      accessibilityRole="link"
      accessibilityLabel={`Val : ${tip.text} ${tip.link.label}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: withOpacity(colors.gold, pressed ? 0.12 : 0.07), borderColor: withOpacity(colors.gold, 0.25) },
      ]}
    >
      <ValAvatar mood="complice" diameter={46} />
      <View style={styles.body}>
        <AppText variant="callout">
          {tip.text}{' '}
          <AppText variant="callout" style={[styles.link, { color: colors.gold }]}>
            {tip.link.label}
          </AppText>
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[3],
    paddingHorizontal: 14,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  body: { flex: 1 },
  link: { fontFamily: fonts.bodyBold },
});
