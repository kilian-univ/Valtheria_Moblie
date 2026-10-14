// Leçon découverte 4 — objectif « Acheter un jour un logement ».
// Déclic : avec un crédit, un logement coûte bien plus que son prix, et la
// durée change tout.
// Texte : lecons-decouvertes.md (leçon 4). Au format de GET /lessons/{id}.

import { PARI_INTRO } from './shared';

export const logement = {
  title: 'Le vrai prix d’un crédit',
  // Phrase d'accroche : carte de l'accueil sans compte
  hook: 'Ce que coûte vraiment un emprunt',
  screens: [
    {
      type: 'slider',
      scored: false,
      val: { intro: PARI_INTRO },
      payload: {
        question: 'Tu empruntes 200 000 € sur 25 ans à 3,5 %. Combien rembourses-tu en tout ?',
        min: 200000,
        max: 400000,
        step: 5000,
        start: 230000,
        unit: '€',
      },
    },
    {
      type: 'reveal',
      scored: false,
      val: { intro: { line: 'La moitié du prix en plus, juste pour avoir emprunté.', mood: 'alerte' } },
      payload: {
        value: 300000,
        unit: '€',
        start: { label: 'Tu as emprunté', value: 200000 },
        label: 'En tout, environ',
        from_screen: 0,
        lines: [
          { label: 'Tu as emprunté', value: 200000 },
          { label: 'Les intérêts coûtent environ', value: 100000, key: true },
          { label: 'Soit une mensualité d’environ', value: '1 000 €' },
          { label: 'Hors assurance et frais, et le taux est une hypothèse', value: '', dim: true },
        ],
      },
    },
    {
      type: 'simulator',
      scored: false,
      payload: {
        question: 'Et si tu empruntais moins longtemps ? Bouge le curseur.',
        subtitle: 'Pour 200 000 € à 3,5 %.',
        label: 'Durée',
        min: 15,
        max: 25,
        step: 1,
        start: 25,
        unit: 'ans',
        formula: 'loan_over_years',
        params: { capital: 200000, rate: 0.035 },
        outputs: [
          { key: 'monthly', label: 'Ta mensualité', unit: '€ par mois', big: true },
          { key: 'interest', label: 'Coût total des intérêts', unit: '€' },
        ],
        ranges: [{ line: 'Plus court, chaque mois pèse plus, mais tu paies beaucoup moins d’intérêts.', mood: 'complice' }],
      },
    },
    {
      type: 'order',
      scored: true,
      val: {
        correct: { line: 'Tu connais déjà le chemin.', mood: 'fier' },
        wrong: { line: 'Presque. Tout commence par l’apport, et tout finit chez le notaire.', mood: 'rassurant' },
      },
      explanation:
        'L’apport rassure la banque. Une fois ton offre acceptée, le compromis t’engage, puis tu deviens propriétaire le jour de l’acte chez le notaire.',
      payload: {
        question: 'Remets les étapes d’un achat dans l’ordre.',
        items: [
          { id: 'apport', text: 'Mettre de côté un apport' },
          { id: 'offre', text: 'Faire une offre sur un logement' },
          { id: 'compromis', text: 'Signer le compromis de vente' },
          { id: 'acte', text: 'Signer l’acte chez le notaire' },
        ],
        start: ['compromis', 'acte', 'apport', 'offre'],
      },
    },
    {
      type: 'choice',
      scored: true,
      val: {
        correct: { line: 'Avec ça, tu peux économiser des dizaines de milliers d’euros.', mood: 'celebrant' },
        wrong: { line: 'Une durée longue soulage chaque mois, mais elle coûte bien plus cher au total.', mood: 'rassurant' },
      },
      explanation: 'Moins de mois, c’est moins d’intérêts. Et un apport réduit la somme empruntée.',
      payload: {
        question: 'Pour payer moins d’intérêts au total, le plus efficace ?',
        mode: 'single',
        options: [
          { id: 'longue', text: 'Emprunter sur une durée plus longue' },
          { id: 'courte', text: 'Emprunter sur une durée plus courte, si la mensualité reste supportable', correct: true },
          { id: 'apport', text: 'Ne mettre aucun apport pour garder ton épargne' },
        ],
      },
    },
  ],
} as const;
