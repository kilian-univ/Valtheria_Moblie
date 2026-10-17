// Erreurs de chargement : réseau absent ou serveur en panne, et les textes
// montrés à la place. Fonctions pures, sans React : testables avec Node.
// Aucun message anglais ni technique à l'écran.

import { readableMessage } from './authErrors';

export type LoadError = 'network' | 'server';

// fetch lève un TypeError quand il n'y a pas de réseau (« Network request
// failed » sur iPhone, « Failed to fetch » ou « Load failed » sur le web) ;
// toute autre erreur vient du serveur.
export function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  return /network|internet|offline|timed? ?out|failed to fetch|load failed/i.test(message);
}

export function loadErrorKind(err: unknown): LoadError {
  return isNetworkError(err) ? 'network' : 'server';
}

// « Impossible de charger ton patrimoine : pas de connexion internet. »
export function loadErrorText(kind: LoadError, what: string): string {
  return kind === 'network'
    ? `Impossible de charger ${what} : pas de connexion internet.`
    : `Impossible de charger ${what} : le serveur ne répond pas.`;
}

// Données déjà là, mais le rechargement a échoué
export function staleDataText(kind: LoadError, what: string): string {
  return kind === 'network'
    ? `Pas de connexion internet. ${what} restent affichés.`
    : `Le serveur ne répond pas. ${what} restent affichés.`;
}

// Action ratée (enregistrer, supprimer, exporter) : le message du serveur
// s'il est lisible, sinon un texte clair ; jamais « Erreur API » ni
// « Server Error ».
export function actionErrorText(
  err: unknown,
  fallback: string,
  offline = 'Pas de connexion internet : rien n’a été enregistré. Réessaie dans un instant.'
): string {
  if (isNetworkError(err)) return offline;
  const message = err instanceof Error ? err.message : null;
  return readableMessage(message) ?? fallback;
}
