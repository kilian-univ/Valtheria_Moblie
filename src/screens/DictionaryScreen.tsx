import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  SectionList,
  Text,
  TextInput,
  View,
} from 'react-native';

import Header from '@/src/components/topbar/header';
import { getDictionaryStyles, palette } from '@/src/constants/style/Style';
import { DictionaryTerm, useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { Filter } from '../components/topbar/Filtrer';

type Section = {
  title: string;
  data: DictionaryTerm[];
};

export default function DictionaryScreen() {
  const { getDictionaryTerms } = useApi();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const styles = getDictionaryStyles(colorScheme);
  const { term: termParam } = useLocalSearchParams<{ term?: string }>();

  const [terms, setTerms] = useState<DictionaryTerm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const sectionListRef = useRef<SectionList<DictionaryTerm, Section>>(null);
  const appliedTermParam = useRef<string | null>(null);

  useEffect(() => {
    getDictionaryTerms()
      .then(setTerms)
      .catch((err: any) => setError(err.message || 'Impossible de charger le dictionnaire.'))
      .finally(() => setIsLoading(false));
  }, []);

  // Liste des catégories uniques, triées alphabétiquement
  const categories = useMemo(() => {
    const unique = new Set(terms.map((t) => t.category));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [terms]);

  // Regroupe les termes par première lettre, triés alphabétiquement
  const sections: Section[] = useMemo(() => {
    let filtered = terms;

    if (selectedCategory) {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      filtered = filtered.filter((t) => t.term.toLowerCase().includes(q));
    }

    const groups = new Map<string, DictionaryTerm[]>();

    [...filtered]
      .sort((a, b) => a.term.localeCompare(b.term))
      .forEach((t) => {
        const letter = t.term.charAt(0).toUpperCase();
        if (!groups.has(letter)) groups.set(letter, []);
        groups.get(letter)!.push(t);
      });

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, data]) => ({ title, data }));
  }, [terms, query, selectedCategory]);

  // Applique le terme reçu en paramètre (une seule fois par valeur reçue) :
  // remplit la recherche, ouvre sa définition, et scrolle jusqu'à lui.
  useEffect(() => {
    if (!termParam || terms.length === 0) return;
    if (appliedTermParam.current === termParam) return; // déjà traité pour cette valeur

    appliedTermParam.current = termParam;
    setQuery(termParam);
    setSelectedCategory(null);

    const match = terms.find((t) => t.term.toLowerCase() === termParam.toLowerCase());
    if (match) {
      setExpanded(match.term);
    }
  }, [termParam, terms]);

  // Scroll jusqu'à la section/l'item correspondant, une fois la liste filtrée recalculée
  useEffect(() => {
    if (!expanded) return;
    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
      const itemIndex = sections[sectionIndex].data.findIndex((t) => t.term === expanded);
      if (itemIndex !== -1) {
        // Léger délai pour laisser le SectionList terminer son rendu après le filtre
        setTimeout(() => {
          sectionListRef.current?.scrollToLocation({
            sectionIndex,
            itemIndex,
            animated: true,
            viewPosition: 0.2,
          });
        }, 150);
        break;
      }
    }
  }, [expanded, sections]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Header showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header showBack />

      <View style={{ paddingHorizontal: 20 }}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un terme"
          placeholderTextColor={colors.subtitle}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
      </View>

      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingVertical: 10,
            alignItems: 'center',
          }}
        >
          <Filter
            label="Toutes"
            isActive={selectedCategory === null}
            onPress={() => setSelectedCategory(null)}
            colors={colors}
          />
          {categories.map((category) => (
            <Filter
              key={category}
              label={category}
              isActive={selectedCategory === category}
              onPress={() =>
                setSelectedCategory((prev) =>
                  prev === category ? null : category
                )
              }
              colors={colors}
            />
          ))}
        </ScrollView>
      )}

      {error && (
        <Text style={{ color: colors.error, paddingHorizontal: 20, marginTop: 8 }}>{error}</Text>
      )}

      <SectionList
        ref={sectionListRef}
        sections={sections}
        keyExtractor={(item) => item.term}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled
        onScrollToIndexFailed={() => {
          // SectionList peut échouer si les hauteurs ne sont pas encore mesurées ;
          // on retente une fois après un court délai plutôt que de crasher.
          setTimeout(() => {
            const sectionIndex = sections.findIndex((s) => s.data.some((t) => t.term === expanded));
            if (sectionIndex === -1) return;
            const itemIndex = sections[sectionIndex].data.findIndex((t) => t.term === expanded);
            sectionListRef.current?.scrollToLocation({
              sectionIndex,
              itemIndex,
              animated: true,
              viewPosition: 0.2,
            });
          }, 300);
        }}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item, index, section }) => {
          const isLast = index === section.data.length - 1;
          const isOpen = expanded === item.term;

          return (
            <View style={index === 0 ? styles.card : undefined}>
              <Pressable
                style={[styles.item, isLast && styles.itemLast]}
                onPress={() => setExpanded(isOpen ? null : item.term)}
              >
                <View style={styles.itemHeader}>
                  <Text style={styles.term}>{item.term}</Text>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{item.category}</Text>
                  </View>
                </View>
                {isOpen && <Text style={styles.definition}>{item.definition}</Text>}
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucun terme trouvé.</Text>
          </View>
        }
      />
    </View>
  );
}