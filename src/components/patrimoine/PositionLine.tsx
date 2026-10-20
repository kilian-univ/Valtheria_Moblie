import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import AppText from '@/src/components/common/AppText';
import { fonts, palette, space, withOpacity } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { tap } from '@/src/utils/haptics';
import { money, quantityLabel, signedMoney, signedPercent } from '@/src/utils/patrimoine/format';
import { isStalePrice, valueEurOf, type ClosedPosition, type Position } from '@/src/utils/patrimoine/model';
import AssetIcon from '@/src/components/common/AssetIcon';

type Props = {
  position: Position;
  hidden: boolean;
  onPress: () => void;
  last?: boolean;
  // Instant d'une opération enregistrée : la ligne s'illumine
  pulseAt?: number | null;
};

// Ligne d'une position : logo, nom, quantité ; à droite la valeur et la
// variation (un livret : son taux par an). Cours figé : signalé.
export default function PositionLine({ position: p, hidden, onPress, last, pulseAt }: Props) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const glow = useSharedValue(0);
  useEffect(() => {
    if (!pulseAt) return;
    glow.set(reduced ? 0 : withSequence(withTiming(1, { duration: 220 }), withTiming(0, { duration: 900 })));
  }, [pulseAt, reduced, glow]);
  // Couleurs calculées ici : le style animé tourne sur le fil de l'interface,
  // où seules les fonctions worklet (interpolateColor) peuvent être appelées
  const glowOff = withOpacity(colors.gold, 0);
  const glowOn = withOpacity(colors.gold, 0.14);
  const glowStyle = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(glow.get(), [0, 1], [glowOff, glowOn]) }));

  const stale = isStalePrice(p);
  const value = valueEurOf(p);
  const subtitle = p.isLivret ? 'Épargne' : p.isManual ? 'Valeur estimée' : quantityLabel(p.quantity, p.ticker, p.type);
  const right = p.isLivret
    ? p.interestRatePct !== null
      ? `+ ${String(p.interestRatePct).replace('.', ',')} % par an`
      : 'Garanti'
    : p.isManual
      ? ''
      : signedPercent(p.gainPct);
  const rightTone = p.isLivret ? colors.success : p.gainPct >= 0 ? colors.success : colors.error;
  const spokenValue = hidden ? 'montant masqué' : money(value);

  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${p.name}, ${subtitle}, ${spokenValue}${right && !hidden ? `, ${right}` : ''}${stale ? ', cours figé' : ''}`}
      accessibilityHint="Ouvre le détail de cet actif"
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.row,
            glowStyle,
            !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <AssetIcon logoUrl={p.logoUrl} name={p.name} ticker={p.ticker} type={p.type} />
          <View style={styles.middle}>
            <AppText numberOfLines={1} style={styles.name}>
              {p.name}
            </AppText>
            <View style={styles.subRow}>
              <AppText variant="caption" tone="subtitle" numberOfLines={1}>
                {subtitle}
              </AppText>
              {stale ? (
                <View style={[styles.stale, { backgroundColor: withOpacity(colors.gold, 0.14) }]}>
                  <AppText style={[styles.staleText, { color: colors.gold }]}>cours figé</AppText>
                </View>
              ) : null}
            </View>
          </View>
          <View style={styles.right}>
            <AppText style={styles.value}>{money(value, { hidden })}</AppText>
            {right ? (
              <AppText style={[styles.change, { color: rightTone }]}>{hidden && !p.isLivret ? signedPercent(0, true) : right}</AppText>
            ) : null}
          </View>
        </Animated.View>
      )}
    </Pressable>
  );
}

// Position soldée : sa plus-value réalisée
export function ClosedLine({ position: p, hidden, last }: { position: ClosedPosition; hidden: boolean; last?: boolean }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const gain = p.realizedGainEur;
  return (
    <View
      style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
      accessible
      accessibilityLabel={`${p.name}, position soldée, plus-value réalisée ${hidden ? 'masquée' : signedMoney(gain)}`}
    >
      <AssetIcon logoUrl={p.logoUrl} name={p.name} ticker={p.ticker} type={p.type} size={34} />
      <View style={styles.middle}>
        <AppText numberOfLines={1} style={[styles.name, { color: colors.subtitle }]}>
          {p.name}
        </AppText>
        <AppText variant="caption" tone="subtitle">
          Plus-value réalisée
        </AppText>
      </View>
      <AppText style={[styles.value, { color: gain >= 0 ? colors.success : colors.error }]}>{signedMoney(gain, { hidden })}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], borderRadius: 4 },
  middle: { flex: 1, gap: 2 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: fonts.bodySemibold, fontSize: 15 },
  right: { alignItems: 'flex-end', gap: 2 },
  value: { fontFamily: fonts.bodyBold, fontSize: 15, fontVariant: ['tabular-nums'] },
  change: { fontFamily: fonts.bodyBold, fontSize: 12, fontVariant: ['tabular-nums'] },
  stale: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  staleText: { fontFamily: fonts.bodyBold, fontSize: 10 },
});
