import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import IconButton from '@/src/components/common/IconButton';
import IvoryButton from '@/src/components/common/IvoryButton';
import { fonts, ModuleColors, palette, radius, space, titleLetterSpacing, withOpacity } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

const DEPTH = 6;
const RADIUS = 20;
const PAD = 18;
const TITLE_SIZE = 24;
const BAR = 8;
const BAR_TRACK = 0.18;
const SHINE = 0.22;

type ObjectiveCardProps = {
  // Libellé de l'objectif (« Commencer à investir »)
  label: string;
  // Couleur de l'univers lié à l'objectif
  tint: ModuleColors;
  done: number;
  total: number;
  onEdit: () => void;
  onContinue: () => void;
};

// Carte « TON OBJECTIF » en relief, à la couleur de l'univers de l'objectif
// (même table que les leçons découvertes), texte sombre : l'objectif et son
// crayon, la progression dans l'univers, et le bouton ivoire.
export default function ObjectiveCard({ label, tint, done, total, onEdit, onContinue }: ObjectiveCardProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const ratio = total > 0 ? Math.min(1, done / total) : 0;
  const ink = tint.onFace;
  return (
    <View style={styles.wrap}>
      <View style={[styles.edge, { backgroundColor: tint.deep }]} />
      <View style={[styles.face, { backgroundColor: tint.face }]}>
        <LinearGradient
          colors={[withOpacity(colors.ivory, SHINE), withOpacity(colors.ivory, 0)]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.6, y: 0.7 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <AppText maxFontSizeMultiplier={1.3} style={[styles.kicker, { color: ink }]}>
          TON OBJECTIF
        </AppText>
        <View style={styles.titleRow}>
          <AppText maxFontSizeMultiplier={1.3} style={[styles.title, { color: ink }]} accessibilityRole="header">
            {label}
          </AppText>
          <IconButton
            icon="pencil"
            iconSize={18}
            color={ink}
            variant="plain"
            onPress={onEdit}
            accessibilityLabel="Changer d’objectif"
            accessibilityHint="Ouvre la liste des six objectifs"
            style={styles.pencil}
          />
        </View>
        {total > 0 ? (
          <View
            style={styles.progress}
            accessible
            accessibilityLabel={`${done} ${done > 1 ? 'leçons terminées' : 'leçon terminée'} sur ${total}`}
          >
            <View style={[styles.track, { backgroundColor: withOpacity(ink, BAR_TRACK) }]}>
              <View style={[styles.fill, { width: `${Math.round(ratio * 1000) / 10}%`, backgroundColor: ink }]} />
            </View>
            <AppText maxFontSizeMultiplier={1.3} style={[styles.count, { color: ink }]}>
              {`${done} / ${total}`}
            </AppText>
          </View>
        ) : null}
        <IvoryButton label="Continuer vers ton objectif" color={tint.deep} onPress={onContinue} fullWidth style={styles.button} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: DEPTH,
  },
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: DEPTH,
    bottom: 0,
    borderRadius: RADIUS,
    borderCurve: 'continuous',
  },
  face: {
    padding: PAD,
    borderRadius: RADIUS,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  kicker: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    marginTop: space[1] + 2,
  },
  title: {
    flexShrink: 1,
    fontFamily: fonts.title,
    fontSize: TITLE_SIZE,
    lineHeight: 28,
    letterSpacing: titleLetterSpacing(TITLE_SIZE),
  },
  pencil: {
    marginVertical: -space[2],
  },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2] + 2,
    marginTop: space[3],
  },
  track: {
    flex: 1,
    height: BAR,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  count: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    lineHeight: 18,
    fontVariant: ['tabular-nums'],
  },
  button: {
    marginTop: space[4],
  },
});
