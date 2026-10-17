// Pages d'articles de GET /api/articles (paginateur Laravel : 12 par page).
// Fonctions pures, sans React : testables avec Node.

export type ArticleItem = { id: number; slug: string; title: string; [key: string]: unknown };
export type ArticlesPage = { items: ArticleItem[]; page: number; lastPage: number };

function isItem(v: unknown): v is ArticleItem {
  return !!v && typeof v === 'object' && typeof (v as ArticleItem).slug === 'string' && (v as ArticleItem).slug !== '';
}

// Réponse paginée { current_page, data, last_page }, ou liste simple (une
// seule page) ; toute autre forme est une erreur du serveur
export function parseArticlesPage(json: unknown, requested: number): ArticlesPage {
  if (Array.isArray(json)) return { items: json.filter(isItem), page: requested, lastPage: requested };
  if (json && typeof json === 'object' && Array.isArray((json as { data?: unknown }).data)) {
    const r = json as { data: unknown[]; current_page?: unknown; last_page?: unknown };
    const page = typeof r.current_page === 'number' ? r.current_page : requested;
    const lastPage = typeof r.last_page === 'number' && r.last_page >= page ? r.last_page : page;
    return { items: r.data.filter(isItem), page, lastPage };
  }
  throw new Error('Réponse des articles inattendue');
}

// Pages mises bout à bout, sans doublon (un article publié entre deux pages
// décale la liste : il réapparaîtrait sinon)
export function mergeArticles(current: readonly ArticleItem[], next: readonly ArticleItem[]): ArticleItem[] {
  const seen = new Set(current.map((a) => a.slug));
  return [...current, ...next.filter((a) => !seen.has(a.slug))];
}
