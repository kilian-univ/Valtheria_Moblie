import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';

import BlockRenderer from '@/src/components/article/BlockRenderer';
import Header from '@/src/components/topbar/header';
import { getArticleDetailStyles, palette } from '@/src/constants/style/Style';
import { Article, useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';

export default function ArticleDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const {
    getArticle,
    viewArticle,
    toggleFavoriteArticle,
    toggleReadLaterArticle,
    getDictionaryTerms,
    isAuthenticated,
  } = useApi();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const styles = getArticleDetailStyles(colorScheme);

  const [article, setArticle] = useState<Article | null>(null);
  const [dictionaryTerms, setDictionaryTerms] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  if (!slug) return;

    getArticle(slug)
      .then((data: any) => {
        setArticle(data);
        if (isAuthenticated) {
          viewArticle(data.id).catch(() => {});
        }
      })
      .catch((err: any) => setError(err.message || 'Article introuvable.'))
      .finally(() => setIsLoading(false));

    // Chargement des termes en parallèle, best-effort : si ça échoue,
    // l'article s'affiche quand même, simplement sans liens dictionnaire.
    getDictionaryTerms()
      .then((terms: any[]) => setDictionaryTerms(terms.map((t) => t.term)))
      .catch(() => {});
  }, [slug]);

  // Le contenu est une chaîne JSON à parser ({ blocks: [...] })
  const blocks = useMemo(() => {
    if (!article?.content) return [];
    try {
      const parsed = JSON.parse(article.content);
      return parsed.blocks ?? [];
    } catch {
      return [];
    }
  }, [article?.content]);

  const requireAuth = () => router.push('/client/login');

  const handleFavorite = async () => {
    if (!article) return;
    if (!isAuthenticated) return requireAuth();

    setArticle({ ...article, is_favorite: !article.is_favorite });
    try {
      await toggleFavoriteArticle(article.id);
    } catch {
      setArticle((prev) => prev && { ...prev, is_favorite: article.is_favorite });
    }
  };

  const handleReadLater = async () => {
    if (!article) return;
    if (!isAuthenticated) return requireAuth();

    setArticle({ ...article, is_read_later: !article.is_read_later });
    try {
      await toggleReadLaterArticle(article.id);
    } catch {
      setArticle((prev) => prev && { ...prev, is_read_later: article.is_read_later });
    }
  };

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

  if (error || !article) {
    return (
      <View style={styles.container}>
        <Header showBack />
        <Text style={styles.error}>{error || 'Article introuvable.'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header showBack />

      <ScrollView contentContainerStyle={styles.scroll}>
        {article.cover_image && (
          <Image source={{ uri: article.cover_image }} style={styles.cover} />
        )}

        <View style={styles.content}>
          {article.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{article.category}</Text>
            </View>
          )}

          <Text style={styles.title}>{article.title}</Text>

          <View style={styles.meta}>
            <Text style={styles.date}>
              {article.published_at &&
                new Date(article.published_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              {article.reading_time ? ` · ${article.reading_time} min de lecture` : ''}
            </Text>

            <View style={styles.actions}>
              <Pressable onPress={handleReadLater} hitSlop={8}>
                <Ionicons
                  name={article.is_read_later ? 'bookmark' : 'bookmark-outline'}
                  size={22}
                  color={colors.gold}
                />
              </Pressable>
              <Pressable onPress={handleFavorite} hitSlop={8}>
                <Ionicons
                  name={article.is_favorite ? 'star' : 'star-outline'}
                  size={22}
                  color={colors.gold}
                />
              </Pressable>
            </View>
          </View>

          <BlockRenderer blocks={blocks} colorScheme={colorScheme} dictionaryTerms={dictionaryTerms} />
        </View>
      </ScrollView>
    </View>
  );
}