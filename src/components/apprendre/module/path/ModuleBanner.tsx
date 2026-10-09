import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { fonts, ModuleColors, space, titleLetterSpacing, withOpacity } from '@/src/constants/style/Style';

const RADIUS = 18;
const EDGE = 6;
const LABEL_SIZE = 11;
const LABEL_SPACING = 1.2;
const TITLE_SIZE = 22;
const TITLE_LINE_HEIGHT = 28;
const GUIDE_ICON = 26;
const GUIDE_ZONE = 48;
const RULE_W = 1;

type ModuleBannerProps = {
  // « MODULE 3 » (bientôt « UNIVERS <nom> »)
  label: string | null;
  title: string;
  colors: ModuleColors;
  onGuide: () => void;
};

// Bannière en relief du module, fixée en haut au défilement
export default function ModuleBanner({ label, title, colors, onGuide }: ModuleBannerProps) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.edge, { backgroundColor: colors.deep }]} />
      <View style={[styles.face, { backgroundColor: colors.face }]}>
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
        </View>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: EDGE,
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
  },
  titles: {
    flex: 1,
    gap: space[1] / 2,
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
