import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import Text from '@/src/components/common/Text';

import Button from '@/src/components/common/Button';
import LoadErrorState from '@/src/components/common/LoadErrorState';
import PageState from '@/src/components/common/PageState';
import { ArticleListSkeleton } from '@/src/components/common/ScreenSkeletons';
import Header from '@/src/components/topbar/header';
import { getArticlesStyles, palette, space } from '@/src/constants/style/Style';
import { Article, useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { fetchArticlesPage } from '@/src/state/articlesFeed';
import { mergeArticles } from '@/src/utils/articlesPage';
import { loadErrorKind, staleDataText, type LoadError } from '@/src/utils/loadError';

type Feed = {
  items: Article[];
  // Dernière page lue, et dernière page du serveur
  page: number;
  lastPage: number;
};

// Articles : toutes les pages de l'API (12 par page), la suivante chargée au
// bas de la liste. Un échec n'affiche jamais « Aucun article ».
export default function ArticlesScreen() {
  const { toggleFavoriteArticle, isAuthenticated } = useApi();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const styles = getArticlesStyles(colorScheme);

  const [feed, setFeed] = useState<Feed | null>(null);
  // Échec de la première page, ou d'une page suivante
  const [error, setError] = useState<LoadError | null>(null);
  const [moreError, setMoreError] = useState<LoadError | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const busy = useRef(false);

  // Première page : à l'ouverture, puis à chaque « Réessayer » ou actualisation
  const [attempt, setAttempt] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  useEffect(() => {
    let active = true;
    fetchArticlesPage(1).then(
      (p) => {
        if (!active) return;
        setFeed({ items: p.items as Article[], page: p.page, lastPage: p.lastPage });
        setError(null);
        setMoreError(null);
        setIsRefreshing(false);
      },
      (err: unknown) => {
        if (!active) return;
        setError(loadErrorKind(err));
        setIsRefreshing(false);
      }
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  // Page suivante, au bas de la liste
  const loadMore = useCallback(async () => {
    if (!feed || feed.page >= feed.lastPage || busy.current) return;
    busy.current = true;
    setLoadingMore(true);
    try {
      const p = await fetchArticlesPage(feed.page + 1);
      setFeed((f) => (f ? { items: mergeArticles(f.items, p.items) as Article[], page: p.page, lastPage: p.lastPage } : f));
      setMoreError(null);
    } catch (err: unknown) {
      setMoreError(loadErrorKind(err));
    } finally {
      busy.current = false;
      setLoadingMore(false);
    }
  }, [feed]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setAttempt((n) => n + 1);
  };

  const retryFirst = () => {
    setError(null);
    setAttempt((n) => n + 1);
  };

  const handleFavorite = async (article: Article) => {
    if (!isAuthenticated) {
      router.push('/client/login');
      return;
    }

    // Mise à jour optimiste : on inverse l'état localement tout de suite,
    // et on annule si le serveur refuse
    const flip = (value: boolean | undefined) =>
      setFeed((f) => (f ? { ...f, items: f.items.map((a) => (a.id === article.id ? { ...a, is_favorite: value } : a)) } : f));
    flip(!article.is_favorite);

    try {
      await toggleFavoriteArticle(article.id);
    } catch {
      flip(article.is_favorite);
    }
  };

  if (!feed) {
    return (
      <View style={styles.container}>
        <Header showBack />
        {error ? <LoadErrorState title="Articles indisponibles" what="les articles" kind={error} onRetry={retryFirst} /> : <ArticleListSkeleton />}
      </View>
    );
  }

  const hasMore = feed.page < feed.lastPage;

  return (
    <View style={styles.container}>
      <Header showBack />

      {/* Actualisation ratée : la liste déjà chargée reste affichée */}
      {error ? <PageState variant="offline" text={staleDataText(error, 'Les articles déjà chargés')} /> : null}

      <FlatList
        data={feed.items}
        keyExtractor={(item) => item.slug}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.gold} />}
        onEndReached={() => {
          if (!moreError) loadMore();
        }}
        onEndReachedThreshold={0.6}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push({ pathname: '/articles/[slug]', params: { slug: item.slug } })}>
            {item.cover_image ? <Image source={{ uri: item.cover_image }} style={styles.cover} /> : null}

            <View style={styles.cardBody}>
              <View style={styles.cardHeader}>
                {item.category ? (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{item.category}</Text>
                  </View>
                ) : null}
                <Pressable
                  hitSlop={8}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleFavorite(item);
                  }}
                >
                  <Ionicons name={item.is_favorite ? 'star' : 'star-outline'} size={20} color={colors.gold} />
                </Pressable>
              </View>

              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>

              {item.excerpt ? (
                <Text style={styles.excerpt} numberOfLines={2}>
                  {item.excerpt}
                </Text>
              ) : null}

              {item.published_at ? (
                <Text style={styles.date}>
                  {new Date(item.published_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                  })}
                </Text>
              ) : null}
            </View>
          </Pressable>
        )}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={colors.gold} style={local.footer} accessibilityLabel="Chargement des articles suivants" />
          ) : moreError && hasMore ? (
            <View style={[local.footer, local.footerError]}>
              <Text style={styles.emptyText}>
                {moreError === 'network' ? 'Pas de connexion internet : la suite n’a pas pu se charger.' : 'La suite des articles n’a pas pu se charger.'}
              </Text>
              <Button
                variant="secondary"
                size="sm"
                label="Réessayer"
                onPress={() => {
                  setMoreError(null);
                  loadMore();
                }}
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucun article pour le moment.</Text>
          </View>
        }
      />
    </View>
  );
}

const local = StyleSheet.create({
  footer: {
    marginVertical: space[6],
  },
  footerError: {
    alignItems: 'center',
    gap: space[2],
  },
});
