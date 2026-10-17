import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import ProgressBar from '@/src/components/common/ProgressBar';
import { fonts, palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { tap } from '@/src/utils/haptics';
import { longDate, money } from '@/src/utils/patrimoine/format';
import { emergencyGauge, goalGauge, linkedPositions, measuredOnText, monthsCovered } from '@/src/utils/patrimoine/goals';
import type { Position } from '@/src/utils/patrimoine/model';
import type { PatrimoinePrefs } from '@/src/utils/patrimoine/prefs';
import HelpTerm from './HelpTerm';

type Props = { positions: Position[]; prefs: PatrimoinePrefs; hidden: boolean };

// Tes objectifs : l'épargne de précaution (proposée d'emblée), puis les
// objectifs personnels, chacun avec sa jauge mesurée sur ses placements
export default function GoalsSection({ positions, prefs, hidden }: Props) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const emergency = emergencyGauge(prefs.emergency, positions);
  const covered = monthsCovered(prefs.emergency, positions);
  const m = (v: number) => money(v, { hidden });

  const open = (params: Record<string, string>) => {
    tap();
    router.push({ pathname: '/outils/objectif', params });
  };

  return (
    <View style={styles.section}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <AppText variant="sectionLabel" accessibilityRole="header">
            TES OBJECTIFS
          </AppText>
          {/* Hors des cartes touchables : un bouton ne s'imbrique pas dans un autre */}
          <HelpTerm term="Épargne de précaution" />
        </View>
        <Pressable onPress={() => open({ kind: 'goal' })} hitSlop={12} accessibilityRole="button" accessibilityLabel="Ajouter un objectif">
          <AppText style={[styles.link, { color: colors.gold }]}>Ajouter</AppText>
        </Pressable>
      </View>

      <Pressable
        onPress={() => open({ kind: 'precaution' })}
        accessibilityRole="button"
        accessibilityLabel={
          emergency
            ? `Épargne de précaution : ${hidden ? 'montants masqués' : `${money(emergency.current)} sur ${money(emergency.target)}`}${emergency.reached ? ', atteinte' : ''}`
            : 'Épargne de précaution : indique tes dépenses mensuelles pour la suivre'
        }
        style={({ pressed }) => [styles.card, { backgroundColor: colors.panel }, pressed && { opacity: 0.8 }]}
      >
        <View style={styles.titleRow}>
          <Ionicons name="shield-checkmark-outline" size={18} color={emergency?.reached ? colors.success : colors.gold} />
          <AppText style={styles.title}>Épargne de précaution</AppText>
        </View>
        {emergency ? (
          <>
            <ProgressBar progress={emergency.ratio} tone={emergency.reached ? 'gold' : 'gold'} height={6} accessibilityLabel="Progression de l’épargne de précaution" />
            <AppText variant="caption" tone="subtitle">
              {m(emergency.current)} sur {m(emergency.target)} · {covered !== null ? `${String(Math.round(covered * 10) / 10).replace('.', ',')} mois de dépenses` : ''}
              {emergency.reached ? ' · atteinte' : ''}
            </AppText>
          </>
        ) : (
          <AppText variant="caption" tone="subtitle">
            Indique tes dépenses mensuelles : on suit ton coussin de 3 à 6 mois, compté sur tes actifs sans risque.
          </AppText>
        )}
      </Pressable>

      {prefs.goals.map((g) => {
        const gg = goalGauge(g, positions);
        const measuredOn = measuredOnText(linkedPositions(g, positions));
        const status = gg
          ? `${hidden ? 'montants masqués' : `${money(gg.current)} sur ${money(gg.target)}`}${gg.reached ? ', atteint' : ''}, ${measuredOn}`
          : `${hidden ? 'montant masqué' : money(g.amount)} à atteindre, relie un placement pour suivre cet objectif`;
        return (
          <Pressable
            key={g.id}
            onPress={() => open({ kind: 'goal', id: g.id })}
            accessibilityRole="button"
            accessibilityLabel={`Objectif ${g.name} : ${status}${g.date ? `, pour le ${longDate(`${g.date}T12:00:00`)}` : ''}`}
            style={({ pressed }) => [styles.card, { backgroundColor: colors.panel }, pressed && { opacity: 0.8 }]}
          >
            <View style={styles.titleRow}>
              <Ionicons name={gg?.reached ? 'checkmark-circle' : 'flag-outline'} size={18} color={gg?.reached ? colors.success : colors.gold} />
              <AppText style={styles.title} numberOfLines={1}>
                {g.name}
              </AppText>
              {g.date ? (
                <AppText variant="caption" tone="subtitle">
                  {longDate(`${g.date}T12:00:00`)}
                </AppText>
              ) : null}
            </View>
            {gg ? (
              <>
                <ProgressBar progress={gg.ratio} height={6} accessibilityLabel={`Progression de l’objectif ${g.name}`} />
                <AppText variant="caption" tone="subtitle">
                  {m(gg.current)} sur {m(gg.target)}
                  {gg.reached ? ' · atteint' : ''}
                </AppText>
                <AppText variant="caption" tone="subtitle" numberOfLines={2}>
                  {measuredOn ? measuredOn.charAt(0).toUpperCase() + measuredOn.slice(1) : null}
                </AppText>
              </>
            ) : (
              <AppText variant="caption" style={{ color: colors.gold }}>
                Relie un placement pour suivre cet objectif
              </AppText>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space[3], gap: space[2] },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  link: { fontFamily: fonts.bodySemibold, fontSize: 14 },
  card: { padding: space[3], borderRadius: radius.card, borderCurve: 'continuous', gap: space[2] },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  title: { flex: 1, fontFamily: fonts.bodySemibold, fontSize: 15 },
});
