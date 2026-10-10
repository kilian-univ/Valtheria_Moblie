// Leçon découverte 2 — objectif « Mettre de l'argent de côté ».
// Déclic : l'argent qui dort sur un compte courant perd de la valeur ; le
// mettre de côté au bon endroit le protège.
// Texte : lecons-decouvertes.md (leçon 2). Calcul : 1 000 / 1,02^10 = 820,35.

import { PARI_INTRO } from './shared';

export const epargner = {
  title: 'L’argent qui fond',
  screens: [
    {
      type: 'slider',
      scored: false,
      val: { intro: PARI_INTRO },
      payload: {
        question:
          'Tu laisses 1 000 € sur ton compte courant pendant 10 ans. Avec 2 % d’inflation par an, que pourras-tu encore acheter avec, en euros d’aujourd’hui ?',
        min: 500,
        max: 1200,
        step: 10,
        start: 1000,
        unit: '€',
      },
    },
    {
      type: 'reveal',
      scored: false,
      val: { intro: { line: 'Le chiffre ne bouge pas. C’est ce qu’il achète qui fond.', mood: 'alerte' } },
      payload: {
        value: 820,
        unit: '€',
        label: 'En vrai, environ',
        from_screen: 0,
        lines: [
          { label: 'Sur le compte, toujours', value: 1000 },
          { label: 'Ce que ça achète encore, environ', value: 820, key: true },
          { label: '2 % par an est une hypothèse', value: '', dim: true },
        ],
      },
    },
    {
      type: 'choice',
      scored: true,
      val: {
        correct: { line: 'Exactement : disponible et protégé.', mood: 'fier' },
        wrong: { line: 'C’est tentant. Mais un coussin doit rester disponible et ne pas fondre.', mood: 'rassurant' },
      },
      explanation:
        'Un livret se retire à tout moment et ses intérêts compensent une partie de l’inflation. La bourse, elle, peut baisser juste quand tu as besoin de l’argent.',
      payload: {
        question: 'Pour ton coussin de sécurité, quelle est la meilleure place ?',
        subtitle: 'Indice : un livret rapporte des intérêts, un compte courant non.',
        mode: 'single',
        options: [
          { id: 'courant', text: 'Le compte courant, pour l’avoir sous la main' },
          { id: 'livret', text: 'Un livret d’épargne, disponible et rémunéré', correct: true },
          { id: 'actions', text: 'Des actions en bourse, pour qu’il rapporte plus' },
        ],
      },
    },
    {
      type: 'choice',
      scored: true,
      val: {
        correct: { line: 'Le vrai secret de ceux qui épargnent sans effort.', mood: 'celebrant' },
        wrong: { line: 'C’est ce que fait presque tout le monde, et c’est pour ça que ça marche rarement.', mood: 'rassurant' },
      },
      explanation:
        'À la fin du mois, il reste rarement quelque chose, et les primes sont irrégulières. Un virement le jour de la paie, c’est te payer en premier.',
      payload: {
        question: 'Pour mettre de côté sans y penser, le plus efficace ?',
        mode: 'single',
        options: [
          { id: 'reste', text: 'Garder ce qui reste à la fin du mois' },
          { id: 'virement', text: 'Programmer un virement le jour où la paie tombe', correct: true },
          { id: 'prime', text: 'Mettre de côté chaque fois qu’une prime arrive' },
        ],
      },
    },
  ],
} as const;
