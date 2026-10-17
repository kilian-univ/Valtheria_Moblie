import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mergeArticles, parseArticlesPage } from '@/src/utils/articlesPage';

const a = (slug: string) => ({ id: slug.length, slug, title: slug });

test('page du paginateur Laravel : articles, page courante et dernière page', () => {
  const p = parseArticlesPage({ current_page: 2, last_page: 4, per_page: 12, data: [a('x'), a('y')] }, 2);
  assert.deepEqual(p.items.map((i) => i.slug), ['x', 'y']);
  assert.equal(p.page, 2);
  assert.equal(p.lastPage, 4);
});

test('38 articles publiés : 4 pages de 12 lues jusqu’au bout', () => {
  let all: ReturnType<typeof a>[] = [];
  let page = 1;
  let last = 1;
  do {
    const slice = Array.from({ length: Math.min(12, 38 - (page - 1) * 12) }, (_, k) => a(`article-${(page - 1) * 12 + k}`));
    const p = parseArticlesPage({ current_page: page, last_page: 4, data: slice }, page);
    all = mergeArticles(all, p.items) as typeof all;
    last = p.lastPage;
    page += 1;
  } while (page <= last);
  assert.equal(all.length, 38);
});

test('liste simple ou enveloppe { data } : une seule page', () => {
  assert.equal(parseArticlesPage([a('x')], 1).lastPage, 1);
  assert.equal(parseArticlesPage({ data: [a('x')] }, 1).lastPage, 1);
});

test('réponse inattendue : erreur, jamais « aucun article »', () => {
  assert.throws(() => parseArticlesPage({ message: 'Server Error' }, 1));
  assert.throws(() => parseArticlesPage(null, 1));
});

test('les pages se suivent sans doublon, et les éléments sans slug sont écartés', () => {
  assert.deepEqual(mergeArticles([a('x'), a('y')], [a('y'), a('z')]).map((i) => i.slug), ['x', 'y', 'z']);
  assert.equal(parseArticlesPage({ data: [a('x'), { id: 3 }, null] }, 1).items.length, 1);
});
