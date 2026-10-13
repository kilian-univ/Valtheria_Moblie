import { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

// Une tache de lumière (ou d'ombre) radiale : centre et rayon en fractions
// de la surface, couleur au cœur et son opacité, qui s'éteint au bord
export type SheenSpot = { cx: number; cy: number; r: number; color: string; opacity: number };

type SheenProps = {
  // Dessinées dans l'ordre (la dernière par-dessus)
  spots: SheenSpot[];
  // Taille du dessin : celle du parent par défaut
  width?: number;
  height?: number;
};

const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;

// Reflet radial posé sur une face en relief (cartes, bannière, ronds du
// chemin) : donne du volume. Remplit son parent, ne capte aucun toucher.
export default function Sheen({ spots, width, height }: SheenProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const w = width ?? '100%';
  const h = height ?? '100%';
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        {spots.map((s, i) => (
          <RadialGradient key={i} id={`sh${id}${i}`} cx={pct(s.cx)} cy={pct(s.cy)} r={pct(s.r)}>
            <Stop offset="0" stopColor={s.color} stopOpacity={s.opacity} />
            <Stop offset="1" stopColor={s.color} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>
      {spots.map((_, i) => (
        <Rect key={i} x="0" y="0" width={w} height={h} fill={`url(#sh${id}${i})`} />
      ))}
    </Svg>
  );
}
