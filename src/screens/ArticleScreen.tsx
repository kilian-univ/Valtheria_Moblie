import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    Text,
    View,
} from 'react-native';

import Header from '@/src/components/topbar/header';
import { getArticlesStyles, palette } from '@/src/constants/style/Style';
import { Article, useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { ArticleListSkeleton } from '@/src/components/common/ScreenSkeletons';

export default function ArticlesScreen() {
  const { getArticles, toggleFavoriteArticle, isAuthenticated } = useApi();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const styles = getArticlesStyles(colorScheme);

  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await getArticles();
      setArticles(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger les articles.');
    }
  };

  useEffect(() => {
    load().finally(() => setIsLoading(false));
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  const handleFavorite = async (article: Article) => {
    if (!isAuthenticated) {
      router.push('/client/login');
      return;
    }

    // Mise à jour optimiste : on inverse l'état localement tout de suite,
    // et on resynchronise avec la vraie réponse serveur une fois arrivée.
    setArticles((prev) =>
      prev.map((a) => (a.id === article.id ? { ...a, is_favorite: !a.is_favorite } : a))
    );

    try {
      await toggleFavoriteArticle(article.id);
    } catch {
      // échec -> on annule l'optimisme
      setArticles((prev) =>
        prev.map((a) => (a.id === article.id ? { ...a, is_favorite: article.is_favorite } : a))
      );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Header showBack />
        <ArticleListSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header showBack />

      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={articles}
        keyExtractor={(item) => item.slug}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.gold} />
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push({ pathname: '/articles/[slug]', params: { slug: item.slug } })}
          >
            {item.cover_image && (
              <Image source={{ uri: item.cover_image }} style={styles.cover} />
            )}

            <View style={styles.cardBody}>
              <View style={styles.cardHeader}>
                {item.category && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{item.category}</Text>
                  </View>
                )}
                <Pressable
                  hitSlop={8}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleFavorite(item);
                  }}
                >
                  <Ionicons
                    name={item.is_favorite ? 'star' : 'star-outline'}
                    size={20}
                    color={colors.gold}
                  />
                </Pressable>
              </View>

              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>

              {item.excerpt && (
                <Text style={styles.excerpt} numberOfLines={2}>
                  {item.excerpt}
                </Text>
              )}

              {item.published_at && (
                <Text style={styles.date}>
                  {new Date(item.published_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                  })}
                </Text>
              )}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucun article pour le moment.</Text>
          </View>
        }
      />
    </View>
  );
}