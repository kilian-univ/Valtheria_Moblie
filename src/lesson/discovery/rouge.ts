// Leçon découverte 5 — objectif « Ne plus finir le mois dans le rouge ».
// Déclic : dans le rouge, ce ne sont pas les intérêts qui coûtent cher, ce
// sont les frais ; le seul vrai rempart, c'est de regarder le solde moins ce
// qui va encore tomber.
// Texte : lecons-decouvertes.md (leçon 5).

import { PARI_INTRO } from './shared';

export const rouge = {
  title: 'Le piège du solde',
  screens: [
    {
      type: 'slider',
      scored: false,
      val: { intro: PARI_INTRO },
      payload: {
        question:
          'Ton compte est à moins 50 €. Trois prélèvements passent quand même. Combien la banque peut-elle te prendre en frais ?',
        min: 0,
        max: 60,
        step: 1,
        start: 5,
        unit: '€',
      },
    },
    {
      type: 'reveal',
      scored: false,
      val: {
        intro: {
          line: 'Près de la moitié de ton découvert, juste en frais. Les intérêts, eux, ne font que quelques centimes.',
          mood: 'alerte',
        },
      },
      payload: {
        value: 24,
        unit: '€',
        label: 'Jusqu’à',
        from_screen: 0,
        lines: [
          {
            label: '3 opérations × 8 € de commission d’intervention, le plafond légal par opération',
            value: 24,
            key: true,
          },
          { label: 'Plafonné par mois à', value: 80 },
          { label: 'Plafonds plus bas pour les clients en difficulté', value: '', dim: true },
        ],
      },
    },
    {
      type: 'choice',
      scored: true,
      val: {
        correct: { line: 'Tu viens d’éviter le piège numéro un du découvert.', mood: 'fier' },
        wrong: { line: 'Presque. N’oublie aucun des prélèvements à venir.', mood: 'rassurant' },
      },
      explanation: '600 moins 450, moins 30 : il te reste 120 €. C’est ce chiffre-là qu’il faut regarder avant d’acheter.',
      payload: {
        question:
          'Ton solde est de 600 €. Il reste à passer 450 € de loyer et 30 € d’abonnements. Combien as-tu vraiment ?',
        subtitle: 'La règle : le solde, moins tout ce qui doit encore être prélevé.',
        mode: 'single',
        options: [
          { id: '120', text: '120 €', correct: true },
          { id: '150', text: '150 €' },
          { id: '570', text: '570 €' },
        ],
      },
    },
    {
      type: 'choice',
      scored: true,
      val: {
        correct: { line: 'Ce réflexe-là t’évitera bien des frais.', mood: 'celebrant' },
        wrong: { line: 'Bonne intuition, mais ce qui compte, c’est ce qui n’est pas encore passé.', mood: 'rassurant' },
      },
      explanation:
        'Le solde du jour ne connaît pas les prélèvements de demain, et chaque mois est différent. Ce sont eux qui font passer dans le rouge.',
      payload: {
        question: 'Fin du mois, tu hésites à faire un achat. Ton meilleur réflexe ?',
        mode: 'single',
        options: [
          { id: 'affiche', text: 'Regarder le solde affiché' },
          { id: 'a-venir', text: 'Regarder le solde moins ce qui doit encore être prélevé', correct: true },
          { id: 'mois-dernier', text: 'Comparer avec ce qu’il te restait le mois dernier à la même date' },
        ],
      },
    },
  ],
} as const;
