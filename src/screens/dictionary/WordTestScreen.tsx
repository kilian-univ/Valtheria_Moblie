import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import ListRow from '@/src/components/common/ListRow';
import PageState from '@/src/components/common/PageState';
import Pill from '@/src/components/common/Pill';
import ValBubble from '@/src/components/common/ValBubble';
import { fonts, palette, radius, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { useDictionary } from '@/src/hooks/useDictionary';
import { useWordLessons } from '@/src/hooks/useWordLessons';
import { normalizeLesson } from '@/src/lesson/normalize';
import ApprendreDetailScreen from '@/src/screens/ApprendreDetailScreen';
import { userKeyOf } from '@/src/state/userMemory';
import { recordWordResult, useWordStates } from '@/src/state/wordStates';
import { type DictionaryEntry, findEntry, relatedWords, wordQuestionScreen, wordTest } from '@/src/utils/dictionary';
import { termHref } from '@/src/utils/dictionaryLinks';
import { success } from '@/src/utils/haptics';
import { feedback } from '@/src/utils/feedback';
import { wordsInSameLessons } from '@/src/utils/wordLessonIndex';
import { wordState } from '@/src/utils/wordStates';

const VAL_DIAMETER = 64;
const TITLE_SIZE = 36;

const leave = () => (router.canGoBack() ? router.back() : router.replace('/dictionary'));

// Test sur le mot d'une fiche (« Teste-toi ») : plein écran, dans le lecteur
// des leçons (mêmes retours, sons et vibrations), définition cachée. Une ou
// deux questions (utils/dictionary : wordTest). Réussi : le mot passe à
// « Maîtrisé », puis « Un autre mot ? » avec deux mots liés. Raté : la bonne
// réponse avec la définition, et le mot reviendra en révision.
export default function WordTestScreen() {
  const { term } = useLocalSearchParams<{ term: string }>();
  const { user } = useApi();
  const key = userKeyOf(user?.id);
  const data = useDictionary();
  const entry = findEntry(data.entries, term);
  // Un nouveau tirage à chaque test
  const [seed] = useState(() => Date.now() % 1000003);
  const questions = useMemo(() => (entry ? wordTest(data.entries, entry, seed) : []), [data.entries, entry, seed]);
  const [won, setWon] = useState<boolean | null>(null);

  if (data.isLoading) return null;
  if (!entry || questions.length === 0) {
    return (
      <View style={styles.state}>
        <PageState variant="empty" mood="complice" text="Pas de test possible pour ce mot pour l’instant." actionLabel="Retour" onAction={leave} />
      </View>
    );
  }
  if (won !== null) return <WordTestEnd entry={entry} entries={data.entries} won={won} userKey={key} />;
  return (
    <WordTestPlayer
      entry={entry}
      screens={questions.map(wordQuestionScreen)}
      onFinished={(ok) => {
        recordWordResult(key, entry.term, ok).catch(() => {});
        setWon(ok);
      }}
    />
  );
}

function WordTestPlayer({ entry, screens, onFinished }: { entry: DictionaryEntry; screens: unknown[]; onFinished: (won: boolean) => void }) {
  const [lesson] = useState(() => normalizeLesson({ title: entry.term, screens }));
  const finished = useCallback(
    (summary: { correct: number; total: number }) => onFinished(summary.total > 0 && summary.correct === summary.total),
    [onFinished]
  );
  const mode = useMemo(
    () => ({ lesson, onFinished: finished, badge: 'TESTE-TOI', retry: false, exitTo: '/dictionary' as const }),
    [lesson, finished]
  );
  return <ApprendreDetailScreen discovery={mode} />;
}

function WordTestEnd({ entry, entries, won, userKey }: { entry: DictionaryEntry; entries: DictionaryEntry[]; won: boolean; userKey: string }) {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const memory = useWordStates(userKey);
  const lessons = useWordLessons(entries);
  const terms = useMemo(() => entries.map((e) => e.term), [entries]);
  // Deux mots liés (mêmes leçons, même catégorie), pas encore vus d'abord
  const [suggested] = useState(() =>
    won
      ? relatedWords(
          entries,
          entry,
          (t) => (memory ? wordState(memory, t) !== 'nouveau' : false),
          (t) => (lessons ? wordsInSameLessons(lessons.index, t, terms) : [])
        )
      : []
  );

  useEffect(() => {
    if (won) {
      success();
      feedback.lessonComplete();
    }
  }, [won]);

  return (
    <View style={[styles.end, { paddingTop: insets.top + space[6], paddingBottom: insets.bottom + space[3] }]}>
      <ScrollView contentContainerStyle={styles.endContent} showsVerticalScrollIndicator={false}>
        <AppText accessibilityRole="header" maxFontSizeMultiplier={1.3} style={styles.title}>
          {won ? 'Bien vu !' : 'Pas encore'}
        </AppText>
        <AppText maxFontSizeMultiplier={1.3} style={[styles.term, { color: colors.gold }]}>
          {entry.term}
        </AppText>
        {won ? (
          <Pill size="badge" icon="checkmark" label="MAÎTRISÉ" accessibilityLabel="Maîtrisé" background={colors.goldSoft} color={colors.gold} style={styles.pill} />
        ) : null}

        {won ? (
          <ValBubble mood="celebrant" diameter={VAL_DIAMETER} text="Ce mot est maîtrisé. Il reviendra de temps en temps dans ta révision." />
        ) : (
          <>
            <View style={[styles.answer, { backgroundColor: colors.panel, borderColor: colors.cardBorder }]} accessible>
              <AppText variant="sectionLabel">La bonne réponse</AppText>
              <AppText maxFontSizeMultiplier={1.6} style={styles.definition}>
                {entry.definition}
              </AppText>
            </View>
            <ValBubble mood="rassurant" diameter={VAL_DIAMETER} text="Il reviendra dans ta révision, tu le retiendras." />
          </>
        )}

        {suggested.length > 0 ? (
          <View style={styles.more}>
            <AppText variant="sectionLabel" accessibilityRole="header">
              Un autre mot ?
            </AppText>
            <View style={styles.rows}>
              {suggested.map((e, i) => (
                <ListRow
                  key={e.term}
                  title={e.term}
                  subtitle={e.category}
                  leading={<Ionicons name="book-outline" size={20} color={colors.gold} />}
                  showChevron
                  last={i === suggested.length - 1}
                  onPress={() => router.replace(termHref(e.term))}
                  accessibilityHint="Ouvre sa fiche"
                />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
      <Button label={won ? 'Terminer' : 'Réessayer plus tard'} onPress={leave} />
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space[5],
  },
  end: {
    flex: 1,
    paddingHorizontal: space[5],
  },
  endContent: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: space[4],
    paddingBottom: space[4],
  },
  title: {
    fontFamily: fonts.title,
    fontSize: TITLE_SIZE,
    lineHeight: TITLE_SIZE + 6,
    letterSpacing: titleLetterSpacing(TITLE_SIZE),
    textAlign: 'center',
  },
  term: {
    fontFamily: fonts.title,
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
    marginTop: -space[2],
  },
  pill: {
    alignSelf: 'center',
  },
  answer: {
    padding: space[4],
    borderRadius: radius.card,
    borderWidth: 1,
    gap: space[2],
  },
  definition: {
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 26,
  },
  more: {
    marginTop: space[2],
    gap: space[1],
  },
  rows: {
    marginHorizontal: -space[4],
  },
});
