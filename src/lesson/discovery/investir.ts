// Leçon découverte 2 — objectif « Commencer à investir ».
// Déclic : le temps fait plus que le montant ; placés 30 ans, 100 € par mois
// peuvent plus que doubler.
// Texte : lecons-decouvertes.md (leçon 2). Au format de GET /lessons/{id}.

import { PARI_INTRO } from './shared';

export const investir = {
  title: 'La machine à intérêts',
  // Phrase d'accroche : carte de l'accueil sans compte
  hook: 'Ce que le temps fait à 100 € par mois',
  screens: [
    {
      type: 'slider',
      scored: false,
      val: { intro: PARI_INTRO },
      payload: {
        question: 'Tu places 100 € par mois pendant 30 ans. Si ça rapporte 5 % par an en moyenne, combien as-tu à la fin ?',
        min: 30000,
        max: 150000,
        step: 1000,
        start: 45000,
        unit: '€',
      },
    },
    {
      type: 'reveal',
      scored: false,
      val: {
        intro: {
          line: 'Plus de la moitié de cet argent, tu ne l’as jamais versée. C’est le temps qui l’a fabriquée.',
          mood: 'complice',
        },
      },
      payload: {
        value: 81500,
        unit: '€',
        start: { label: 'Tu as versé', value: 36000 },
        label: 'En vrai, environ',
        from_screen: 0,
        lines: [
          { label: 'Tu as versé', value: 36000 },
          { label: 'Les intérêts ont ajouté environ', value: 45500, key: true },
          { label: '5 % par an est une hypothèse, rien n’est garanti en bourse', value: '', dim: true },
        ],
      },
    },
    {
      type: 'simulator',
      scored: false,
      payload: {
        question: 'Et si tu commençais plus tôt, ou plus tard ? Bouge le curseur.',
        subtitle: '100 € par mois jusqu’à 65 ans, à 5 % par an.',
        label: 'Âge de départ',
        min: 20,
        max: 50,
        step: 1,
        start: 30,
        unit: 'ans',
        formula: 'savings_from_age',
        params: { monthly: 100, rate: 0.05, end_age: 65 },
        outputs: [
          { key: 'capital', label: 'Ton capital à 65 ans', unit: '€', big: true },
          { key: 'paid', label: 'Total versé', unit: '€' },
        ],
        ranges: [
          { max: 29, line: 'Commencer tôt, c’est le meilleur cadeau à te faire.', mood: 'complice' },
          { min: 30, max: 40, line: 'Chaque année gagnée compte, et il n’est pas trop tard.', mood: 'complice' },
          { min: 41, line: 'Moins de temps, donc plus d’effort par mois : mais ça reste utile.', mood: 'complice' },
        ],
      },
    },
    {
      type: 'order',
      scored: true,
      val: {
        correct: { line: 'Tu viens de comprendre la diversification.', mood: 'fier' },
        wrong: { line: 'Presque. Plus ton argent est réparti, moins il est risqué.', mood: 'rassurant' },
      },
      explanation:
        'Le Livret A est garanti par l’État. Le fonds en euros protège ton capital. Un ETF Monde répartit ton argent sur des milliers d’entreprises. Une seule action, c’est tout miser sur un seul nom.',
      payload: {
        question: 'Classe ces placements, du moins risqué au plus risqué.',
        // Dans l'ordre juste ; start : l'ordre présenté
        items: [
          { id: 'livret', text: 'Livret A' },
          { id: 'fonds', text: 'Fonds en euros d’une assurance-vie' },
          { id: 'etf', text: 'ETF Monde' },
          { id: 'action', text: 'Action d’une seule entreprise' },
        ],
        start: ['etf', 'action', 'livret', 'fonds'],
      },
    },
    {
      type: 'choice',
      scored: true,
      val: {
        correct: { line: 'Exactement : ne pas mettre tous ses œufs dans le même panier.', mood: 'celebrant' },
        wrong: {
          line: 'C’est une idée répandue, mais aucun ETF n’est garanti. Sa force, c’est la répartition.',
          mood: 'rassurant',
        },
      },
      explanation:
        'Si une entreprise va mal, les milliers d’autres amortissent le choc. Mais un ETF peut baisser, et rien n’est garanti.',
      payload: {
        question: 'Pourquoi un ETF Monde est-il en général moins risqué qu’une seule action ?',
        mode: 'single',
        options: [
          { id: 'etat', text: 'Parce qu’il est garanti par l’État' },
          { id: 'repartition', text: 'Parce qu’il répartit ton argent sur des milliers d’entreprises', correct: true },
          { id: 'plafond', text: 'Parce qu’il ne peut pas baisser de plus de 10 %' },
        ],
      },
    },
  ],
} as const;
