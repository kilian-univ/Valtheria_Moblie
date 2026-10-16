import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { fonts, palette } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { useCountUp } from '@/src/hooks/useCountUp';

type ProgressRingProps = {
  // De 0 à 1
  progress: number;
  diameter: number;
  stroke: number;
  // Texte au centre (pourcentage, « 3/8 »…) ; absent : centre vide
  label?: string;
  labelSize?: number;
  // Terminé : rond doré plein avec une coche
  done?: boolean;
  accessibilityLabel?: string;
  // L'arc se remplit à l'apparition (animations réduites : directement)
  animated?: boolean;
  // Délai avant le remplissage (ms)
  delay?: number;
  // Couleur de l'arc (or par défaut) et de la piste (surface par défaut)
  color?: string;
  trackColor?: string;
  // Contenu au centre (photo de profil) à la place du libellé
  children?: ReactNode;
};

// Anneau de progression. Pas commencé (progress 0, sans label) : anneau vide
// en controlBorder. En cours : fond surface, arc doré depuis midi.
export default function ProgressRing({
  progress,
  diameter,
  stroke,
  label,
  labelSize = 11,
  done = false,
  accessibilityLabel,
  animated = false,
  delay = 0,
  color,
  trackColor,
  children,
}: ProgressRingProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  // Remplissage à l'apparition : de 0 à la valeur (useCountUp gère les
  // animations réduites)
  const shown = useCountUp(clamped, { from: animated ? 0 : clamped, delay });
  const empty = clamped === 0 && !done && !children;

  const a11y = {
    accessible: !!accessibilityLabel,
    accessibilityLabel,
    accessibilityElementsHidden: !accessibilityLabel,
    importantForAccessibility: accessibilityLabel ? ('yes' as const) : ('no-hide-descendants' as const),
  };

  if (done) {
    return (
      <View
        {...a11y}
        style={[styles.center, { width: diameter, height: diameter, borderRadius: diameter / 2, backgroundColor: colors.gold }]}
      >
        <Ionicons name="checkmark" size={diameter * 0.5} color={colors.onGold} />
      </View>
    );
  }

  const r = (diameter - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const c = diameter / 2;

  return (
    <View {...a11y} style={[styles.center, { width: diameter, height: diameter }]}>
      <Svg width={diameter} height={diameter} style={StyleSheet.absoluteFill}>
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={empty ? colors.controlBorder : (trackColor ?? colors.surface)}
          strokeWidth={stroke}
          fill="none"
        />
        {!empty && shown > 0 ? (
          <Circle
            cx={c}
            cy={c}
            r={r}
            stroke={color ?? colors.gold}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - shown)}
            fill="none"
            // L'arc démarre à midi
            transform={`rotate(-90 ${c} ${c})`}
          />
        ) : null}
      </Svg>
      {children}
      {label ? (
        <Text
          maxFontSizeMultiplier={1.2}
          style={[styles.label, { color: colors.text, fontSize: labelSize, lineHeight: labelSize * 1.25 }]}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.bodySemibold,
    fontVariant: ['tabular-nums'],
  },
});
