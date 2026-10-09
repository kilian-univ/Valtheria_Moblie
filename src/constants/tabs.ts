// Onglets de la barre du bas, dans l'ordre : seule source de vérité, lue par
// app/(tabs)/_layout.tsx et par le fond commun (coins de lumière distincts).
// Le nom est le premier segment de l'adresse de l'onglet.
export const TAB_ROUTES = [
  { name: 'apprendre', title: 'Apprendre', icon: 'school-outline' },
  { name: 'dictionary', title: 'Dictionnaire', icon: 'book-outline' },
  { name: 'article', title: 'Articles', icon: 'newspaper-outline' },
  { name: 'outils', title: 'Outils', icon: 'stats-chart-outline' },
] as const;
