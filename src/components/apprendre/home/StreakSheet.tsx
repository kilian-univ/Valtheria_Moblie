import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import BottomSheet from '@/src/components/common/BottomSheet';
import Button from '@/src/components/common/Button';
import StreakFlame from '@/src/components/common/StreakFlame';
import StreakMedal from '@/src/components/common/StreakMedal';
import { palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { feedback } from '@/src/utils/feedback';
import { formatInteger } from '@/src/utils/format';
import { daysLabel, freezesLabel, MEDALS, type WeekDay } from '@/src/utils/streakRewards';
import StreakWeek from './StreakWeek';
import { NBSP } from '@/src/utils/frenchSpaces';

// Emoji de 64 au palier le plus haut
const FLAME_BOX = 64 / 0.8;
const MEDAL = 60;
// La feuille ne dépasse pas les trois quarts de l'écran : au-delà, elle défile
const MAX_HEIGHT_RATIO = 0.78;

type StreakSheetProps = {
  streak: number;
  // Meilleure série atteinte (médailles gardées si la série casse)
  best: number;
  // Gels en réserve ; null : inconnus (serveur plus ancien, pas encore chargés)
  freezes: number | null;
  // Semaine en cours (sans compte : l'historique est sur le téléphone)
  week?: WeekDay[];
  // Un gel a sauvé la série hier : son « freeze » à l'ouverture
  saved?: boolean;
  open: boolean;
  onRequestClose: () => void;
  onClosed: () => void;
  // Absent s'il n'y a aucune leçon à suivre (ou sans compte)
  onContinue?: () => void;
  continueDisabled?: boolean;
  continueDisabledReason?: string;
};

// Feuille « Ta série » (sans compte et connecté) : la flamme et le nombre de
// jours, la meilleure série, les six médailles (gagnées en or, à venir en
// gris avec le nombre de jours restants), puis l'encart du gel de série.
export default function StreakSheet({
  streak,
  best,
  freezes,
  week,
  saved = false,
  open,
  onRequestClose,
  onClosed,
  onContinue,
  continueDisabled = false,
  continueDisabledReason,
}: StreakSheetProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { height } = useWindowDimensions();
  useEffect(() => {
    if (open && saved) feedback.freeze();
  }, [open, saved]);
  const days = `${formatInteger(streak)}${NBSP}${streak > 1 ? 'jours' : 'jour'}`;

  return (
    <BottomSheet open={open} onRequestClose={onRequestClose} onClosed={onClosed}>
      <ScrollView style={{ maxHeight: height * MAX_HEIGHT_RATIO }} contentContainerStyle={styles.content} bounces={false}>
        <AppText variant="title3" accessibilityRole="header" style={styles.center}>
          Ta série
        </AppText>
        <StreakFlame days={streak} size={FLAME_BOX} />
        <AppText variant="hero" accessibilityLabel={`Série de ${days}`}>
          {days}
        </AppText>
        <AppText variant="callout" tone="subtitle" style={styles.center}>
          {`Meilleure série : ${daysLabel(Math.max(best, streak))}`}
        </AppText>
        {week ? (
          <View style={styles.week}>
            <StreakWeek week={week} />
          </View>
        ) : null}

        <View style={styles.medals}>
          {MEDALS.map((m) => {
            const earned = Math.max(best, streak) >= m.days;
            const left = m.days - streak;
            const status = earned ? 'gagnée' : `dans ${daysLabel(left)}`;
            return (
              <View key={m.days} style={styles.medal} accessible accessibilityLabel={`${m.name}, ${daysLabel(m.days)}, ${status}`}>
                <StreakMedal days={m.days} size={MEDAL} earned={earned} />
                <AppText variant="bodyMedium" style={styles.center} numberOfLines={1}>
                  {m.name}
                </AppText>
                <AppText variant="caption" tone={earned ? 'gold' : 'subtitle'} style={styles.center}>
                  {earned ? 'Gagnée' : `dans ${daysLabel(left)}`}
                </AppText>
              </View>
            );
          })}
        </View>

        <View
          style={[styles.freeze, { backgroundColor: colors.frost }]}
          accessible
          accessibilityLabel={`Gel de série. Il protège ta série si tu rates un jour. Tu en gagnes un tous les 7 jours. ${
            freezes === null ? 'Bientôt disponible avec ton compte.' : `En réserve : ${freezesLabel(freezes)}.`
          }`}
        >
          <Ionicons name="snow" size={24} color={colors.frostInk} />
          <View style={styles.freezeTexts}>
            <AppText variant="bodyMedium">Gel de série</AppText>
            <AppText variant="caption" tone="subtitle">
              Il protège ta série si tu rates un jour. Tu en gagnes un tous les 7 jours.
            </AppText>
            <AppText variant="caption" style={{ color: colors.frostInk }}>
              {freezes === null ? 'Bientôt disponible avec ton compte.' : `En réserve : ${freezesLabel(freezes)} sur 2`}
            </AppText>
          </View>
        </View>

        {onContinue ? (
          <Button
            label={streak > 0 ? 'Continuer ma série' : 'Commencer ma série'}
            onPress={onContinue}
            disabled={continueDisabled}
            disabledReason={continueDisabledReason}
            style={styles.button}
          />
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    marginTop: space[4],
    paddingHorizontal: space[5],
    alignItems: 'center',
    gap: space[2],
  },
  center: {
    textAlign: 'center',
  },
  week: {
    alignSelf: 'stretch',
    marginTop: space[4],
  },
  medals: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: space[4],
    marginTop: space[4],
  },
  medal: {
    width: '33.33%',
    alignItems: 'center',
    gap: 2,
    paddingTop: space[2],
  },
  freeze: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    padding: space[4],
    borderRadius: radius.option,
    marginTop: space[4],
  },
  freezeTexts: {
    flex: 1,
    gap: 2,
  },
  button: {
    alignSelf: 'stretch',
    marginTop: space[4],
  },
});
