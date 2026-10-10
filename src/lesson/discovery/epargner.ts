// Leçon découverte 1 — objectif « Mettre de l'argent de côté ».
// Déclic : l'argent qui dort sur un compte courant perd de la valeur ; mis de
// côté en premier, au bon endroit, il est protégé.
// Texte : lecons-decouvertes.md (leçon 1). Au format de GET /lessons/{id} :
// elle passe par normalizeLesson, comme une vraie leçon.

import { PARI_INTRO, TRUE_FALSE_QUESTION } from './shared';

export const epargner = {
  title: 'L’argent qui fond',
  // Phrase d'accroche : carte de l'accueil sans compte
  hook: 'Pourquoi l’argent qui dort perd de la valeur',
  screens: [
    {
      type: 'slider',
      scored: false,
      val: { intro: PARI_INTRO },
      payload: {
        question:
          'Tu laisses 1 000 € sur ton compte courant pendant 10 ans. Avec 2 % d’inflation par an, que pourras-tu encore acheter avec, en euros d’aujourd’hui ?',
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
          { label: '2 % par an est une hypothèse', value: '', dim: true },
        ],
      },
    },
    {
      type: 'allocate',
      scored: true,
      val: {
        correct: {
          line: '{epargne} % de ta paie, c’est {epargne_montant} € par mois et {epargne_montant*12} € dans un an, sans y penser.',
          mood: 'fier',
        },
        wrong: { line: 'Essaie d’en garder au moins 10 %. Tes envies s’en remettront.', mood: 'rassurant' },
      },
      payload: {
        question: 'Ta paie de 1 800 € vient de tomber. Quelle part pour chaque pot ?',
        // Pots en pourcentages de la paie, montant en euros dessous
        total: 100,
        step: 5,
        unit: '%',
        base: 1800,
        base_unit: '€',
        buckets: [
          { key: 'besoins', label: 'Besoins', hint: 'Loyer, courses, transport', start: 70 },
          // Réservoir : absorbe ce que les autres pots prennent ou rendent
          { key: 'envies', label: 'Envies', hint: 'Sorties, achats', start: 30, reservoir: true },
          { key: 'epargne', label: 'Épargne', start: 0, live: 'Dans un an : {epargne_montant*12} €' },
        ],
        // Réussi si l'épargne fait au moins 10 % et les besoins au moins 50 %
        rules: [
          {
            bucket: 'epargne',
            min: 10,
            val: { line: 'Essaie d’en garder au moins 10 %. Tes envies s’en remettront.', mood: 'rassurant' },
          },
          { bucket: 'besoins', min: 50, val: { line: 'Garde au moins la moitié pour le loyer et les courses.', mood: 'rassurant' } },
        ],
      },
    },
    {
      type: 'true_false',
      scored: true,
      val: {
        correct: { line: 'Tu sais déjà où ranger ton argent.', mood: 'celebrant' },
        wrong: { line: 'Pas grave, c’est exactement ce qu’on va voir ensemble.', mood: 'rassurant' },
      },
      payload: {
        question: TRUE_FALSE_QUESTION,
        pass: 3,
        cards: [
          { id: 'perte', statement: 'Le Livret A peut te faire perdre des euros.', answer: false, explanation: 'Ce que tu y mets est garanti.' },
          {
            id: 'dispo',
            statement: 'L’argent d’un Livret A est disponible à tout moment.',
            answer: true,
            explanation: 'Tu peux le retirer quand tu veux, sans frais.',
          },
          {
            id: 'coussin',
            statement: 'Un coussin de sécurité se place en bourse.',
            answer: false,
            explanation: 'Il doit rester disponible et stable, la bourse peut baisser au mauvais moment.',
          },
          {
            id: 'vingt',
            statement: 'Mettre 20 € de côté par mois, ça ne sert à rien.',
            answer: false,
            explanation: 'C’est 240 € par an, et surtout une habitude.',
          },
        ],
      },
    },
    {
      type: 'choice',
      scored: true,
      val: {
        correct: { line: 'Le vrai secret de ceux qui épargnent sans effort.', mood: 'fier' },
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
