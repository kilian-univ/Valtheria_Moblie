import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ReactNode, useEffect } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/src/components/apprendre/module/ModuleHeader';
import AppText from '@/src/components/common/AppText';
import ListRow from '@/src/components/common/ListRow';
import PageState from '@/src/components/common/PageState';
import { SkeletonGroup } from '@/src/components/common/Skeleton';
import { StaggerItem } from '@/src/components/common/Stagger';
import ValBubble from '@/src/components/common/ValBubble';
import { Reserved, TermSkeleton } from '@/src/components/dictionary/DictionaryStates';
import NeighborButtons from '@/src/components/dictionary/NeighborButtons';
import TermIllustration from '@/src/components/dictionary/TermIllustration';
import TermQuiz from '@/src/components/dictionary/TermQuiz';
import TermRow from '@/src/components/dictionary/TermRow';
import { fonts, palette, size, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { Module, useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { useDictionary, useDictionaryFavorites, useDictionaryRecents } from '@/src/hooks/useDictionary';
import { OFFLINE_BANNER } from '@/src/hooks/useLearningData';
import { learningStore } from '@/src/state/learningStore';
import { DictionaryLesson, findEntry, neighbors, sameFamily, shareMessage } from '@/src/utils/dictionary';
import { dictionaryTermHref, termHref } from '@/src/utils/dictionaryLinks';
import { select, tap } from '@/src/utils/haptics';

const TERM_SIZE = 40;
const VAL_DIAMETER = 56;
const ACTION_ICON = 22;

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

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/dictionary'));
  const href = (t: string, c?: string | null) => (standalone ? termHref(t, c) : dictionaryTermHref(t, c));
  const openTerm = (t: string) => router.push(href(t));
  // Précédent / suivant : la fiche est remplacée (pas d'empilement infini),
  // le filtre de catégorie est conservé
  const replaceTerm = (t: string) => router.replace(href(t, category));

  const toggleStar = () => {
    if (!entry) return;
    select();
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

        <StaggerItem index={2}>
          <View style={styles.block}>
            <TermQuiz key={entry.term} entries={data.entries} entry={entry} />
          </View>
        </StaggerItem>

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

        {entry.lessons ? (
          <StaggerItem index={4}>
            <View style={[styles.block, styles.listRows]}>
              {entry.lessons.map((lesson, i) => (
                <ListRow
                  key={lesson.id}
                  title={`Vu dans la leçon ${lesson.title}`}
                  leading={<Ionicons name="school-outline" size={size.icon} color={colors.gold} />}
                  showChevron
                  last={i === entry.lessons!.length - 1}
                  onPress={() => openLesson(lesson)}
                  accessibilityHint="Ouvre le module de cette leçon"
                />
              ))}
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
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + space[2] }]}>
      <View style={styles.topRow}>
        <BackButton onBack={goBack} />
        {entry && !data.reserved ? (
          <View style={styles.actions}>
            <Pressable
              onPress={toggleStar}
              accessibilityRole="button"
              accessibilityLabel={starred ? 'Retirer de Mes mots' : 'Ajouter à Mes mots'}
              accessibilityState={{ selected: starred }}
              style={({ pressed }) => [styles.action, pressed && { backgroundColor: colors.surface2 }]}
            >
              <Ionicons name={starred ? 'star' : 'star-outline'} size={ACTION_ICON} color={colors.gold} />
            </Pressable>
            <Pressable
              onPress={share}
              accessibilityRole="button"
              accessibilityLabel="Partager ce mot"
              style={({ pressed }) => [styles.action, styles.lastAction, pressed && { backgroundColor: colors.surface2 }]}
            >
              <Ionicons name="share-outline" size={ACTION_ICON} color={colors.text} />
            </Pressable>
          </View>
        ) : null}
      </View>
      {body}
    </ScrollView>
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
  action: {
    width: size.tapMin,
    height: size.tapMin,
    borderRadius: size.tapMin / 2,
    alignItems: 'center',
    justifyContent: 'center',
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
