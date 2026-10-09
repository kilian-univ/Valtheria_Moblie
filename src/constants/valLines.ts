// Répliques de Val sur l'accueil d'Apprendre. Le gras **mot** est accepté.
// Une réplique est tirée par jour (pickDailyLine) : elle ne change pas à
// chaque retour sur l'écran.

export const valLines = {
  // Cas général : une leçon à reprendre
  general: [
    'On reprend là où tu t’étais arrêté ? Je t’ai gardé ta place.',
    'Quelques minutes suffisent pour avancer. On s’y met ?',
    'Ta prochaine leçon t’attend. Chaque pas compte.',
    'Prêt pour la suite ? Je suis à côté si besoin.',
  ],
  // Une seule leçon restante dans le module
  almostDone: [
    'Plus qu’**une leçon** et tu boucles ce module.',
    'Dernière ligne droite : **une leçon** et ce module est à toi.',
  ],
} as const;

export const welcomeLine = {
  title: 'Bienvenue !',
  text: (moduleTitle: string) => `Je te conseille **${moduleTitle}** pour commencer.`,
};

export const moduleDoneLine = {
  title: 'Bien joué !',
  text: (finished: string, next: string | null) =>
    next
      ? `Tu as terminé **${finished}**. Je te propose **${next}** pour continuer.`
      : `Tu as terminé **${finished}**.`,
};

export const allDoneLine = {
  title: 'Tout est terminé !',
  text: 'Tu as fini tous les modules. Je te préviens dès que de nouveaux arrivent. En attendant, les articles t’attendent.',
};

export const guestLine = {
  title: 'Garde ta progression',
  text: 'Crée ton compte pour suivre tes leçons, garder ta série et reprendre où tu en étais.',
};

export const emptyLine = 'De nouveaux modules arrivent bientôt. Je te préviens dès qu’ils sont là.';

// Même réplique toute la journée, différente d'un jour à l'autre
export function pickDailyLine(lines: readonly string[], date: Date = new Date()): string {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  return lines[day % lines.length];
}
