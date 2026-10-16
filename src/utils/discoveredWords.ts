// Mots découverts du Dictionnaire, sans React : testables avec Node. Un mot
// est découvert la première fois que sa fiche est ouverte (mémoire dans
// state/discoveredWords.ts). Le total vient du dictionnaire.

const wordKey = (term: string) =>
  term.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

// Ajout unique (sans casse ni accents) ; l'ordre de découverte est gardé
export function addDiscovered(list: readonly string[], term: string): string[] {
  const t = term.trim();
  if (!t || list.some((w) => wordKey(w) === wordKey(t))) return [...list];
  return [...list, t];
}

// Fusion (mots découverts sans compte repris par le compte)
export function mergeDiscovered(base: readonly string[], extra: readonly string[]): string[] {
  return extra.reduce((acc, w) => addDiscovered(acc, w), [...base]);
}

// Nombre de mots découverts encore présents dans le dictionnaire (un mot
// retiré ne compte plus) ; dictionnaire pas encore chargé : tous
export function discoveredCount(list: readonly string[], dictionaryTerms: readonly string[] | null): number {
  if (!dictionaryTerms || dictionaryTerms.length === 0) return list.length;
  const known = new Set(dictionaryTerms.map(wordKey));
  return list.filter((w) => known.has(wordKey(w))).length;
}
