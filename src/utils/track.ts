// Mesure : une seule fonction pour toute l'app. Pour l'instant elle écrit
// dans la console en développement et ne fait rien d'autre ; un outil de
// mesure se branchera ici, et nulle part ailleurs.

export type TrackEvent =
  | 'app_ouverte'
  | 'objectif_choisi'
  | 'decouverte_commencee'
  | 'decouverte_terminee'
  | 'inscription_commencee'
  | 'compte_cree'
  | 'rappel_active';

export function track(name: TrackEvent, data: Record<string, unknown> = {}): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log(`[mesure] ${name}`, data);
}
