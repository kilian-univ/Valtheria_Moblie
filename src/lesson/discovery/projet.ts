// Leçon découverte 4 — objectif « Préparer un projet ».
// Déclic : un gros projet n'est qu'une petite somme répétée ; 3 000 € en un
// an, c'est 8,20 € par jour.
// Texte : lecons-decouvertes.md (leçon 4).

import { PARI_INTRO } from './shared';

export const projet = {
  title: '3 000 €, c’est combien par jour ?',
  screens: [
    {
      type: 'slider',
      scored: false,
      val: { intro: PARI_INTRO },
      payload: {
        question: 'Tu veux 3 000 € pour tes vacances dans 12 mois. À ton avis, ça représente combien par jour ?',
        min: 1,
        max: 30,
        step: 0.5,
        start: 15,
        unit: '€',
      },
    },
    {
      type: 'reveal',
      scored: false,
      val: {
        intro: {
          line: '3 000 €, ça fait peur. 8 € par jour, beaucoup moins. Et plus tôt tu commences, plus c’est léger.',
          mood: 'complice',
        },
      },
      payload: {
        value: 8.2,
        unit: '€ par jour',
        decimals: 2,
        label: 'En vrai, environ',
        from_screen: 0,
        lines: [
          { label: '3 000 € sur 12 mois, par mois', value: 250 },
          { label: 'Soit environ, par jour', value: 8.2, key: true },
          { label: 'Commencé 6 mois plus tard, par jour', value: 16.4 },
        ],
      },
    },
    {
      type: 'choice',
      scored: true,
      val: {
        correct: { line: 'Tu as la méthode.', mood: 'fier' },
        wrong: { line: 'Presque. Divise le montant par le nombre de mois.', mood: 'rassurant' },
      },
      explanation: '2 400 divisés par 8 font 300. Un virement automatique de 300 €, et le projet se finance tout seul.',
      payload: {
        question: 'Pour 2 400 € dans 8 mois, combien mettre de côté chaque mois ?',
        subtitle: 'La règle : le montant divisé par le nombre de mois.',
        mode: 'single',
        options: [
          { id: '200', text: '200 €' },
          { id: '300', text: '300 €', correct: true },
          { id: '400', text: '400 €' },
        ],
      },
    },
    {
      type: 'choice',
      scored: true,
      val: {
        correct: { line: 'Tu n’as pas oublié ce que tu avais déjà. Bien joué.', mood: 'celebrant' },
        wrong: { line: 'Le piège : commence par retirer les 600 € déjà mis de côté.', mood: 'rassurant' },
      },
      explanation: 'Il manque 1 200 €, à répartir sur 6 mois : 200 €. Ce qui est déjà de côté allège chaque mois.',
      payload: {
        question: 'Tu as déjà 600 € de côté pour un projet à 1 800 € dans 6 mois. Combien chaque mois ?',
        mode: 'single',
        options: [
          { id: '200', text: '200 €', correct: true },
          { id: '250', text: '250 €' },
          { id: '300', text: '300 €' },
        ],
      },
    },
  ],
} as const;
