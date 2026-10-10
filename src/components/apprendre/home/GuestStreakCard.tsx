import { StyleSheet, Text, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import StreakFlame from '@/src/components/common/StreakFlame';
import { fonts, palette, radius, softShadow, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { daysLabel, weekDays } from '@/src/utils/discoveryHome';
import { formatInteger } from '@/src/utils/format';

const DEPTH = 6;
const RADIUS = 20;
const FLAME = 64;
const VALUE_SIZE = 28;
const DAY = 34;
const NBSP = ' ';
// Seul emoji autorisé de l'app (validé) : la flamme de la série
const SMALL_FLAME = '\u{1F525}';

type GuestStreakCardProps = {
  streak: number;
  lessonDays: readonly string[];
  xp: number;
  // Allumage de la flamme (première apparition du jour), null : pas encore su
  ignite: boolean | null;
};

// Carte « Ta série » de l'accueil sans compte : flamme vivante, nombre de
// jours, semaine en cours (or : jour avec leçon ; aujourd'hui entouré ; gris :
// jour passé sans leçon ; contour : à venir), XP gagnés.
export default function GuestStreakCard({ streak, lessonDays, xp, ignite }: GuestStreakCardProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const week = weekDays(lessonDays);
  const lit = streak > 0;

  return (
    <View style={styles.wrap}>
      <View style={[styles.edge, { backgroundColor: colors.surfaceEdge, boxShadow: softShadow(colors.groundShadow) }]} />
      <View style={[styles.face, { backgroundColor: colors.surface }]}>
        <View
          style={styles.top}
          accessible
          accessibilityLabel={lit ? `Ta série : ${daysLabel(streak)}` : 'Allume ta flamme. Termine une leçon aujourd’hui.'}
        >
          <StreakFlame days={streak} size={FLAME} ignite={ignite} />
          <View style={styles.texts}>
            <AppText maxFontSizeMultiplier={1.4} style={[styles.value, { color: colors.text }]}>
              {lit ? daysLabel(streak) : 'Allume ta flamme'}
            </AppText>
            <AppText variant="caption" tone="subtitle">
              {lit ? 'ta série' : 'Termine une leçon aujourd’hui'}
            </AppText>
          </View>
        </View>

        <View style={styles.week} accessible accessibilityLabel={weekLabel(week)}>
          {week.map((d, i) => {
            const done = d.state === 'done';
            return (
              <View key={i} style={styles.day}>
                <View
                  style={[
                    styles.dayDot,
                    done && { backgroundColor: colors.gold },
                    d.state === 'missed' && { backgroundColor: colors.surface2 },
                    (d.state === 'future' || d.state === 'today') && { borderWidth: 1.5, borderColor: colors.controlBorder },
                    d.isToday && { borderWidth: 2, borderColor: colors.gold },
                  ]}
                >
                  {done ? (
                    <Text allowFontScaling={false} style={styles.dayFlame}>
                      {SMALL_FLAME}
                    </Text>
                  ) : null}
                </View>
                <AppText
                  variant="caption"
                  tone={d.isToday ? 'gold' : 'subtitle'}
                  maxFontSizeMultiplier={1.3}
                  style={styles.dayLetter}
                >
                  {d.letter}
                </AppText>
              </View>
            );
          })}
        </View>

        <View style={[styles.xp, { backgroundColor: colors.goldSoft }]} accessible accessibilityLabel={`${formatInteger(xp)} XP gagnés`}>
          <AppText variant="caption" tone="gold" style={styles.xpText}>{`${formatInteger(xp)}${NBSP}XP`}</AppText>
        </View>
      </View>
    </View>
  );
}

// « Cette semaine : lundi, leçon faite ; mardi, sans leçon… »
function weekLabel(week: ReturnType<typeof weekDays>): string {
  const states = { done: 'leçon faite', missed: 'sans leçon', future: 'à venir', today: 'aujourd’hui, pas encore de leçon' };
  return `Cette semaine : ${week.map((d) => `${d.name}${d.isToday && d.state === 'done' ? ', aujourd’hui' : ''}, ${states[d.state]}`).join(' ; ')}`;
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: DEPTH,
  },
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: DEPTH,
    bottom: 0,
    borderRadius: RADIUS,
    borderCurve: 'continuous',
  },
  face: {
    padding: space[4],
    gap: space[4],
    borderRadius: RADIUS,
    borderCurve: 'continuous',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  value: {
    fontFamily: fonts.title,
    fontSize: VALUE_SIZE,
    lineHeight: 34,
    letterSpacing: titleLetterSpacing(VALUE_SIZE),
  },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    alignItems: 'center',
    gap: space[1],
  },
  dayDot: {
    width: DAY,
    height: DAY,
    borderRadius: DAY / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayFlame: {
    fontSize: 15,
    lineHeight: 19,
  },
  dayLetter: {
    fontVariant: ['tabular-nums'],
  },
  // En bas à droite, discrète
  xp: {
    alignSelf: 'flex-end',
    marginTop: -space[2],
    paddingHorizontal: space[2] + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  xpText: {
    fontFamily: fonts.bodySemibold,
    fontVariant: ['tabular-nums'],
  },
});
