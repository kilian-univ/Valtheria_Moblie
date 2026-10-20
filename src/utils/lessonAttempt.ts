// Identifiant d'une partie de leçon, choisi par l'app et envoyé au serveur
// avec la fin de leçon (`attempt_id` de POST /lessons/{id}/complete). Le même
// à chaque renvoi de cette partie (« Réessayer » après une réponse arrivée
// trop tard), un nouveau à chaque leçon rechargée : le serveur ne crédite
// jamais deux fois la même partie (XP, Vals, série, coffre). Fonction pure,
// testable avec Node.

// Lettres et chiffres, un tiret : accepté par le serveur (64 caractères au plus)
export const ATTEMPT_ID_PATTERN = /^[a-z0-9]{6,12}-[a-z0-9]{8}$/;

const RANDOM_SPAN = 36 ** 8;

export function newAttemptId(now: number = Date.now(), random: number = Math.random()): string {
  const time = Math.max(0, Math.floor(now)).toString(36);
  const salt = Math.floor(Math.min(Math.max(random, 0), 0.999999999) * RANDOM_SPAN)
    .toString(36)
    .padStart(8, '0');
  return `${time}-${salt}`;
}
