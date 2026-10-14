// Leçon découverte 5 — objectif « Payer moins d'impôts ».
// Déclic : changer de tranche ne fait jamais perdre d'argent ; seule la partie
// au-dessus du seuil est taxée plus. Barème simplifié, annoncé comme tel :
// 0 % jusqu'à 11 000 €, 11 % jusqu'à 30 000 €, 30 % au-delà.
// Texte : lecons-decouvertes.md (leçon 5). Au format de GET /lessons/{id}.

import { PARI_INTRO, TRUE_FALSE_QUESTION } from './shared';

export const impots = {
  title: 'Le mythe de la tranche',
  // Déclic du document : carte « À RETENIR » de la fin de leçon
  takeaway: 'Changer de tranche ne fait jamais perdre d’argent ; seule la partie au-dessus du seuil est taxée plus.',
  // Phrase d'accroche : carte de l'accueil sans compte
  hook: 'Pourquoi une prime ne fait jamais perdre d’argent',
  screens: [
    {
      type: 'slider',
      scored: false,
      val: { intro: PARI_INTRO },
      payload: {
        question:
          'Une prime fait passer ton revenu imposable de 29 000 € à 31 000 €, et tu changes de tranche : de 11 % à 30 %. De combien augmente ton impôt ?',
        subtitle: 'Barème simplifié : 0 % jusqu’à 11 000 €, 11 % jusqu’à 30 000 €, 30 % au-delà.',
        min: 0,
        max: 3000,
        step: 10,
        start: 1500,
        unit: '€',
      },
    },
    {
      type: 'reveal',
      scored: false,
      val: {
        intro: {
          line: 'Beaucoup refusent une augmentation par peur de changer de tranche. C’est une erreur : tu gardes toujours la plus grosse partie.',
          mood: 'alerte',
        },
      },
      payload: {
        value: 410,
        unit: '€',
        label: 'En vrai',
        from_screen: 0,
        lines: [
          { label: 'Les 1 000 € sous le seuil, taxés à 11 %, font', value: 110 },
          { label: 'Les 1 000 € au-dessus, taxés à 30 %, font', value: 300 },
          { label: 'Au total, d’impôt en plus pour 2 000 € de prime', value: 410, key: true },
          { label: 'Barème simplifié pour l’exemple', value: '', dim: true },
        ],
      },
    },
    {
      type: 'true_false',
      scored: true,
      val: {
        correct: { line: 'Tu comprends déjà mieux l’impôt que la plupart des gens.', mood: 'celebrant' },
        wrong: { line: 'L’impôt est rempli d’idées reçues. On va les démonter ensemble.', mood: 'rassurant' },
      },
      payload: {
        question: TRUE_FALSE_QUESTION,
        pass: 3,
        cards: [
          {
            id: 'tranche',
            statement: 'Changer de tranche peut faire baisser ton revenu après impôt.',
            answer: false,
            explanation: 'Seule la partie au-dessus du seuil est taxée plus.',
          },
          {
            id: 'source',
            statement: 'Le prélèvement à la source est un impôt en plus.',
            answer: false,
            explanation: 'C’est seulement une façon de payer ton impôt, chaque mois.',
          },
          {
            id: 'don',
            statement: 'Un don à une association peut réduire ton impôt.',
            answer: true,
            explanation: 'Une grande partie du don peut être déduite de ton impôt.',
          },
          {
            id: 'marginal',
            statement: 'Ton taux marginal est le taux de ta dernière tranche.',
            answer: true,
            explanation: 'Et il ne s’applique qu’à la partie de ton revenu dans cette tranche.',
          },
        ],
      },
    },
    {
      type: 'match',
      scored: true,
      val: {
        correct: { line: 'Ces quatre mots, et ta feuille d’impôts devient lisible.', mood: 'fier' },
        wrong: { line: 'Ils se ressemblent, c’est normal de les mélanger au début.', mood: 'rassurant' },
      },
      payload: {
        question: 'Relie chaque mot à sa définition.',
        max_errors: 1,
        pairs: [
          { id: 'marginal', left: 'Taux marginal', right: 'Le taux de ta dernière tranche' },
          { id: 'moyen', left: 'Taux moyen', right: 'Ton impôt divisé par ton revenu' },
          { id: 'reduction', left: 'Réduction d’impôt', right: 'Une somme retirée directement de ton impôt' },
          { id: 'deduction', left: 'Déduction', right: 'Une somme retirée de ton revenu imposable' },
        ],
        right_order: ['deduction', 'reduction', 'marginal', 'moyen'],
      },
    },
    {
      type: 'choice',
      scored: true,
      val: {
        correct: { line: 'Exactement. Et c’est ça qui compte vraiment.', mood: 'celebrant' },
        wrong: { line: 'C’est le piège classique : les 30 % ne touchent que le haut de son revenu.', mood: 'rassurant' },
      },
      explanation:
        'Ses 11 000 premiers euros ne sont pas taxés, les suivants le sont à 11 %. Son taux moyen est d’environ 12,7 %, bien en dessous de 30 %.',
      payload: {
        question: 'Avec ce barème, Léa gagne 40 000 €. Son taux moyen est-il aussi de 30 % ?',
        mode: 'single',
        options: [
          { id: 'oui', text: 'Oui, tout son revenu est taxé à 30 %' },
          { id: 'plus-bas', text: 'Non, il est plus bas, car ses premiers euros sont moins taxés', correct: true },
          { id: 'plus-haut', text: 'Non, il est plus haut que 30 %' },
        ],
      },
    },
  ],
} as const;
