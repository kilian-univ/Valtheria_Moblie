import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { fonts, palette, titleLetterSpacing } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import Sheen from './Sheen';

// Seul emoji autorisé de l'app (validé) : la flamme de la série
const FLAME = '\u{1F525}';
const LOCKED_OPACITY = 0.42;
// Sous cette taille, le nombre se lirait mal : cadenas seul
const NUMBER_MIN_SIZE = 40;

type StreakMedalProps = {
  // Palier (3, 7, 14…), ou valeur du défi (10 d'affilée, 10 leçons parfaites)
  days: number;
  size: number;
  earned: boolean;
  // streak : médaille de série (flamme) ; run : défi d'affilée (éclair) ;
  // perfect : défi de leçons parfaites (éclair, petite étoile sur le nombre)
  kind?: 'streak' | 'run' | 'perfect';
};

// Médaille de série dessinée en code : médaillon rond en relief (face or,
// tranche or foncé, reflet), nombre de jours en Fraunces au centre, petite
// flamme au-dessus. Défi de précision : même médaille, un éclair dans une
// pastille à la place de la flamme. Pas encore gagnée : grise, atténuée,
// avec un cadenas. Décorative : le parent porte le libellé lu.
export default function StreakMedal({ days, size, earned, kind = 'streak' }: StreakMedalProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const depth = Math.max(2, Math.round(size * 0.07));
  const face = earned ? colors.gold : colors.surface2;
  const edge = earned ? colors.goldDeep : colors.surfaceEdge;
  const ink = earned ? colors.onGold : colors.subtitle;
  const number = Math.round(size * (days >= 100 ? 0.3 : 0.38));
  const flame = Math.round(size * 0.3);
  const showNumber = size >= NUMBER_MIN_SIZE || earned;

  return (
    <View
      style={{ width: size, height: size + depth, opacity: earned ? 1 : LOCKED_OPACITY }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      <View style={[styles.disc, { top: depth, width: size, height: size, borderRadius: size / 2, backgroundColor: edge }]} />
      <View style={[styles.disc, styles.face, { width: size, height: size, borderRadius: size / 2, backgroundColor: face }]}>
        {earned ? <Sheen spots={[{ cx: 0.32, cy: 0.26, r: 0.55, color: colors.nodeHighlight, opacity: 0.45 }]} /> : null}
        {/* Anneau intérieur : le médaillon */}
        <View
          style={[
            styles.ring,
            { inset: Math.round(size * 0.09), borderRadius: size / 2, borderColor: earned ? colors.goldDeep : colors.controlBorder },
          ]}
        />
        {showNumber && kind === 'perfect' ? (
          <Ionicons name="star" size={Math.round(size * 0.16)} color={ink} style={{ marginBottom: -Math.round(size * 0.04) }} />
        ) : null}
        {showNumber ? (
          <Text
            allowFontScaling={false}
            style={{ fontFamily: fonts.title, fontSize: number, lineHeight: Math.round(number * 1.15), color: ink, letterSpacing: titleLetterSpacing(number) }}
          >
            {days}
          </Text>
        ) : null}
      </View>
      {earned && kind !== 'streak' ? (
        // Éclair : pastille sombre cerclée d'or, posée sur le haut du médaillon
        <View
          style={[
            styles.bolt,
            {
              width: flame,
              height: flame,
              borderRadius: flame / 2,
              top: -Math.round(flame * 0.45),
              backgroundColor: colors.surface,
              borderColor: colors.gold,
            },
          ]}
        >
          <Ionicons name="flash" size={Math.round(flame * 0.62)} color={colors.gold} />
        </View>
      ) : earned ? (
        <Text allowFontScaling={false} style={[styles.flame, { fontSize: flame, lineHeight: Math.round(flame * 1.2), top: -Math.round(flame * 0.55) }]}>
          {FLAME}
        </Text>
      ) : (
        <View
          style={[
            styles.lock,
            {
              width: Math.round(size * 0.42),
              height: Math.round(size * 0.42),
              borderRadius: size,
              backgroundColor: colors.surface,
              right: -Math.round(size * 0.06),
              bottom: 0,
            },
          ]}
        >
          <Ionicons name="lock-closed" size={Math.round(size * 0.24)} color={colors.subtitle} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    position: 'absolute',
    left: 0,
  },
  face: {
    top: 0,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  flame: {
    position: 'absolute',
    alignSelf: 'center',
  },
  bolt: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  lock: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
