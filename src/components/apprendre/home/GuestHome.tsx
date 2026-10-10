import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import { StaggerItem } from '@/src/components/common/Stagger';
import { fonts, palette, radius, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import type { Objective } from '@/src/lesson/discovery';
import type { Universe } from '@/src/lesson/model';
import {
  accountCard,
  daysLabel,
  discoveryTiles,
  type HomeCard,
  type HomeCardAction,
} from '@/src/utils/discoveryHome';
import { formatInteger } from '@/src/utils/format';
import { track } from '@/src/utils/track';
import { universeTint } from '@/src/utils/universeTint';
import GuestLessonCard from './GuestLessonCard';
import OtherTopicSheet from './OtherTopicSheet';

const STAT_VALUE = 22;

type GuestHomeProps = {
  card: HomeCard;
  universeSlug: string;
  universes: Universe[];
  played: Objective[];
  streak: number;
  xp: number;
  signupClosed: boolean;
  onPlay: (objective: Objective) => void;
  onRegister: () => void;
  onLogin: () => void;
};

// Accueil d'Apprendre sans compte : la grande carte de la leçon de l'objectif,
// la série et les XP comptés sur le téléphone, puis la carte du compte.
// « Un autre sujet » ouvre la feuille des six leçons découvertes.
export default function GuestHome({
  card,
  universeSlug,
  universes,
  played,
  streak,
  xp,
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

  const onAction = (action: HomeCardAction) => {
    if (action === 'autre-sujet') openSheet();
    else if (action === 'creer-compte') onRegister();
    else onPlay(card.objective);
  };

  return (
    <View style={styles.stack}>
      <StaggerItem index={0}>
        <GuestLessonCard card={card} tint={universeTint(universeSlug, universes)} onAction={onAction} />
        {card.secondary ? (
          <Button variant="text" label="Un autre sujet" onPress={openSheet} style={styles.secondary} />
        ) : null}
      </StaggerItem>

      <StaggerItem index={1}>
        <View style={styles.stats}>
          <View style={[styles.stat, { backgroundColor: colors.surface }]} accessible accessibilityLabel={`Ta série : ${daysLabel(streak)}`}>
            {/* Émoji : exception autorisée par la DA pour la série */}
            <AppText style={styles.flame}>🔥</AppText>
            <AppText maxFontSizeMultiplier={1.4} style={[styles.statValue, { color: colors.text }]}>
              {daysLabel(streak)}
            </AppText>
            <AppText variant="caption" tone="subtitle">
              ta série
            </AppText>
          </View>
          <View style={[styles.stat, { backgroundColor: colors.surface }]} accessible accessibilityLabel={`${formatInteger(xp)} XP gagnés`}>
            <AppText style={[styles.xpLabel, { color: colors.gold }]}>XP</AppText>
            <AppText maxFontSizeMultiplier={1.4} style={[styles.statValue, styles.xpValue, { color: colors.text }]}>
              {formatInteger(xp)}
            </AppText>
            <AppText variant="caption" tone="subtitle">
              gagnés
            </AppText>
          </View>
        </View>
      </StaggerItem>

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
  stats: {
    flexDirection: 'row',
    gap: space[3] - 2,
  },
  stat: {
    flex: 1,
    padding: space[4] - 2,
    borderRadius: radius.md + 4,
    borderCurve: 'continuous',
  },
  flame: {
    fontSize: 22,
    lineHeight: 28,
  },
  statValue: {
    fontFamily: fonts.title,
    fontSize: STAT_VALUE,
    lineHeight: 28,
    letterSpacing: titleLetterSpacing(STAT_VALUE),
    marginTop: space[1],
    fontVariant: ['tabular-nums'],
  },
  xpLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    lineHeight: 28,
    letterSpacing: 1,
  },
  xpValue: {
    marginTop: space[1],
  },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4] - 2,
    padding: space[4],
    borderRadius: radius.md + 4,
    borderCurve: 'continuous',
  },
  accountTexts: {
    flex: 1,
    gap: 2,
  },
});
