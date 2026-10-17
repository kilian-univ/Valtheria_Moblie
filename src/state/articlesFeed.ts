import { API_BASE_URL } from '@/src/context/ApiContext';
import { parseArticlesPage, type ArticlesPage } from '@/src/utils/articlesPage';

// Délai maximal d'une page : au-delà, l'échec est traité comme hors ligne
const TIMEOUT_MS = 15_000;

// Une page d'articles (route publique, même adresse que ApiContext). L'app
// n'en lisait que la première : 12 articles sur 38.
export async function fetchArticlesPage(page: number): Promise<ArticlesPage> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/articles?page=${page}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    const json: unknown = await response.json().catch(() => {
      throw new Error('Réponse des articles illisible');
    });
    if (!response.ok) throw new Error('Articles indisponibles');
    return parseArticlesPage(json, page);
  } catch (e: unknown) {
    // Délai dépassé : même message qu'une coupure du réseau
    if (e instanceof Error && e.name === 'AbortError') throw new TypeError('Network request timed out');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
