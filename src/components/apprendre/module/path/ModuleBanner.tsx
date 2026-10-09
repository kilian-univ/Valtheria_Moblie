import { Ionicons } from '@expo/vector-icons';
import { useId } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import AppText from '@/src/components/common/AppText';
import { fonts, ModuleColors, palette, radius, space, titleLetterSpacing, withOpacity } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

const RADIUS = 18;
const EDGE = 6;
const LABEL_SIZE = 11;
const LABEL_SPACING = 1.2;
const TITLE_SIZE = 19;
const TITLE_LINE_HEIGHT = 24;
const GUIDE_ICON = 26;
const GUIDE_ZONE = 48;
const RULE_W = 1;
const BAR_H = 6;
// Même reflet que les ronds du chemin
const HIGHLIGHT_OPACITY = 0.35;
const HIGHLIGHT_REACH = 0.42;

type ModuleBannerProps = {
  // « MODULE 3, 2 LEÇONS SUR 5 »
  label: string | null;
  title: string;
  // Leçons terminées, de 0 à 1
  progress: number;
  colors: ModuleColors;
  // Bouton guide (bannière du module affiché)
  onGuide?: () => void;
  // Bannière entière touchable (module suivant, en bas du chemin)
  onPress?: () => void;
  accessibilityHint?: string;
};

// Bannière en relief d'un module : libellé, titre, fine barre de progression
export default function ModuleBanner({
  label,
  title,
  progress,
  colors,
  onGuide,
  onPress,
  accessibilityHint,
}: ModuleBannerProps) {
  const { colorScheme } = useTheme();
  const theme = palette[colorScheme];
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));

  const face = (
    <View style={[styles.face, { backgroundColor: colors.face }]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id={`b${id}`} cx="22%" cy="20%" r={`${HIGHLIGHT_REACH * 100}%`}>
            <Stop offset="0" stopColor={theme.nodeHighlight} stopOpacity={HIGHLIGHT_OPACITY} />
            <Stop offset="1" stopColor={theme.nodeHighlight} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#b${id})`} />
      </Svg>

      <View style={styles.titles}>
        {label ? (
          <AppText maxFontSizeMultiplier={1.2} style={[styles.label, { color: withOpacity(colors.onFace, 0.7) }]}>
            {label}
          </AppText>
        ) : null}
        <AppText
          accessibilityRole="header"
          maxFontSizeMultiplier={1.3}
          numberOfLines={2}
          style={[styles.title, { color: colors.onFace }]}
        >
          {title}
        </AppText>
        <View style={[styles.bar, { backgroundColor: withOpacity(colors.onFace, 0.18) }]}>
          <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: withOpacity(colors.onFace, 0.55) }]} />
        </View>
      </View>

      {onGuide ? (
        <>
          <View style={[styles.rule, { backgroundColor: withOpacity(colors.onFace, 0.2) }]} />
          <Pressable
            onPress={onGuide}
            accessibilityRole="button"
            accessibilityLabel="Guide du module"
            accessibilityHint="Description et liste des leçons"
            style={styles.guide}
          >
            <Ionicons name="book-outline" size={GUIDE_ICON} color={colors.onFace} />
          </Pressable>
        </>
      ) : null}
    </View>
  );

  const body = (
    <>
      <View style={[styles.edge, { backgroundColor: colors.deep }]} />
      {face}
    </>
  );

  return onPress ? (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label ? `${label}, ` : ''}${title}`}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  ) : (
    <View style={styles.wrap}>{body}</View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: EDGE,
  },
  pressed: {
    transform: [{ translateY: EDGE / 2 }],
  },
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: EDGE,
    borderRadius: RADIUS,
    borderCurve: 'continuous',
  },
  face: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    borderRadius: RADIUS,
    borderCurve: 'continuous',
    paddingVertical: space[3],
    paddingLeft: space[4],
    paddingRight: space[2],
    overflow: 'hidden',
  },
  titles: {
    flex: 1,
    gap: space[1],
    paddingRight: space[2],
  },
  label: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: LABEL_SIZE,
    lineHeight: 14,
    letterSpacing: LABEL_SPACING,
  },
  title: {
    fontFamily: fonts.title,
    fontSize: TITLE_SIZE,
    lineHeight: TITLE_LINE_HEIGHT,
    letterSpacing: titleLetterSpacing(TITLE_SIZE),
  },
  bar: {
    height: BAR_H,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginTop: space[1],
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  rule: {
    width: RULE_W,
    alignSelf: 'stretch',
  },
  guide: {
    width: GUIDE_ZONE,
    height: GUIDE_ZONE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
