import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, ReactNode, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import GoldConfetti from '@/src/components/common/GoldConfetti';
import { motion } from '@/src/constants/motion';
import { fonts, palette, radius, space, titleLetterSpacing, withOpacity } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { useCountTicks } from '@/src/hooks/useCountTicks';
import { useCountUp } from '@/src/hooks/useCountUp';
import { REFERENCE_SCREEN_HEIGHT } from '@/src/utils/fit';
import { formatInteger } from '@/src/utils/format';
import { feedback } from '@/src/utils/feedback';
import { SOUND_LENGTH } from '@/src/utils/soundRules';
import { precisionCaption, precisionPercent, streakDaysCaption } from '@/src/utils/lessonPlayer';
import Cascade from '../player/Cascade';
import CelebrationScene from './CelebrationScene';

type IconName = ComponentProps<typeof Ionicons>['name'];

const NBSP = ' ';
const TITLE_SIZE = 34;
const TILE_VALUE_SIZE = 26;
const TILE_DEPTH = 5;
const TAKEAWAY_SIZE = 20;
const TAKEAWAY_BORDER = 0.35;
const TAKEAWAY_TINT = 0.08;
// Scène du haut : part de la hauteur de l'écran (moins sur un écran bas),
// bornée
const SCENE_SHARE = 0.44;
const SCENE_SHARE_SHORT = 0.34;
const SCENE_MIN = 230;
const SCENE_MAX = 400;
// Le texte remonte un peu dans le fondu de la scène
const SCENE_OVERLAP = 36;
// Rangs de la cascade : titre, puis les tuiles l'une après l'autre
const TEXT_RANK = 1;
const TILES_RANK = 2;

export type LessonRecapProps = {
  firstName?: string | null;
  lessonTitle: string | null;
  // XP gagnés (null : inconnus, la tuile n'apparaît pas)
  xp: number | null;
  correct: number;
  total: number;
  recovered: number;
  // Série de jours (null ou 0 : la tuile n'apparaît pas)
  streak: number | null;
  // Phrase clé de la leçon (null : pas de carte « À RETENIR »)
  takeaway: string | null;
  onContinue: () => void;
  buttonLabel?: string;
};

// Bilan de fin de leçon : le décor du coffre et Val qui arrive en sautant
// dans la lumière, confettis dorés et colorés, « LEÇON TERMINÉE »,
// « Bravo, <nom> ! », trois tuiles en relief (XP, PRÉCISION, SÉRIE) dont les
// nombres défilent l'un après l'autre, la phrase à retenir, vibration de
// fête. Un toucher accélère la cascade. Animations réduites : tout est posé,
// sans confettis.
export default function LessonRecap({
  firstName,
  lessonTitle,
  xp,
  correct,
  total,
  recovered,
  streak,
  takeaway,
  onContinue,
  buttonLabel = 'Continuer',
}: LessonRecapProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { width, height } = useWindowDimensions();
  const [fast, setFast] = useState(false);
  const name = firstName?.trim();
  const share = height < REFERENCE_SCREEN_HEIGHT ? SCENE_SHARE_SHORT : SCENE_SHARE;
  const sceneHeight = Math.round(Math.min(SCENE_MAX, Math.max(SCENE_MIN, height * share)));

  useEffect(() => {
    feedback.lessonComplete();
  }, []);

  const tiles: TileProps[] = [];
  if (xp !== null) {
    tiles.push({
      label: 'XP',
      ink: colors.gold,
      icon: <Ionicons name="flash" size={20} color={colors.gold} />,
      to: xp,
      format: (n) => `+${NBSP}${formatInteger(n)}`,
      caption: 'gagnés',
      a11y: `${xp} XP gagnés`,
    });
  }
  if (total > 0) {
    const percent = precisionPercent(correct, total);
    tiles.push({
      label: 'PRÉCISION',
      ink: colors.success,
      icon: <Ionicons name={'locate' as IconName} size={20} color={colors.success} />,
      to: percent,
      format: (n) => `${formatInteger(n)}${NBSP}%`,
      caption: precisionCaption(correct, total, recovered),
      a11y: `Précision : ${percent} %, ${precisionCaption(correct, total, recovered)}`,
    });
  }
  if (streak !== null && streak > 0) {
    tiles.push({
      label: 'SÉRIE',
      ink: colors.streak,
      icon: <AppText style={styles.flame}>🔥</AppText>,
      to: streak,
      format: (n) => formatInteger(n),
      caption: streakDaysCaption(streak),
      a11y: `Série : ${streak} ${streakDaysCaption(streak)}`,
    });
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Un toucher fait tout arriver d'un coup */}
        <Pressable onPress={() => setFast(true)} disabled={fast} accessible={false}>
          <CelebrationScene width={width} height={sceneHeight} tab="apprendre" />

          <View style={[styles.body, { marginTop: -SCENE_OVERLAP }]}>
            <Cascade index={TEXT_RANK} skip={fast} style={styles.texts}>
              <AppText style={[styles.kicker, { color: colors.gold }]}>LEÇON TERMINÉE</AppText>
              <AppText accessibilityRole="header" maxFontSizeMultiplier={1.3} style={styles.title}>
                {name ? `Bravo, ${name}${NBSP}!` : `Bravo${NBSP}!`}
              </AppText>
              {lessonTitle ? (
                <AppText variant="callout" tone="subtitle" style={styles.centerText}>
                  {lessonTitle}
                </AppText>
              ) : null}
            </Cascade>

            {tiles.length > 0 ? (
              <View style={styles.tiles}>
                {tiles.map((tile, i) => (
                  <Cascade key={tile.label} index={TILES_RANK + i} skip={fast} style={styles.tileSlot}>
                    <Tile
                      {...tile}
                      // Les chiffres défilent (et tiquent) une fois lesson-complete fini
                      delay={SOUND_LENGTH['lesson-complete'] + i * motion.stagger}
                      fast={fast}
                    />
                  </Cascade>
                ))}
              </View>
            ) : null}

            {takeaway ? (
              <Cascade index={TILES_RANK + tiles.length} skip={fast}>
                <View
                  style={[
                    styles.takeaway,
                    { borderColor: withOpacity(colors.gold, TAKEAWAY_BORDER), backgroundColor: withOpacity(colors.gold, TAKEAWAY_TINT) },
                  ]}
                  accessible
                  accessibilityLabel={`À retenir : ${takeaway}`}
                >
                  <View style={styles.takeawayHead}>
                    <Ionicons name="star" size={14} color={colors.gold} />
                    <AppText style={[styles.tileLabel, { color: colors.gold }]}>À RETENIR</AppText>
                  </View>
                  <AppText maxFontSizeMultiplier={1.3} style={styles.takeawayText}>
                    {takeaway}
                  </AppText>
                </View>
              </Cascade>
            ) : null}
          </View>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <Button label={buttonLabel} onPress={onContinue} />
      </View>
      <GoldConfetti colors={[colors.gold, colors.ivory, colors.goldDeep, colors.chart3, colors.success, colors.streak]} />
    </View>
  );
}

type TileProps = {
  label: string;
  ink: string;
  icon: ReactNode;
  // Nombre qui défile jusqu'à `to`
  to: number;
  format: (n: number) => string;
  caption: string;
  a11y: string;
};

// Tuile en relief : bandeau coloré en haut, icône et nombre qui défile,
// légende dessous
function Tile({ label, ink, icon, to, format, caption, a11y, delay, fast }: TileProps & { delay: number; fast: boolean }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const counted = Math.round(useCountUp(to, { delay }));
  const shown = fast ? to : counted;
  // Chaque chiffre qui défile : un cran aigu, espacé
  useCountTicks(counted, 0, !fast);

  return (
    <View style={styles.tile} accessible accessibilityLabel={a11y}>
      <View style={[styles.tileEdge, { backgroundColor: colors.optionEdge }]} />
      <View style={[styles.tileFace, { borderColor: ink, backgroundColor: colors.surface }]}>
        <View style={[styles.band, { backgroundColor: ink }]}>
          <AppText maxFontSizeMultiplier={1.2} style={[styles.tileLabel, { color: colors.onGold }]}>
            {label}
          </AppText>
        </View>
        <View style={styles.tileBody}>
          <View style={styles.tileValueRow}>
            {icon}
            <AppText maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit style={styles.tileValue}>
              {format(shown)}
            </AppText>
          </View>
          <AppText variant="caption" tone="subtitle" style={styles.centerText}>
            {caption}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: space[4],
  },
  body: {
    gap: space[4],
    paddingHorizontal: space[5],
  },
  texts: {
    alignItems: 'center',
    gap: space[1],
  },
  kicker: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.6,
  },
  title: {
    fontFamily: fonts.title,
    fontSize: TITLE_SIZE,
    lineHeight: TITLE_SIZE + 6,
    letterSpacing: titleLetterSpacing(TITLE_SIZE),
    textAlign: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  tiles: {
    flexDirection: 'row',
    gap: space[2] + 2,
  },
  tileSlot: {
    flex: 1,
  },
  tile: {
    paddingBottom: TILE_DEPTH,
  },
  tileEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: TILE_DEPTH,
    borderRadius: radius.lg - 2,
    borderCurve: 'continuous',
  },
  tileFace: {
    borderRadius: radius.lg - 2,
    borderCurve: 'continuous',
    borderWidth: 2,
    overflow: 'hidden',
  },
  band: {
    alignItems: 'center',
    paddingVertical: space[1] + 2,
  },
  tileLabel: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
  },
  tileBody: {
    alignItems: 'center',
    gap: space[1],
    paddingVertical: space[3],
    paddingHorizontal: space[1] + 2,
  },
  tileValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[1] + 2,
  },
  tileValue: {
    flexShrink: 1,
    fontFamily: fonts.title,
    fontSize: TILE_VALUE_SIZE,
    lineHeight: TILE_VALUE_SIZE + 4,
    letterSpacing: titleLetterSpacing(TILE_VALUE_SIZE),
    fontVariant: ['tabular-nums'],
  },
  flame: {
    fontSize: 20,
    lineHeight: 26,
  },
  takeaway: {
    gap: space[2],
    padding: space[4],
    borderRadius: radius.card,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  takeawayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  takeawayText: {
    fontFamily: fonts.title,
    fontSize: TAKEAWAY_SIZE,
    lineHeight: TAKEAWAY_SIZE + 7,
    letterSpacing: titleLetterSpacing(TAKEAWAY_SIZE),
  },
  footer: {
    paddingHorizontal: space[5],
    paddingBottom: space[4],
  },
});
