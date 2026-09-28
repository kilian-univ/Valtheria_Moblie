import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
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

// Palette monochrome dorée : 4 nuances tirées de l'or de la marque, choisies
// par hash de catégorie pour rester stable, sans jamais sortir de l'identité or/violet.
function shadeOfGold(baseHex: string, category: string): string {
  const shades = [1, 0.82, 0.64, 0.46];
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const factor = shades[Math.abs(hash) % shades.length];

  const clean = baseHex.replace('#', '');
  const num = parseInt(clean, 16);
  const r = Math.min(255, Math.floor(((num >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.floor(((num >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.floor((num & 0xff) * factor));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

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

  const scrollRef = useRef<ScrollView>(null);
  const itemPositions = useRef<Record<string, number>>({});
  const appliedTermParam = useRef<string | null>(null);

  useEffect(() => {
    getDictionaryTerms()
      .then(setTerms)
      .catch((err: any) => setError(err.message || 'Impossible de charger le dictionnaire.'))
      .finally(() => setIsLoading(false));
  }, []);

  const categories = useMemo(() => {
    const unique = new Set(terms.map((t) => t.category));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [terms]);

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

  useEffect(() => {
    if (!termParam || terms.length === 0) return;
    if (appliedTermParam.current === termParam) return;

    appliedTermParam.current = termParam;
    setQuery(termParam);
    setSelectedCategory(null);

    const match = terms.find((t) => t.term.toLowerCase() === termParam.toLowerCase());
    if (match) {
      setExpanded(match.term);
    }
  }, [termParam, terms]);

  useEffect(() => {
    if (!expanded) return;
    const y = itemPositions.current[expanded];
    if (y !== undefined) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: Math.max(y - 100, 0), animated: true });
      }, 150);
    }
  }, [expanded, sections]);

  const toggleExpanded = (term: string) => {
    setExpanded((prev) => (prev === term ? null : term));
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Header showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.gold} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header showBack />

      <View style={{ paddingHorizontal: 20 }}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.subtitle} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInputWithIcon}
            placeholder="Rechercher un terme"
            placeholderTextColor={colors.subtitle}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8} style={styles.searchClearBtn}>
              <Ionicons name="close-circle" size={18} color={colors.subtitle} />
            </Pressable>
          )}
        </View>
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
              onPress={() => setSelectedCategory((prev) => (prev === category ? null : category))}
              colors={colors}
            />
          ))}
        </ScrollView>
      )}

      {error && (
        <Text style={{ color: colors.error, paddingHorizontal: 20, marginTop: 8 }}>{error}</Text>
      )}

      {sections.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIconText}>🔍</Text>
          <Text style={styles.emptyText}>Aucun terme trouvé.</Text>
        </View>
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={styles.listContent}>
          {sections.map((section) => (
            <View key={section.title}>
              <View style={styles.sectionHeaderPill}>
                <Text style={styles.sectionHeaderLetter}>{section.title}</Text>
                <View style={styles.sectionHeaderLine} />
              </View>

              {section.data.map((item, index) => {
                const isOpen = expanded === item.term;
                const shade = shadeOfGold(colors.gold, item.category);
                const itemKey = `${item.term}-${item.category}-${index}`;

                return (
                  <Pressable
                    key={itemKey}
                    collapsable={false}
                    onLayout={(e) => {
                      itemPositions.current[item.term] = e.nativeEvent.layout.y;
                    }}
                    style={isOpen ? styles.termCardOpen : styles.termCard}
                    onPress={() => toggleExpanded(item.term)}
                  >
                    <View style={styles.termRow}>
                      <View style={styles.termAccentBar} />
                      <View style={[styles.termInitial, { backgroundColor: shade }]}>
                        <Text style={styles.termInitialText}>{item.term.charAt(0).toUpperCase()}</Text>
                      </View>

                      <View style={styles.termContent}>
                        <View style={styles.termHeaderRow}>
                          <Text style={styles.termTitleText} numberOfLines={1}>
                            {item.term}
                          </Text>
                          <View style={styles.chevronWrap}>
                            <Ionicons
                              name={isOpen ? 'chevron-up' : 'chevron-down'}
                              size={14}
                              color={colors.gold}
                            />
                          </View>
                        </View>

                        <View style={[styles.categoryTag, { backgroundColor: shade + '1F' }]}>
                          <Text style={[styles.categoryTagText, { color: shade }]}>{item.category}</Text>
                        </View>

                        {isOpen && (
                          <View style={styles.definitionWrap}>
                            <Text style={styles.definitionText}>{item.definition}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}