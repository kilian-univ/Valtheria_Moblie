import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import AppText from '@/src/components/common/AppText';
import BottomSheet from '@/src/components/common/BottomSheet';
import Button from '@/src/components/common/Button';
import ValBubble from '@/src/components/common/ValBubble';
import { durations } from '@/src/constants/motion';
import { fonts, palette, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import type { ValLine } from '@/src/lesson/model';
import { announce } from '@/src/utils/announce';
import { correctAnswerLabel } from '@/src/utils/lessonPlayer';
import { VAL_DIAMETER } from './ScreenIntro';

const ICON_SIZE = 28;
// Au-delà, le contenu de la feuille défile (le bouton reste visible)
const MAX_CONTENT_RATIO = 0.55;

export type Verdict = {
  correct: boolean;
  firstTry: boolean;
  correctText: string | null;
  // Nombre de bonnes réponses (1 par défaut) : singulier ou pluriel
  correctCount?: number;
  explanation?: string;
  // Réplique de Val prévue par la leçon (screen.val.correct / wrong) :
  // Val la dit en haut de l'écran, pas dans la feuille
  val?: ValLine;
};

type AnswerSheetProps = {
  open: boolean;
  verdict: Verdict;
  // Val n'est pas affiché en haut de l'écran (dialogue) : sa réplique ici
  showVal?: boolean;
  onContinue: () => void;
  // Retour Android : le lecteur propose de quitter
  onRequestClose: () => void;
  onClosed: () => void;
  // Repliée : le lecteur fait défiler pour montrer les options corrigées
  onCollapsedChange?: (collapsed: boolean) => void;
  // Envoi des réponses en cours / échoué (dernier écran)
  loading?: boolean;
  errorText?: string | null;
};

// Feuille de correction, sans voile : l'écran reste visible au-dessus avec
// ses options colorées et Val qui réagit. Monte du bas en 250 ms avec la
// vibration ; seul « Continuer » fait avancer. Deux positions :
// dépliée (correction complète) et repliée (bande : icône, titre, bouton),
// pour voir toutes les options corrigées au-dessus.
export default function AnswerSheet({
  open,
  verdict,
  showVal = false,
  onContinue,
  onRequestClose,
  onClosed,
  onCollapsedChange,
  loading,
  errorText,
}: AnswerSheetProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { height } = useWindowDimensions();
  const { correct } = verdict;

  const [collapsed, setCollapsedState] = useState(false);
  // VoiceOver : le verdict et la correction sont annoncés à l'ouverture (audit I13)
  const spoken = [
    correct ? 'Bien vu !' : 'Pas tout à fait.',
    !correct && verdict.correctText ? `${correctAnswerLabel(verdict.correctCount ?? 1)}${verdict.correctText}.` : '',
    verdict.explanation ?? '',
  ].join(' ');
  useEffect(() => {
    if (open) announce(spoken, 400);
  }, [open, spoken]);
  const setCollapsed = (next: boolean) => {
    setCollapsedState(next);
    onCollapsedChange?.(next);
  };

  return (
    <BottomSheet
      open={open}
      onRequestClose={onRequestClose}
      onClosed={onClosed}
      scrim={false}
      dismissible={false}
      backgroundColor={correct ? colors.successSheet : colors.dangerSheet}
      collapse={{ collapsed, onChange: setCollapsed }}
    >
      <View style={styles.content} accessibilityLiveRegion="assertive">
        {/* Repliée : toucher la bande déplie la feuille */}
        <Pressable
          onPress={() => setCollapsed(false)}
          disabled={!collapsed}
          accessibilityRole="header"
          accessibilityHint={collapsed ? 'Touche pour voir la correction' : undefined}
          style={styles.titleRow}
        >
          <Ionicons
            name={correct ? 'checkmark-circle-outline' : 'close-circle-outline'}
            size={ICON_SIZE}
            color={correct ? colors.success : colors.error}
          />
          <AppText variant="title2" tone={correct ? 'success' : 'error'} style={styles.title}>
            {correct ? 'Bien vu !' : 'Pas tout à fait'}
          </AppText>
        </Pressable>

        {collapsed ? null : (
          <Animated.View entering={FadeIn.duration(durations.fade)} exiting={FadeOut.duration(durations.fade)}>
            <ScrollView style={{ maxHeight: height * MAX_CONTENT_RATIO }} contentContainerStyle={styles.body}>
              {showVal && verdict.val?.line ? (
                <ValBubble mood={verdict.val.mood} text={verdict.val.line} diameter={VAL_DIAMETER} />
              ) : null}
              {!correct && verdict.correctText ? (
                <AppText variant="bodyMedium">
                  {correctAnswerLabel(verdict.correctCount ?? 1)}
                  {verdict.correctText}
                </AppText>
              ) : null}

              {verdict.explanation ? <AppText variant="body">{verdict.explanation}</AppText> : null}

              {correct && verdict.firstTry ? (
                <AppText variant="callout" tone="gold" style={styles.firstTry}>
                  + 1 bonne réponse du premier coup
                </AppText>
              ) : null}
            </ScrollView>
          </Animated.View>
        )}

        {errorText ? (
          <AppText variant="callout" tone="error" accessibilityRole="alert">
            {errorText}
          </AppText>
        ) : null}

        <Button
          label={errorText ? 'Réessayer' : 'Continuer'}
          variant={correct ? 'success' : 'danger'}
          onPress={onContinue}
          loading={loading}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: space[4],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  title: {
    flexShrink: 1,
  },
  body: {
    gap: space[3],
  },
  firstTry: {
    fontFamily: fonts.bodySemibold,
  },
});
