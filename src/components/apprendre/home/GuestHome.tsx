import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import { StaggerItem } from '@/src/components/common/Stagger';
import { palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import type { Objective } from '@/src/lesson/discovery';
import type { Universe } from '@/src/lesson/model';
import {
  accountCard,
  discoveryTiles,
  type HomeCard,
  type HomeCardAction,
  showAccountCard,
} from '@/src/utils/discoveryHome';
import { frozenYesterday, type StreakHistory, weekDays } from '@/src/utils/streakRewards';
import { feedback } from '@/src/utils/feedback';
import { track } from '@/src/utils/track';
import { universeTint } from '@/src/utils/universeTint';
import GuestLessonCard from './GuestLessonCard';
import GuestStreakCard from './GuestStreakCard';
import StreakSheet from './StreakSheet';
import OtherTopicSheet from './OtherTopicSheet';

type GuestHomeProps = {
  card: HomeCard;
  universeSlug: string;
  universes: Universe[];
  played: Objective[];
  // Série rejouée jour par jour (gels compris) et meilleure série mémorisée
  history: StreakHistory;
  bestStreak: number;
  lessonDays: readonly string[];
  xp: number;
  // Allumage de la flamme (première apparition du jour)
  ignite: boolean | null;
  signupClosed: boolean;
  onPlay: (objective: Objective) => void;
  onRegister: () => void;
  onLogin: () => void;
};

// Accueil d'Apprendre sans compte : la grande carte de la leçon de l'objectif,
// la carte « Ta série » (flamme, semaine, XP), puis la carte du compte, sauf
// quand la grande carte propose déjà de créer le compte.
// « Un autre sujet » ouvre la feuille des six leçons découvertes.
export default function GuestHome({
  card,
  universeSlug,
  universes,
  played,
  history,
  bestStreak,
  lessonDays,
  xp,
  ignite,
  signupClosed,
  onPlay,
  onRegister,
  onLogin,
}: GuestHomeProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const account = accountCard(signupClosed);

  // Feuille : `sheetMounted` reste vrai pendant l'animation de fermeture
  const [sheetMounted, setSheetMounted] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const unmountSheet = useCallback(() => setSheetMounted(false), []);
  const openSheet = () => {
    track('autre_sujet_ouvert', { objectif: card.objective });
    setSheetMounted(true);
    setSheetOpen(true);
  };

  // Feuille « Ta série » (médailles, gel)
  const [streakMounted, setStreakMounted] = useState(false);
  const [streakOpen, setStreakOpen] = useState(false);
  const closeStreakSheet = useCallback(() => setStreakOpen(false), []);
  const unmountStreakSheet = useCallback(() => setStreakMounted(false), []);
  const openStreakSheet = () => {
    setStreakMounted(true);
    setStreakOpen(true);
  };

  const onAction = (action: HomeCardAction) => {
    if (action === 'autre-sujet' || action === 'rejouer') openSheet();
    else if (action === 'creer-compte') onRegister();
    else {
      // La leçon s'ouvre : advance doux
      feedback.openLesson();
      onPlay(card.objective);
    }
  };

  return (
    <View style={styles.stack}>
      <StaggerItem index={0}>
        <GuestLessonCard
          card={card}
          tint={universeTint(universeSlug, universes)}
          universeSlug={universeSlug}
          onAction={onAction}
          onLogin={onLogin}
        />
        {card.secondary ? (
          <Button variant="text" label={card.secondary.label} onPress={openSheet} style={styles.secondary} />
        ) : null}
      </StaggerItem>

      <StaggerItem index={1}>
        <GuestStreakCard
          streak={history.streak}
          xp={xp}
          freezes={history.freezes}
          savedYesterday={frozenYesterday(history)}
          ignite={ignite}
          onPress={openStreakSheet}
        />
      </StaggerItem>

      {showAccountCard(card, signupClosed) ? (
        <StaggerItem index={2}>
          <View style={[styles.account, { backgroundColor: colors.surface }]}>
            <View style={styles.accountTexts}>
              <AppText variant="bodyMedium" accessibilityRole="header">
                {account.title}
              </AppText>
              <AppText variant="caption" tone="subtitle">
                {account.text}
              </AppText>
            </View>
            <Button
              variant={account.action === 'register' ? 'primary' : 'secondary'}
              fullWidth={false}
              label={account.actionLabel}
              onPress={account.action === 'register' ? onRegister : onLogin}
            />
          </View>
        </StaggerItem>
      ) : null}

      {streakMounted ? (
        <StreakSheet
          streak={history.streak}
          best={Math.max(bestStreak, history.best)}
          freezes={history.freezes}
          week={weekDays(lessonDays)}
          saved={frozenYesterday(history)}
          open={streakOpen}
          onRequestClose={closeStreakSheet}
          onClosed={unmountStreakSheet}
        />
      ) : null}

      {sheetMounted ? (
        <OtherTopicSheet
          open={sheetOpen}
          tiles={discoveryTiles(card.objective, played)}
          universes={universes}
          onRequestClose={closeSheet}
          onClosed={unmountSheet}
          onPick={(tile) => {
            // La feuille (un Modal) est fermée avant d'ouvrir le lecteur
            setSheetOpen(false);
            setSheetMounted(false);
            onPlay(tile.objective);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: space[6],
  },
  secondary: {
    alignSelf: 'center',
    marginTop: space[2],
  },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4] - 2,
    padding: space[4],
    borderRadius: radius.card,
    borderCurve: 'continuous',
  },
  accountTexts: {
    flex: 1,
    gap: 2,
  },
});
