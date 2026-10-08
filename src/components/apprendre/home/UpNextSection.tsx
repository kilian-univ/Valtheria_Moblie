import { StyleSheet, Text, View } from 'react-native';

import XpPill from '@/src/components/apprendre/XpPill';
import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import { fonts, palette, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { allDoneLine, emptyLine, moduleDoneLine, pickDailyLine, valLines, welcomeLine } from '@/src/constants/valLines';
import { Lesson, Module } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { OFFLINE_REASON } from '@/src/hooks/useLearningData';
import { HomeSituation } from '@/src/utils/learning';
import ValHero from './ValHero';

// Écarts propres à cette section (hors grille : demandés par la maquette)
const META_GAP = 18;
const BUTTON_GAP = 14;
const LESSON_TITLE_SIZE = 22;

type UpNextSectionProps = {
  situation: HomeSituation;
  offline: boolean;
  startingId: number | null;
  launchError: string | null;
  onStartLesson: (module: Module, lesson: Lesson) => void;
  onOpenModule: (module: Module) => void;
  onOpenArticles: () => void;
};

// Contenu de la section « À suivre », selon la situation de l'utilisateur
export default function UpNextSection({
  situation,
  offline,
  startingId,
  launchError,
  onStartLesson,
  onOpenModule,
  onOpenArticles,
}: UpNextSectionProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];

  switch (situation.kind) {
    case 'empty':
      return <ValHero mood="complice" text={emptyLine} />;

    case 'allDone':
      return (
        <View style={styles.stack}>
          <ValHero mood="fier" title={allDoneLine.title} text={allDoneLine.text} />
          <Button variant="secondary" label="Lire les articles" onPress={onOpenArticles} />
        </View>
      );

    case 'welcome':
      return (
        <View style={styles.stack}>
          <ValHero mood="complice" title={welcomeLine.title} text={welcomeLine.text(situation.module.title)} />
          <Button label={`Commencer ${situation.module.title}`} onPress={() => onOpenModule(situation.module)} />
        </View>
      );

    case 'moduleDone':
      return (
        <View style={styles.stack}>
          <ValHero
            mood="celebrant"
            title={moduleDoneLine.title}
            text={moduleDoneLine.text(situation.finished.title, situation.next?.title ?? null)}
          />
          {situation.next ? (
            <Button
              label={`Continuer avec ${situation.next.title}`}
              onPress={() => situation.next && onOpenModule(situation.next)}
            />
          ) : null}
        </View>
      );

    case 'upNext': {
      const { module, lesson, almostDone } = situation;
      const lessons = module.lessons ?? [];
      const number = lessons.findIndex((l) => l.id === lesson.id) + 1;

      return (
        <View>
          <ValHero mood="complice" text={pickDailyLine(almostDone ? valLines.almostDone : valLines.general)} />

          <View style={styles.meta}>
            <AppText variant="caption" tone="subtitle">
              {`Module ${module.title}, leçon ${number} sur ${lessons.length}`}
            </AppText>
            <View style={styles.lessonRow}>
              <Text
                maxFontSizeMultiplier={1.3}
                style={[styles.lessonTitle, { color: colors.text }]}
                accessibilityRole="header"
              >
                {lesson.title}
              </Text>
              <XpPill xp={lesson.xp_reward} />
            </View>
          </View>

          <Button
            label="Commencer la leçon"
            onPress={() => onStartLesson(module, lesson)}
            loading={startingId === lesson.id}
            disabled={offline}
            disabledReason={OFFLINE_REASON}
            style={styles.button}
          />
          {launchError ? (
            <AppText variant="callout" tone="error" style={styles.error} accessibilityLiveRegion="polite">
              {launchError}
            </AppText>
          ) : null}
        </View>
      );
    }
  }
}

const styles = StyleSheet.create({
  stack: {
    gap: space[5],
  },
  meta: {
    marginTop: META_GAP,
    gap: space[1],
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  lessonTitle: {
    flex: 1,
    fontFamily: fonts.title,
    fontSize: LESSON_TITLE_SIZE,
    lineHeight: 28,
    letterSpacing: titleLetterSpacing(LESSON_TITLE_SIZE),
  },
  button: {
    marginTop: BUTTON_GAP,
  },
  error: {
    marginTop: space[2],
    textAlign: 'center',
  },
});
