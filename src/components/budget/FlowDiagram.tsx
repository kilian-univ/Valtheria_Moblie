import { memo, useId } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { fonts, moduleColors, palette } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { FAMILY_NAMES, type FlowFamily, type Poste, type Source } from '@/src/utils/budget/flows';
import { bandPath, layoutFlow, share } from '@/src/utils/budget/flowLayout';
import { euros } from '@/src/utils/budget/format';
import { NBSP } from '@/src/utils/frenchSpaces';
import { select } from '@/src/utils/haptics';
import { familyColors } from './SplitBar';

// Couleurs du diagramme : les trois familles de la maquette, et une teinte
// neutre pour la bande « Dépenses courantes » du mode Essentiel
export function flowColors(colors: (typeof palette)['dark']): Record<FlowFamily, string> {
  return { ...familyColors(colors), courantes: moduleColors.ivoire.deep };
}

const NODE = 6;
const BAND_OPACITY = 0.55;
const BAND_DIM = 0.1;
const NODE_DIM = 0.35;

type Geometry = {
  root: number;
  family: number;
  poste: number;
  source: number | null;
  padTop: number;
  padBottom: number;
  minSlot: number;
  gap: number;
  groupGap: number;
  name: number;
  value: number;
  familyName: number;
};

// Positions sur la largeur donnée. Portrait : les postes collés au bord
// droit, leur nom et leur montant écrits sur les bandes. Paysage (maquette,
// sur 760) : les postes un peu plus à gauche pour que nom et montant tiennent
// sur une ligne.
function geometry(variant: 'portrait' | 'paysage', width: number): Geometry {
  if (variant === 'portrait') {
    return { root: 0, family: Math.round(width * 0.36), poste: width - NODE, source: null, padTop: 14, padBottom: 14, minSlot: 34, gap: 12, groupGap: 26, name: 12, value: 11, familyName: 13 };
  }
  const s = width / 760;
  return { root: 230 * s, family: 400 * s, poste: 490 * s, source: 90 * s, padTop: 26, padBottom: 6, minSlot: 20, gap: 10, groupGap: 22, name: 13, value: 13, familyName: 14 };
}

type Props = {
  variant: 'portrait' | 'paysage';
  postes: readonly Poste[];
  sources: readonly Source[];
  width: number;
  height: number;
  focus: FlowFamily | null;
  onFocus: (family: FlowFamily | null) => void;
  summary: string;
};

// Diagramme de flux (maquette, écrans 3, 3 bis et 3 ter) : nœuds fins, flux
// en dégradé du vert des rentrées vers la couleur de chaque famille. Toucher
// une famille met son chemin en avant et estompe le reste. Dessin fixe, sans
// animation : rien à réduire.
function FlowDiagram({ variant, postes, sources, width, height, focus, onFocus, summary }: Props) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const tint = flowColors(colors);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const g = geometry(variant, width);
  const portrait = variant === 'portrait';
  const layout = layoutFlow(postes, sources, {
    height: height - g.padTop - g.padBottom,
    minSlot: g.minSlot,
    gap: g.gap,
    groupGap: g.groupGap,
    sourceGap: 22,
  });
  const total = layout.total;
  const svgHeight = layout.height + g.padTop + g.padBottom;
  const y = (v: number) => v + g.padTop;
  const income = colors.success;
  const lit = (family: FlowFamily | null) => focus === null || family === focus;
  const amountShare = (a: number) => `${euros(a)} · ${share(a, total)}${NBSP}%`;

  const bandX = (level: 'source' | 'root' | 'family'): [number, number] => {
    if (level === 'source') return [(g.source ?? 0) + NODE, g.root];
    if (level === 'root') return [g.root + NODE, g.family];
    return [g.family + NODE, g.poste];
  };
  const bandColors = (level: 'source' | 'root' | 'family', family: FlowFamily | null): [string, string] => {
    if (level === 'source' || !family) return [income, income];
    if (level === 'root') return [income, tint[family]];
    return [tint[family], tint[family]];
  };

  return (
    <View style={{ width, height: svgHeight }}>
      <View accessible accessibilityRole="image" accessibilityLabel={summary}>
        <Svg width={width} height={svgHeight}>
          <Defs>
            {layout.bands.map((b, i) => {
              const [c0, c1] = bandColors(b.level, b.family);
              const op = focus === null || (b.family !== null && b.family === focus) ? BAND_OPACITY : BAND_DIM;
              return (
                <LinearGradient key={b.key} id={`${uid}b${i}`} x1="0" x2="1" y1="0" y2="0">
                  <Stop offset="0" stopColor={c0} stopOpacity={op} />
                  <Stop offset="1" stopColor={c1} stopOpacity={op} />
                </LinearGradient>
              );
            })}
          </Defs>
          {layout.bands.map((b, i) => {
            const [x0, x1] = bandX(b.level);
            return <Path key={b.key} d={bandPath(x0, x1, [y(b.from[0]), y(b.from[1])], [y(b.to[0]), y(b.to[1])])} fill={`url(#${uid}b${i})`} />;
          })}

          {/* Rentrées (paysage) */}
          {g.source !== null
            ? layout.sources.map((s) => (
                <G key={s.label} opacity={focus === null ? 1 : NODE_DIM}>
                  <Rect x={g.source as number} y={y(s.top)} width={NODE} height={s.height} rx={NODE / 2} fill={s.deficit ? colors.subtitle : income} />
                  <SvgText x={(g.source as number) - 10} y={y(s.top + s.height / 2) - 2} textAnchor="end" fontSize={13} fontFamily={fonts.bodyBold} fill={colors.text}>
                    {s.label}
                  </SvgText>
                  <SvgText x={(g.source as number) - 10} y={y(s.top + s.height / 2) + 14} textAnchor="end" fontSize={12} fontFamily={fonts.body} fill={colors.subtitle}>
                    {euros(s.amount)}
                  </SvgText>
                </G>
              ))
            : null}

          {/* Budget (paysage) ou rentrées (portrait) */}
          <Rect x={g.root} y={y(layout.root.top)} width={NODE} height={layout.root.height} rx={NODE / 2} fill={colors.text} />
          {!portrait ? (
            <SvgText x={g.root + NODE / 2} y={y(layout.root.top) - 8} textAnchor="middle" fontSize={12} fontFamily={fonts.bodyBold} fill={colors.text}>
              {`Budget ${euros(total)}`}
            </SvgText>
          ) : null}

          {layout.families.map((f) => (
            <G key={f.family} opacity={lit(f.family) ? 1 : NODE_DIM}>
              <Rect x={g.family} y={y(f.top)} width={NODE} height={f.height} rx={NODE / 2} fill={tint[f.family]} />
              <SvgText x={g.family - 10} y={y(f.top + f.height / 2) - 2} textAnchor="end" fontSize={g.familyName} fontFamily={fonts.bodyBold} fill={tint[f.family]}>
                {f.family === 'courantes' ? 'Courantes' : FAMILY_NAMES[f.family]}
              </SvgText>
              <SvgText x={g.family - 10} y={y(f.top + f.height / 2) + 14} textAnchor="end" fontSize={g.value} fontFamily={fonts.body} fill={colors.subtitle}>
                {amountShare(f.amount)}
              </SvgText>
            </G>
          ))}

          {layout.postes.map((p) => {
            const mid = y(p.slotTop + p.slot / 2);
            return (
              <G key={p.key} opacity={lit(p.family) ? 1 : NODE_DIM}>
                <Rect x={g.poste} y={y(p.top)} width={NODE} height={p.height} rx={NODE / 2} fill={tint[p.family]} />
                {portrait ? (
                  <>
                    <SvgText x={g.poste - 10} y={mid - 3} textAnchor="end" fontSize={g.name} fontFamily={fonts.bodyBold} fill={colors.text}>
                      {p.label}
                    </SvgText>
                    <SvgText x={g.poste - 10} y={mid + 12} textAnchor="end" fontSize={g.value} fontFamily={fonts.body} fill={colors.text} fillOpacity={0.75}>
                      {amountShare(p.amount)}
                    </SvgText>
                  </>
                ) : (
                  <>
                    <SvgText x={g.poste + 14} y={mid + 4.5} fontSize={g.name} fontFamily={fonts.bodyBold} fill={colors.text}>
                      {p.label}
                    </SvgText>
                    <SvgText x={width} y={mid + 4.5} textAnchor="end" fontSize={g.value} fontFamily={fonts.body} fill={colors.subtitle}>
                      {amountShare(p.amount)}
                    </SvgText>
                  </>
                )}
              </G>
            );
          })}
        </Svg>
      </View>

      {/* Zones à toucher : une par famille (l'étiquette et le nœud) */}
      {layout.families.map((f) => {
        const center = y(f.top + f.height / 2);
        const hit = Math.max(f.height, 44);
        const on = focus === f.family;
        return (
          <Pressable
            key={f.family}
            onPress={() => {
              select();
              onFocus(on ? null : f.family);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            aria-selected={on}
            accessibilityLabel={`${FAMILY_NAMES[f.family]} : ${euros(f.amount)}, ${share(f.amount, total)} %`}
            accessibilityHint={on ? 'Montre de nouveau tout le flux' : 'Met son chemin en avant'}
            style={[
              styles.hit,
              {
                left: Math.max(0, g.family - 112),
                width: Math.min(g.family, 112) + NODE + 8,
                top: center - hit / 2,
                height: hit,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { position: 'absolute' },
});

// Mémorisé : redessiné seulement quand ses propriétés changent, pas à chaque
// rendu de l'écran qui le contient
export default memo(FlowDiagram);
