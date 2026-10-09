import type { Href } from 'expo-router';

// Adresse de la fiche d'un mot, selon l'endroit d'où on l'ouvre :
//
// - depuis l'onglet Dictionnaire : la fiche s'empile dans la pile de
//   l'onglet (barre d'onglets visible), le retour ramène au Dictionnaire ;
// - depuis N'IMPORTE QUEL AUTRE ÉCRAN (article, leçon…) : la fiche s'ouvre
//   dans la pile racine, PAR-DESSUS l'écran d'origine. Une adresse de
//   l'onglet ramènerait sous les onglets et fermerait cet écran : le retour
//   ne pourrait plus y revenir.

export function dictionaryTermHref(term: string): Href {
  return { pathname: '/dictionary/mot', params: { term } };
}

export function termHref(term: string): Href {
  return { pathname: '/dictionnaire/mot', params: { term } };
}
