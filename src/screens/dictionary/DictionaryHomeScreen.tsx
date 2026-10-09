import { useLocalSearchParams, useRouter } from 'expo-router';
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  SectionList,
  SectionListData,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '@/src/components/common/AppText';
import PageState from '@/src/components/common/PageState';
import { SkeletonGroup } from '@/src/components/common/Skeleton';
import { StaggerItem } from '@/src/components/common/Stagger';
import AlphabetIndex, { INDEX_WIDTH } from '@/src/components/dictionary/AlphabetIndex';
import Chip from '@/src/components/dictionary/Chip';
import { HomeSkeleton, NoResult, Reserved } from '@/src/components/dictionary/DictionaryStates';
import SearchBar from '@/src/components/dictionary/SearchBar';
import TermRow, { LETTER_HEADER_HEIGHT, LetterHeader, termRowHeight } from '@/src/components/dictionary/TermRow';
import WordOfDayCard from '@/src/components/dictionary/WordOfDayCard';
import { palette, space } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { useDictionary, useDictionaryRecents } from '@/src/hooks/useDictionary';
import { OFFLINE_BANNER } from '@/src/hooks/useLearningData';
import {
  categoriesByCount,
  DictionaryEntry,
  letterSections,
  normalizeText,
  recentEntries,
  searchEntries,
  suggestions,
  wordOfTheDay,
  wordsLabel,
} from '@/src/utils/dictionary';
import { formatInteger } from '@/src/utils/format';
import { select } from '@/src/utils/haptics';

type Section = { title: string; data: DictionaryEntry[] };

// L'index commence sous le titre et la barre de recherche : il ne couvre pas
// le bouton effacer
const INDEX_TOP = 140;

// Erreur de chargement : même texte que sur Apprendre, adapté aux mots
function errorMessage(kind: 'network' | 'server'): string {
  return kind === 'network'
    ? 'Impossible de charger le dictionnaire : pas de connexion internet.'
    : 'Impossible de charger le dictionnaire : le serveur ne répond pas.';
}

export default function DictionaryHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { user } = useApi();
  const { term: termParam } = useLocalSearchParams<{ term?: string }>();

  const data = useDictionary();
  const { recents } = useDictionaryRecents(user?.id);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [headerH, setHeaderH] = useState(0);
  const listRef = useRef<SectionList<DictionaryEntry, Section>>(null);

  const openTerm = useCallback(
    (term: string) => router.push({ pathname: '/dictionary/mot', params: { term } }),
    [router]
  );

  // Anciens liens « ?term= » (articles, liens externes) : la fiche s'ouvre
  // directement, une seule fois
  useEffect(() => {
    if (!termParam) return;
    router.setParams({ term: undefined });
    openTerm(termParam);
  }, [termParam, router, openTerm]);

  const searching = normalizeText(query) !== '';
  const results = useMemo(() => searchEntries(data.entries, query, category), [data.entries, query, category]);
  const sections: Section[] = useMemo(
    () => (searching ? (results.length ? [{ title: '', data: results }] : []) : letterSections(results)),
    [searching, results]
  );
  const available = useMemo(() => new Set(sections.map((s) => s.title)), [sections]);
  const categories = useMemo(() => categoriesByCount(data.entries), [data.entries]);
  const today = useMemo(() => wordOfTheDay(data.entries, new Date()), [data.entries]);
  const recent = useMemo(() => recentEntries(data.entries, recents), [data.entries, recents]);
  const close = useMemo(
    () => (searching && results.length === 0 ? suggestions(category ? searchEntries(data.entries, '', category) : data.entries, query) : []),
    [searching, results.length, data.entries, query, category]
  );

  // Hauteurs fixes : offset de chaque élément (en-tête de lettre, lignes,
  // pied vide de section), en-tête de la liste compris
  const rowH = termRowHeight(fontScale);
  const letterH = searching ? 0 : LETTER_HEADER_HEIGHT;
  const layout = useMemo(() => {
    const items: { length: number; offset: number }[] = [];
    let offset = headerH;
    for (const s of sections) {
      for (const length of [letterH, ...s.data.map(() => rowH), 0]) {
        items.push({ length, offset });
        offset += length;
      }
    }
    return items;
  }, [sections, headerH, letterH, rowH]);

  const jumpToLetter = (letter: string) => {
    const sectionIndex = sections.findIndex((s) => s.title === letter);
    if (sectionIndex >= 0) listRef.current?.scrollToLocation({ sectionIndex, itemIndex: 0, viewOffset: 0, animated: false });
  };

  const pickCategory = (name: string | null) => {
    select();
    setCategory((current) => (current === name ? null : name));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await data.reload();
    setRefreshing(false);
  };

  const ready = !data.isLoading && !data.reserved && !data.error;
  const showIndex = ready && !searching && sections.length > 0;
  const rowPadding = showIndex ? space[5] + INDEX_WIDTH / 2 : space[5];
  const count = data.entries.length;

  // ---------------------------------------------------------------------------
  // En-tête de la liste : titre, recherche, puis blocs de l'accueil
  // ---------------------------------------------------------------------------
  let blocks: ReactNode = null;
  if (data.isLoading) {
    blocks = (
      <SkeletonGroup>
        <HomeSkeleton />
      </SkeletonGroup>
    );
  } else if (data.reserved) {
    blocks = (
      <Reserved
        count={count || null}
        onRegister={() => router.push('/client/register')}
        onLogin={() => router.push('/client/login')}
      />
    );
  } else if (data.error) {
    blocks = (
      <PageState variant="error" title="Dictionnaire indisponible" message={errorMessage(data.error)} onRetry={data.reload} />
    );
  } else if (searching) {
    blocks =
      results.length > 0 ? (
        <AppText variant="sectionLabel" style={styles.count}>
          {category ? `${wordsLabel(formatInteger(results.length), results.length)} · ${category}` : wordsLabel(formatInteger(results.length), results.length)}
        </AppText>
      ) : null;
  } else {
    blocks = (
      <>
        {today ? (
          <StaggerItem index={0}>
            <View style={styles.block}>
              <WordOfDayCard entry={today} onPress={() => openTerm(today.term)} />
            </View>
          </StaggerItem>
        ) : null}

        {recent.length > 0 ? (
          <StaggerItem index={1}>
            <View style={styles.block}>
              <AppText variant="sectionLabel" style={styles.label}>
                Récemment consultés
              </AppText>
              <View style={styles.wrap}>
                {recent.map((e) => (
                  <Chip key={e.term} icon="time-outline" label={e.term} onPress={() => openTerm(e.term)} />
                ))}
              </View>
            </View>
          </StaggerItem>
        ) : null}

        {categories.length > 1 ? (
          <StaggerItem index={2}>
            <View style={styles.block}>
              <AppText variant="sectionLabel" style={styles.label}>
                Catégories
              </AppText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.bleed}
                contentContainerStyle={styles.categories}
              >
                <Chip label="Tout" active={category === null} onPress={() => pickCategory(null)} />
                {categories.map((c) => (
                  <Chip key={c.name} label={c.name} active={category === c.name} onPress={() => pickCategory(c.name)} />
                ))}
              </ScrollView>
            </View>
          </StaggerItem>
        ) : null}
      </>
    );
  }

  const header = (
    <View onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)} style={[styles.header, { paddingTop: insets.top + space[2] }]}>
      <AppText variant="title1" accessibilityRole="header">
        Dictionnaire
      </AppText>
      {count > 0 ? (
        <AppText variant="body" tone="subtitle" style={styles.subtitle}>
          {`${formatInteger(count)} mots de l'argent, expliqués simplement`}
        </AppText>
      ) : null}
      {data.offline ? <PageState variant="offline" text={OFFLINE_BANNER} style={styles.offline} /> : null}
      {!data.reserved && !data.error ? (
        <View style={styles.search}>
          <SearchBar value={query} onChange={setQuery} />
        </View>
      ) : null}
      {blocks}
    </View>
  );

  return (
    <View style={styles.screen}>
      <SectionList<DictionaryEntry, Section>
        ref={listRef}
        sections={ready ? sections : []}
        keyExtractor={(e) => e.term}
        renderItem={({ item, index, section }) => (
          <TermRow
            entry={item}
            height={rowH}
            query={searching ? query : ''}
            last={index === section.data.length - 1}
            paddingRight={rowPadding}
            onPress={() => openTerm(item.term)}
          />
        )}
        renderSectionHeader={({ section }: { section: SectionListData<DictionaryEntry, Section> }) =>
          searching ? null : <LetterHeader letter={section.title} />
        }
        stickySectionHeadersEnabled={!searching}
        getItemLayout={(_data, index) => ({ ...(layout[index] ?? { length: 0, offset: 0 }), index })}
        ListHeaderComponent={header}
        ListEmptyComponent={
          ready && searching ? <NoResult query={query} close={close} onSuggestion={setQuery} /> : null
        }
        initialNumToRender={20}
        windowSize={11}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.content}
        refreshControl={
          ready || data.offline ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.gold}
              colors={[colors.gold]}
              progressBackgroundColor={colors.surface}
            />
          ) : undefined
        }
      />
      {showIndex ? (
        <View style={[styles.index, { top: insets.top + INDEX_TOP }]} pointerEvents="box-none">
          <AlphabetIndex available={available} onLetter={jumpToLetter} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingBottom: space[10],
  },
  header: {
    paddingHorizontal: space[5],
    paddingBottom: space[2],
  },
  subtitle: {
    marginTop: space[1],
  },
  offline: {
    marginTop: space[4],
    marginHorizontal: -space[5],
  },
  search: {
    marginTop: space[5],
  },
  block: {
    marginTop: space[6],
  },
  label: {
    marginBottom: space[3],
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
  },
  // Les pastilles défilent jusqu'au bord de l'écran
  bleed: {
    marginHorizontal: -space[5],
  },
  categories: {
    gap: space[2],
    paddingHorizontal: space[5],
  },
  count: {
    marginTop: space[6],
  },
  index: {
    position: 'absolute',
    right: 0,
    bottom: space[4],
    width: INDEX_WIDTH,
  },
});
