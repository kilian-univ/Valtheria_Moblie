// Leçon découverte 6 — objectif « Je découvre, on verra » (leçon de la
// maquette). Déclic : tu touches 1 660 € net, tu coûtes 3 055 € à ton
// employeur ; l'écart finance ta protection sociale.
// Texte : lecons-decouvertes.md (leçon 6).

import { PARI_INTRO } from './shared';

export const decouvrir = {
  title: 'Ton vrai salaire',
  screens: [
    {
      type: 'slider',
      scored: false,
      val: { intro: PARI_INTRO },
      payload: {
        question: 'Tu touches 1 660 € net par mois. Combien coûtes-tu à ton employeur ?',
        min: 1660,
        max: 4000,
        step: 50,
        start: 2000,
        unit: '€',
      },
    },
    {
      type: 'reveal',
      scored: false,
      val: {
        intro: { line: 'Personne ne te montre ce chiffre. C’est pourtant ce que tu vaux pour ton employeur.', mood: 'alerte' },
      },
      payload: {
        value: 3055,
        unit: '€ par mois',
        label: 'En vrai',
        from_screen: 0,
        lines: [
          { label: 'Ton salaire net', value: 1660 },
          { label: '+ tes cotisations salariales', value: 470 },
          { label: '= ton salaire brut', value: 2130 },
          { label: '+ les cotisations patronales', value: 925 },
          { label: '= ce que tu coûtes', value: 3055, key: true },
        ],
      },
    },
    {
      type: 'choice',
      scored: true,
      val: {
        correct: { line: 'Bien vu. Tu en sais déjà plus que la plupart des salariés.', mood: 'fier' },
        wrong: { line: 'C’est ce que beaucoup pensent. En réalité, cet argent finance ta protection sociale.', mood: 'rassurant' },
      },
      explanation:
        'Ces cotisations financent ta retraite, ton assurance maladie et ton chômage. Ce n’est pas perdu : c’est une protection.',
      payload: {
        question: 'Où partent les 1 395 € d’écart ?',
        // L'aide : les lignes de la révélation
        subtitle: 'Rappel : 470 € de cotisations salariales et 925 € de cotisations patronales.',
        mode: 'single',
        options: [
          { id: 'employeur', text: 'Dans la poche de ton employeur' },
          {
            id: 'cotisations',
            text: 'Dans les cotisations sociales, pour ta retraite, ta santé et ton chômage',
            correct: true,
          },
          { id: 'impot', text: 'Dans ton impôt sur le revenu' },
        ],
      },
    },
    {
      type: 'choice',
      scored: true,
      val: {
        correct: { line: 'Tu sais maintenant lire la ligne la plus importante de ta fiche de paie.', mood: 'celebrant' },
        wrong: { line: 'Pas tout à fait. Le brut est plus haut que ce que tu touches.', mood: 'rassurant' },
      },
      explanation:
        'Le brut, c’est avant les cotisations salariales. Le net à payer, c’est ce qui arrive vraiment sur ton compte.',
      payload: {
        question: 'Sur ta fiche de paie, la somme qui arrive sur ton compte s’appelle…',
        mode: 'single',
        options: [
          { id: 'brut', text: 'Le salaire brut' },
          { id: 'net', text: 'Le net à payer', correct: true },
          { id: 'cout', text: 'Le coût employeur' },
        ],
      },
    },
  ],
} as const;
