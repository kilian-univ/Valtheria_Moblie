// Données à effacer du téléphone quand le compte est supprimé. Fonction
// pure, testable avec Node.

// Dernier profil vu (identifiant et pseudo) : gardé à la déconnexion,
// effacé à la suppression du compte
export const LAST_PROFILE_KEY = 'valtheria:lastProfile';

// Mémoire du téléphone qui n'est pas rangée par compte, mais qui parle de
// la personne : prénom, dernier profil, objectif, rappel, journal, textes
const PERSONAL_KEYS = new Set([
  'valtheria:premiere-ouverture',
  LAST_PROFILE_KEY,
  'valtheria:objectif:dernier',
  'valtheria:rappel',
  'valtheria:rappel:derniere-lecon',
  'valtheria:rappel-budget',
  'valtheria:flamme-allumee',
  'valtheria:journal-erreurs',
  'valtheria:lecons-textes',
  'valtheria:index-mots',
  'valtheria:apprendre:cache',
  'valtheria:dictionnaire:cache',
]);

export type PurgeOptions = {
  // Déconnexion : le dernier profil (identifiant, pseudo) reste sur le téléphone
  keepLastProfile?: boolean;
};

// Clés du compte (« …:<id> »), de la mémoire sans compte (« …:invite ») et
// les clés personnelles ; jamais les réglages de l'appareil (sons)
export function keysToPurge(allKeys: readonly string[], userId: number | string, options: PurgeOptions = {}): string[] {
  const id = `:${userId}`;
  return allKeys.filter(
    (k) =>
      k.startsWith('valtheria:') &&
      !(options.keepLastProfile && k === LAST_PROFILE_KEY) &&
      (k.endsWith(id) || k.endsWith(':invite') || PERSONAL_KEYS.has(k))
  );
}
