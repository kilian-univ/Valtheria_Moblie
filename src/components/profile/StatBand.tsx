import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import ValsCoin from '@/src/components/common/ValsCoin';
import { fonts, palette, radius, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { formatInteger } from '@/src/utils/format';

const VALUE_SIZE = 20;
const ICON = 16;
// Seul emoji autorisé de l'app (validé) : la flamme de la série
const FLAME = '\u{1F525}';

type StatBandProps = {
  streak: number;
  best: number;
  xp: number;
  vals: number;
};

// Une seule bande de chiffres : série (et record), XP, Vals
export default function StatBand({ streak, best, xp, vals }: StatBandProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const record = Math.max(best, streak);
  return (
    <View style={[styles.band, { backgroundColor: colors.panelStrong }]}>
      <Stat
        icon={<AppText style={styles.flame}>{FLAME}</AppText>}
        value={`${formatInteger(streak)} j`}
        label={`série · record ${formatInteger(record)}`}
        spoken={`Série : ${streak} ${streak > 1 ? 'jours' : 'jour'}, record ${record}`}
      />
      <View style={[styles.rule, { backgroundColor: colors.border }]} />
      <Stat
        icon={<Ionicons name="flash" size={ICON} color={colors.gold} />}
        value={formatInteger(xp)}
        label="XP"
        spoken={`${xp} XP`}
      />
      <View style={[styles.rule, { backgroundColor: colors.border }]} />
      <Stat icon={<ValsCoin size={ICON} />} value={formatInteger(vals)} label="Vals" spoken={`${vals} Vals`} />
    </View>
  );
}

function Stat({ icon, value, label, spoken }: { icon: ReactNode; value: string; label: string; spoken: string }) {
  // Espace fine des milliers : absente de Fraunces sur le web, on prend
  // l'insécable (même rendu partout, comme BigNumber)
  const shown = value.replace(/\u202F/g, '\u00A0');
  return (
    <View style={styles.stat} accessible accessibilityLabel={spoken}>
      <View style={styles.top}>
        {icon}
        <AppText maxFontSizeMultiplier={1.3} style={styles.value}>
          {shown}
        </AppText>
      </View>
      <AppText variant="caption" tone="subtitle" numberOfLines={1} style={styles.center}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    flexDirection: 'row',
    paddingVertical: space[3],
    paddingHorizontal: space[1] + 2,
    borderRadius: radius.card,
    borderCurve: 'continuous',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flame: {
    fontSize: ICON,
    lineHeight: ICON + 4,
  },
  value: {
    fontFamily: fonts.title,
    fontSize: VALUE_SIZE,
    lineHeight: VALUE_SIZE + 6,
    letterSpacing: titleLetterSpacing(VALUE_SIZE),
    fontVariant: ['tabular-nums'],
  },
  rule: {
    width: StyleSheet.hairlineWidth * 2,
    alignSelf: 'stretch',
  },
  center: {
    textAlign: 'center',
  },
});
