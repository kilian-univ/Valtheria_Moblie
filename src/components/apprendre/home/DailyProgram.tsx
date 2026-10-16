import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import Skeleton from '@/src/components/common/Skeleton';
import UniverseArt from '@/src/components/common/UniverseArt';
import UniverseCard from '@/src/components/common/UniverseCard';
import { fonts, learnHome, palette, radius, space, withOpacity } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { OFFLINE_REASON } from '@/src/hooks/useLearningData';
import { type LessonOfDay, programCounter, type ProgramState, revisionLabel } from '@/src/utils/dailyProgram';
import { completedCount, totalCount } from '@/src/utils/learning';
import ValHero from './ValHero';

const CHECK = 28;

type DailyProgramProps = {
  program: ProgramState;
  // null : tout est terminé (« Tu es à jour »)
  lesson: LessonOfDay | null;
  // Couleur de l'univers de la leçon (face de moduleColors)
  color: string;
  // Écrans de la révision du jour (null : en préparation), phrase quand il
  // n'y a rien à réviser, ligne cochée une fois faite
  revisionCount: number | null;
  revisionEmptyText: string | null;
  revisionDoneText: string;
  offline: boolean;
  starting: boolean;
  launchError: string | null;
  onStartLesson: () => void;
  onRevise: () => void;
};

// Programme du jour : Val et sa bulle (« <n> sur 2 »), la leçon du jour, puis
// la révision. Ce qui est fait se replie en une ligne cochée ; la révision
// devient l'action principale une fois la leçon faite (ou s'il n'y a plus de
// leçon).
export default function DailyProgram({
  program,
  lesson,
  color,
  revisionCount,
  revisionEmptyText,
  revisionDoneText,
  offline,
  starting,
  launchError,
  onStartLesson,
  onRevise,
}: DailyProgramProps) {
  const reviseFirst = program.lessonDone || lesson === null;
  return (
    <View style={styles.wrap}>
      <ValHero
        flush
        mood={program.mood}
        text={program.line}
        accent={programCounter(program.count, program.total)}
        width={learnHome.valWidth}
        height={learnHome.valHeight}
      />

      {program.lessonDone ? (
        <DoneRow
          text="Leçon du jour faite"
          link={lesson ? { label: 'Une autre leçon', onPress: onStartLesson, disabled: offline || starting } : undefined}
        />
      ) : lesson ? (
        <UniverseCard
          color={color}
          label="1 · La leçon"
          title={lesson.lesson.title}
          titleSize={learnHome.lessonTitle}
          done={completedCount(lesson.module)}
          total={totalCount(lesson.module)}
          showProgress={false}
          leading={
            <UniverseArt
              slug={lesson.universe?.slug ?? ''}
              color={color}
              size={learnHome.lessonArt}
              framed
            />
          }
        >
          <Button
            label="COMMENCER"
            icon="play"
            onPress={onStartLesson}
            loading={starting}
            disabled={offline}
            disabledReason={offline ? OFFLINE_REASON : undefined}
            accessibilityHint={`Leçon ${lesson.lesson.title}, module ${lesson.module.title}`}
            silent
            style={styles.start}
          />
          {launchError ? (
            <AppText variant="callout" tone="error" accessibilityRole="alert" style={styles.error}>
              {launchError}
            </AppText>
          ) : null}
        </UniverseCard>
      ) : (
        <DoneRow text="Tu es à jour, de nouvelles leçons arrivent" icon="sparkles" />
      )}

      {program.revisionDone ? (
        <DoneRow text={revisionDoneText} />
      ) : (
        <RevisionRow count={revisionCount} emptyText={revisionEmptyText} primary={reviseFirst} onRevise={onRevise} />
      )}
    </View>
  );
}

// Ligne légère cochée (« Leçon du jour faite »), lien discret à droite
function DoneRow({
  text,
  icon = 'checkmark',
  link,
}: {
  text: string;
  icon?: 'checkmark' | 'sparkles';
  link?: { label: string; onPress: () => void; disabled?: boolean };
}) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  return (
    <View style={[styles.row, { backgroundColor: colors.panel, borderColor: colors.cardBorder }]}>
      <View style={[styles.check, { backgroundColor: colors.goldSoft }]}>
        <Ionicons name={icon} size={16} color={colors.gold} />
      </View>
      <AppText variant="bodyMedium" style={styles.rowText} accessibilityRole="text">
        {text}
      </AppText>
      {link ? (
        <Button variant="link" label={link.label} onPress={link.onPress} disabled={link.disabled} tone="subtitle" underline />
      ) : null}
    </View>
  );
}

// « 2 · LA RÉVISION » : petit paquet de trois cartes, nombre d'écrans et
// durée, bouton « Réviser » (contour or, ou or plein quand c'est l'action
// principale). Rien à réviser : la phrase d'attente, sans bouton.
function RevisionRow({
  count,
  emptyText,
  primary,
  onRevise,
}: {
  count: number | null;
  emptyText: string | null;
  primary: boolean;
  onRevise: () => void;
}) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const empty = count === 0;
  const emptyLine = emptyText ?? '';
  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.panel, borderColor: primary && !empty ? colors.goldRing : colors.goldLine },
      ]}
    >
      <CardStack />
      <View style={styles.rowText} accessible accessibilityLabel={`La révision. ${empty ? emptyLine : count === null ? 'En préparation' : revisionLabel(count)}`}>
        <AppText maxFontSizeMultiplier={1.3} style={[styles.kicker, { color: colors.gold }]}>
          2 · LA RÉVISION
        </AppText>
        {count === null ? (
          <Skeleton width={130} height={14} style={styles.skeleton} />
        ) : (
          <AppText variant={empty ? 'callout' : 'bodyMedium'} tone={empty ? 'subtitle' : 'text'} style={!empty && styles.revisionLine}>
            {empty ? emptyLine : revisionLabel(count)}
          </AppText>
        )}
      </View>
      {count !== null && count > 0 ? (
        <Button size="sm" variant={primary ? 'primary' : 'goldOutline'} label="Réviser" onPress={onRevise} />
      ) : null}
    </View>
  );
}

// Trois cartes inclinées, filet or de plus en plus marqué
function CardStack() {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const cards = [
    { left: 2, top: 6, rotate: '-12deg', face: colors.surface2, edge: 0.35 },
    { left: 10, top: 4, rotate: '0deg', face: colors.surfaceAlt, edge: 0.55 },
    { left: 18, top: 6, rotate: '10deg', face: colors.disabledFace, edge: 0.8 },
  ];
  return (
    <View style={styles.stack} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {cards.map((c, i) => (
        <View
          key={i}
          style={[
            styles.card,
            {
              left: c.left,
              top: c.top,
              backgroundColor: c.face,
              borderColor: withOpacity(colors.gold, c.edge),
              transform: [{ rotate: c.rotate }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space[3] + 2,
  },
  start: {
    marginTop: space[3] + 2,
  },
  error: {
    marginTop: space[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[3],
    paddingHorizontal: space[3] + 2,
    minHeight: 64,
    borderRadius: learnHome.rowRadius,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  check: {
    width: CHECK,
    height: CHECK,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
  },
  revisionLine: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    lineHeight: 20,
    marginTop: 2,
  },
  skeleton: {
    marginTop: space[1],
  },
  stack: {
    width: 42,
    height: 40,
  },
  card: {
    position: 'absolute',
    width: 22,
    height: 30,
    borderRadius: 5,
    borderWidth: 1.5,
  },
});
