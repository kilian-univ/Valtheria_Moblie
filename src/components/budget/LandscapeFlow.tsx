import { memo } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '@/src/components/common/AppText';
import { StaticBackground } from '@/src/components/common/AppBackground';
import IconButton from '@/src/components/common/IconButton';
import { fonts, palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import type { FlowFamily, Poste, Source } from '@/src/utils/budget/flows';
import { euros } from '@/src/utils/budget/format';
import { NBSP } from '@/src/utils/frenchSpaces';
import { select } from '@/src/utils/haptics';
import FlowDiagram from './FlowDiagram';

const FILTERS: { key: FlowFamily | null; label: string }[] = [
  { key: null, label: 'Tout' },
  { key: 'besoins', label: 'Besoins' },
  { key: 'envies', label: 'Envies' },
  { key: 'epargne', label: 'Épargne' },
];

type Props = {
  // Sens de rotation : le haut du téléphone tourné vers la gauche ('left')
  // ou vers la droite ('right')
  rotation: 'left' | 'right';
  title: string;
  income: number;
  spent: number;
  saved: number;
  rate: number | null;
  postes: readonly Poste[];
  sources: readonly Source[];
  focus: FlowFamily | null;
  onFocus: (f: FlowFamily | null) => void;
  summary: string;
  onClose: () => void;
};

// Vue paysage (maquette, écrans 3 bis et 3 ter) : Rentrées → Budget →
// familles → postes, avec les filtres. L'app reste en portrait (Expo Go ne
// change pas l'orientation) : la vue est pivotée d'un quart de tour, plein
// écran.
function LandscapeFlow({ rotation, title, income, spent, saved, rate, postes, sources, focus, onFocus, summary, onClose }: Props) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  // Dans la vue pivotée, la largeur est la hauteur de l'écran
  const side = Math.max(insets.top, insets.bottom, space[4]);
  const width = H;
  const height = W;
  const innerWidth = width - side * 2 - space[4];
  const head = 64;

  return (
    <Modal visible transparent animationType={reduced ? 'none' : 'fade'} statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}>
        <StaticBackground tab="outils" />
        <View
          accessibilityViewIsModal
          style={[
            styles.turned,
            {
              width,
              height,
              left: (W - width) / 2,
              top: (H - height) / 2,
              transform: [{ rotate: rotation === 'left' ? '90deg' : '-90deg' }],
              paddingHorizontal: side,
            },
          ]}
        >
          <View style={[styles.head, { height: head }]}>
            <View style={styles.flex}>
              <AppText variant="sectionLabel" accessibilityRole="header" numberOfLines={1}>
                {`FLUX DE TRÉSORERIE · ${title.toUpperCase()}`}
              </AppText>
              <AppText variant="caption" tone="subtitle" numberOfLines={1}>
                {`Rentrées ${euros(income)} · Dépenses ${euros(spent)} · Épargne `}
                <AppText variant="caption" style={{ color: colors.gold, fontFamily: fonts.bodyBold }}>
                  {`${euros(saved)}${rate === null ? '' : ` (${Math.round(rate * 100)}${NBSP}%)`}`}
                </AppText>
              </AppText>
            </View>
            <View style={[styles.filters, { backgroundColor: colors.panelStrong }]} accessibilityRole="tablist">
              {FILTERS.map((f) => {
                const on = focus === f.key;
                return (
                  <Pressable
                    key={f.label}
                    onPress={() => {
                      if (on) return;
                      select();
                      onFocus(f.key);
                    }}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                    aria-selected={on}
                    accessibilityLabel={f.label}
                    hitSlop={4}
                    style={[styles.filter, on && { backgroundColor: colors.surfaceAlt }]}
                  >
                    <AppText style={[styles.filterText, { color: on ? colors.text : colors.subtitle }]}>{f.label}</AppText>
                  </Pressable>
                );
              })}
            </View>
            <IconButton icon="contract-outline" iconSize={18} variant="filled" onPress={onClose} accessibilityLabel="Revenir en portrait" />
          </View>
          <View style={styles.diagram}>
            <FlowDiagram
              variant="paysage"
              postes={postes}
              sources={sources}
              width={innerWidth}
              height={height - head - space[4] - Math.max(insets.left, insets.right, space[2])}
              focus={focus}
              onFocus={onFocus}
              summary={summary}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  turned: { position: 'absolute' },
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[4], paddingTop: space[2] },
  filters: { flexDirection: 'row', padding: 3, borderRadius: radius.pill },
  filter: { minHeight: 40, paddingHorizontal: 12, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  filterText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  diagram: { flex: 1, alignItems: 'center', paddingTop: space[2] },
});

// Mémorisé : redessiné seulement quand ses propriétés changent, pas à chaque
// rendu de l'écran qui le contient
export default memo(LandscapeFlow);
