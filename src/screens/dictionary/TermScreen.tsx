import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ReactNode, useEffect } from 'react';
import { ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BackButton from '@/src/components/common/BackButton';
import { StatusBarShade } from '@/src/components/common/AppBackground';
import AppText from '@/src/components/common/AppText';
import ListRow from '@/src/components/common/ListRow';
import PageState from '@/src/components/common/PageState';
import { SkeletonGroup } from '@/src/components/common/Skeleton';
import { StaggerItem } from '@/src/components/common/Stagger';
import ValBubble from '@/src/components/common/ValBubble';
import { Reserved, TermSkeleton } from '@/src/components/dictionary/DictionaryStates';
import NeighborButtons from '@/src/components/dictionary/NeighborButtons';
import TermIllustration from '@/src/components/dictionary/TermIllustration';
import ReliefCard from '@/src/components/common/ReliefCard';
import Button from '@/src/components/common/Button';
import TermRow from '@/src/components/dictionary/TermRow';
import { fonts, palette, size, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { Module, useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { useDictionary, useDictionaryFavorites, useDictionaryRecents } from '@/src/hooks/useDictionary';
import { OFFLINE_BANNER } from '@/src/hooks/useLearningData';
import { learningStore } from '@/src/state/learningStore';
import { DictionaryLesson, findEntry, neighbors, sameFamily, shareMessage, wordQuestionFormats } from '@/src/utils/dictionary';
import { useWordLessons } from '@/src/hooks/useWordLessons';
import { markWordSeen, useWordStates } from '@/src/state/wordStates';
import { lessonsOfWord } from '@/src/utils/wordLessonIndex';
import { type WordState, wordState, wordStateLabel } from '@/src/utils/wordStates';
import { dictionaryTermHref, termHref } from '@/src/utils/dictionaryLinks';
import { userKeyOf } from '@/src/state/userMemory';
import { feedback } from '@/src/utils/feedback';
import { select, tap } from '@/src/utils/haptics';
import IconButton from '@/src/components/common/IconButton';

const TERM_SIZE = 40;
const VAL_DIAMETER = 56;
const ACTION_ICON = 22;
// « Tu le croises dans » : 2 leçons au plus
const CROSSED_MAX = 2;

// État du mot sous son titre : un point pour « Vu », une coche dorée pour
// « Maîtrisé »
function WordStateTag({ state }: { state: WordState }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const mastered = state === 'maitrise';
  return (
    <View style={styles.stateRow} accessible accessibilityLabel={`État : ${wordStateLabel(state)}`}>
      {mastered ? (
        <Ionicons name="checkmark-circle" size={16} color={colors.gold} />
      ) : (
        <View style={[styles.stateDot, { backgroundColor: colors.subtitle }]} />
      )}
      <AppText variant="caption" style={{ color: mastered ? colors.gold : colors.subtitle }}>
        {wordStateLabel(state)}
      </AppText>
    </View>
  );
}

// « Teste-toi » : une carte qui ouvre le test sur ce mot, en plein écran
function TestCard({ mastered, onStart }: { mastered: boolean; onStart: () => void }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  return (
    <ReliefCard>
      <View style={styles.testHead}>
        <Ionicons name="flash" size={14} color={colors.gold} />
        <AppText variant="sectionLabel" accessibilityRole="header">
          Teste-toi
        </AppText>
      </View>
      <AppText variant="body" style={styles.testText}>
        {mastered
          ? 'Tu le maîtrises déjà. Envie de vérifier ?'
          : 'Une ou deux questions sur ce mot, définition cachée. Réussis et il passe à « Maîtrisé ».'}
      </AppText>
      <Button label="Me tester" icon="flash" onPress={onStart} style={styles.testButton} />
    </ReliefCard>
  );
}

function moduleOfLesson(modules: Module[], lessonId: number): Module | null {
  return modules.find((m) => (m.lessons ?? []).some((l) => l.id === lessonId)) ?? null;
}

// Fiche d'un mot. Dans la pile de l'onglet Dictionnaire (barre d'onglets
// visible), ou `standalone` : pile racine, par-dessus l'écran qui l'a ouverte
// (article…), où ramène le retour. Les mots de la même famille s'ouvrent dans
// la même pile que la fiche.
export default function TermScreen({ standalone = false }: { standalone?: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { user, getModules } = useApi();
  // category : filtre actif quand la fiche a été ouverte (précédent / suivant)
  const { term, category } = useLocalSearchParams<{ term: string; category?: string }>();

  const data = useDictionary();
  const { addRecent } = useDictionaryRecents(user?.id);
  const favorites = useDictionaryFavorites(user?.id);
  const entry = findEntry(data.entries, term);
  const family = entry ? sameFamily(data.entries, entry) : [];
  const around = entry ? neighbors(data.entries, entry, category ?? null) : { previous: null, next: null };
  const starred = entry ? favorites.isFavorite(entry.term) : false;

  // Ouvrir une fiche l'ajoute aux récemment consultés
  const openedTerm = entry?.term ?? null;
  useEffect(() => {
    if (openedTerm) addRecent(openedTerm);
  }, [openedTerm, addRecent]);
  // … et le marque « Vu » (la première fois seulement)
  const userKey = userKeyOf(user?.id);
  useEffect(() => {
    if (openedTerm) markWordSeen(userKey, openedTerm).catch(() => {});
  }, [openedTerm, userKey]);
  const wordMemory = useWordStates(userKey);
  const state = entry && wordMemory ? wordState(wordMemory, entry.term) : null;
  // Leçons où le mot apparaît : celles du serveur s'il les envoie, sinon
  // l'index construit sur le téléphone (2 au plus)
  const wordLessons = useWordLessons(data.entries);
  const croised: DictionaryLesson[] = entry
    ? (entry.lessons ??
        (wordLessons
          ? lessonsOfWord(wordLessons.index, entry.term)
              .map((id) => ({ id, title: wordLessons.lessons.get(id)?.title ?? '' }))
              .filter((l) => l.title !== '')
          : [])
      ).slice(0, CROSSED_MAX)
    : [];
  const testable = entry ? wordQuestionFormats(data.entries, entry).length > 0 : false;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/dictionary'));
  const href = (t: string, c?: string | null) => (standalone ? termHref(t, c) : dictionaryTermHref(t, c));
  const openTerm = (t: string) => router.push(href(t));
  // Précédent / suivant : la fiche est remplacée (pas d'empilement infini),
  // le filtre de catégorie est conservé
  const replaceTerm = (t: string) => router.replace(href(t, category));

  const toggleStar = () => {
    if (!entry) return;
    // Ajouté à « Mes mots » : vibration et son ; retiré : la vibration seule
    if (starred) select();
    else feedback.pick();
    favorites.toggle(entry.term);
  };

  const share = () => {
    if (!entry) return;
    tap();
    Share.share({ message: shareMessage(entry) }).catch(() => {});
  };

  // Page du module de la leçon : modules déjà chargés par Apprendre, sinon
  // demandés au serveur
  const openLesson = async (lesson: DictionaryLesson) => {
    let module = moduleOfLesson(learningStore.getState().modules, lesson.id);
    if (!module) {
      try {
        const modules: Module[] = await getModules();
        module = moduleOfLesson(Array.isArray(modules) ? modules : [], lesson.id);
      } catch {
        module = null;
      }
    }
    if (module) router.push({ pathname: '/apprendre/module/[moduleId]', params: { moduleId: module.id } });
    else router.push('/apprendre');
  };

  let body: ReactNode;
  if (data.reserved) {
    body = (
      <Reserved
        count={data.entries.length || null}
        onRegister={() => router.push('/client/register')}
        onLogin={() => router.push('/client/login')}
      />
    );
  } else if (data.isLoading) {
    body = (
      <SkeletonGroup>
        <TermSkeleton />
      </SkeletonGroup>
    );
  } else if (data.error) {
    body = (
      <PageState
        variant="error"
        title="Dictionnaire indisponible"
        message={
          data.error === 'network'
            ? 'Impossible de charger le dictionnaire : pas de connexion internet.'
            : 'Impossible de charger le dictionnaire : le serveur ne répond pas.'
        }
        onRetry={data.reload}
      />
    );
  } else if (!entry) {
    body = (
      <PageState
        variant="error"
        title="Mot introuvable"
        message="Ce mot n'est pas (ou plus) dans le dictionnaire."
        retryLabel={standalone ? 'Retour' : 'Retour au dictionnaire'}
        onRetry={standalone ? goBack : () => router.replace('/dictionary')}
      />
    );
  } else {
    body = (
      <>
        {data.offline ? <PageState variant="offline" text={OFFLINE_BANNER} style={styles.offline} /> : null}

        <StaggerItem index={0}>
          <AppText variant="sectionLabel">{entry.category}</AppText>
          {/* Le mot passe à la ligne avant l'illustration, jamais dessous */}
          <View style={styles.titleRow}>
            <AppText
              maxFontSizeMultiplier={1.3}
              accessibilityRole="header"
              style={[styles.term, styles.termText, { color: colors.text }]}
            >
              {entry.term}
            </AppText>
            <TermIllustration category={entry.category} />
          </View>
          {state && state !== 'nouveau' ? <WordStateTag state={state} /> : null}
          <AppText maxFontSizeMultiplier={1.6} style={[styles.definition, { color: colors.text }]}>
            {entry.definition}
          </AppText>
        </StaggerItem>

        {entry.plain ? (
          <StaggerItem index={1}>
            <View style={styles.block}>
              <ValBubble mood="complice" diameter={VAL_DIAMETER} text={`En clair : ${entry.plain}`} />
            </View>
          </StaggerItem>
        ) : null}

        {testable ? (
          <StaggerItem index={2}>
            <View style={styles.block}>
              <TestCard
                mastered={state === 'maitrise'}
                onStart={() => router.push({ pathname: '/dictionnaire/test', params: { term: entry.term } })}
              />
            </View>
          </StaggerItem>
        ) : null}

        {family.length > 0 ? (
          <StaggerItem index={3}>
            <View style={styles.block}>
              <AppText variant="sectionLabel" style={styles.label}>
                Dans la même famille
              </AppText>
              <View style={styles.rows}>
                {family.map((e, i) => (
                  <TermRow key={e.term} entry={e} last={i === family.length - 1} onPress={() => openTerm(e.term)} />
                ))}
              </View>
            </View>
          </StaggerItem>
        ) : null}

        {croised.length > 0 ? (
          <StaggerItem index={4}>
            <View style={styles.block}>
              <AppText variant="sectionLabel" style={styles.label}>
                Tu le croises dans
              </AppText>
              <View style={styles.listRows}>
                {croised.map((lesson, i) => (
                  <ListRow
                    key={lesson.id}
                    title={lesson.title}
                    leading={<Ionicons name="school-outline" size={size.icon} color={colors.gold} />}
                    showChevron
                    last={i === croised.length - 1}
                    onPress={() => openLesson(lesson)}
                    accessibilityHint="Ouvre le module de cette leçon"
                  />
                ))}
              </View>
            </View>
          </StaggerItem>
        ) : null}

        <StaggerItem index={5}>
          <View style={styles.block}>
            <NeighborButtons previous={around.previous} next={around.next} onOpen={(e) => replaceTerm(e.term)} />
          </View>
        </StaggerItem>
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + space[2] }]}>
        <View style={styles.topRow}>
          <BackButton onBack={goBack} />
          {entry && !data.reserved ? (
            <View style={styles.actions}>
              <IconButton
                icon={starred ? 'star' : 'star-outline'}
                iconSize={ACTION_ICON}
                color={colors.gold}
                onPress={toggleStar}
                accessibilityLabel={starred ? 'Retirer de Mes mots' : 'Ajouter à Mes mots'}
                accessibilityState={{ selected: starred }}
              />
              <IconButton
                icon="share-outline"
                iconSize={ACTION_ICON}
                onPress={share}
                accessibilityLabel="Partager ce mot"
                style={styles.lastAction}
              />
            </View>
          ) : null}
        </View>
        {body}
      </ScrollView>
      {/* Rien ne passe sous la barre d'état en défilant */}
      <StatusBarShade tab="dictionary" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: space[5],
    paddingBottom: space[10],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space[4],
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Aligne optiquement la dernière icône sur la marge de 20
  lastAction: {
    marginRight: -space[3],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    marginTop: space[2],
  },
  termText: {
    flex: 1,
    marginTop: 0,
  },
  offline: {
    marginBottom: space[4],
    marginHorizontal: -space[5],
  },
  term: {
    fontFamily: fonts.title,
    fontSize: TERM_SIZE,
    lineHeight: 46,
    letterSpacing: titleLetterSpacing(TERM_SIZE),
    marginTop: space[2],
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: space[2],
  },
  stateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  testHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  testText: {
    marginTop: space[2],
  },
  testButton: {
    marginTop: space[4],
  },
  definition: {
    fontFamily: fonts.body,
    fontSize: 18,
    lineHeight: 28,
    marginTop: space[4],
  },
  block: {
    marginTop: space[8],
  },
  label: {
    marginBottom: space[2],
  },
  // Lignes pleine largeur : le texte s'aligne sur la marge de 20, le fond
  // pressé déborde jusqu'au bord
  rows: {
    marginHorizontal: -space[5],
  },
  // ListRow porte déjà une marge intérieure de 16
  listRows: {
    marginHorizontal: -space[4],
  },
});
