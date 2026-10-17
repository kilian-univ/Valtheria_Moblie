import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import Text from '@/src/components/common/Text';

import BlockRenderer from '@/src/components/article/BlockRenderer';
import Header from '@/src/components/topbar/header';
import { getArticleDetailStyles, palette } from '@/src/constants/style/Style';
import { Article, useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { ArticleDetailSkeleton } from '@/src/components/common/ScreenSkeletons';
import LoadErrorState from '@/src/components/common/LoadErrorState';
import PageState from '@/src/components/common/PageState';
import { useDictionary } from '@/src/hooks/useDictionary';
import { loadErrorKind, type LoadError } from '@/src/utils/loadError';

// Blocs de l'article ; contenu illisible : aucun bloc plutôt qu'un plantage
function parseBlocks(content: unknown): unknown[] {
  if (typeof content !== 'string' || content === '') return [];
  try {
    const parsed: unknown = JSON.parse(content);
    const blocks = parsed && typeof parsed === 'object' ? (parsed as { blocks?: unknown }).blocks : null;
    return Array.isArray(blocks) ? blocks : [];
  } catch {
    return [];
  }
}

// Un article : chargement, introuvable, ou erreur (réseau ou serveur), avec
// « Réessayer » ; jamais un message brut du serveur
type Status = { kind: 'loading' } | { kind: 'ready' } | { kind: 'missing' } | { kind: 'error'; error: LoadError };

// 404 de Laravel (« No query results for model… ») ou repli d'ApiContext
function isNotFound(err: unknown): boolean {
  return err instanceof Error && /no query results|introuvable|not found/i.test(err.message);
}

export default function ArticleDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { getArticle, viewArticle, toggleFavoriteArticle, toggleReadLaterArticle, isAuthenticated } = useApi();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const styles = getArticleDetailStyles(colorScheme);
  // Mots du Dictionnaire (déjà chargés une fois pour toute l'app) : liens dans le texte
  const dictionary = useDictionary();
  const dictionaryTerms = dictionary.entries.map((e) => e.term);

  const [article, setArticle] = useState<Article | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    getArticle(slug)
      .then((data: Article) => {
        if (!active) return;
        setArticle(data);
        setStatus({ kind: 'ready' });
        if (isAuthenticated) viewArticle(data.id).catch(() => {});
      })
      .catch((err: unknown) => {
        if (active) setStatus(isNotFound(err) ? { kind: 'missing' } : { kind: 'error', error: loadErrorKind(err) });
      });
    return () => {
      active = false;
    };
  }, [slug, attempt, getArticle, viewArticle, isAuthenticated]);

  // Le contenu est une chaîne JSON à parser ({ blocks: [...] })
  const blocks = parseBlocks(article?.content);

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

  if (status.kind !== 'ready' || !article) {
    return (
      <View style={styles.container}>
        <Header showBack />
        {status.kind === 'error' ? (
          <LoadErrorState
            title="Article indisponible"
            what="cet article"
            kind={status.error}
            onRetry={() => {
              setStatus({ kind: 'loading' });
              setAttempt((n) => n + 1);
            }}
          />
        ) : status.kind === 'missing' ? (
          <PageState variant="empty" mood="preoccupe" text="Cet article n’est plus disponible." actionLabel="Retour" onAction={() => router.back()} />
        ) : (
          <ArticleDetailSkeleton />
        )}
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