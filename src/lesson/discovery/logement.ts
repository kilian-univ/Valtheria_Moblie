// Leçon découverte 4 — objectif « Acheter un jour un logement ».
// Déclic : avec un crédit, un logement coûte bien plus que son prix, et la
// durée change tout.
// Texte : lecons-decouvertes.md (leçon 4). Au format de GET /lessons/{id}.
// La durée de l'emprunt est la durée maximale d'un crédit immobilier, lue dans
// les chiffres réglementaires du site (credit_duree_max) ; le taux de 3,5 %
// est une hypothèse annoncée. Total, intérêts et mensualité se calculent avec
// la formule du simulateur (loan_over_years).

import { computeFormula } from '@/src/lesson/formulas';
import { FALLBACK_FIGURES, groupThousands, numbersOf, type Figures } from '@/src/utils/regulatoryFigures';
import { PARI_INTRO } from './shared';

const CAPITAL = 200000;
const RATE = 0.035;
// Le curseur de durée part de 15 ans
const MIN_YEARS = 15;

export function buildLogement(figures: Figures) {
  let years = numbersOf(figures, 'credit_duree_max')[0];
  // Durée illisible ou hors du simulateur : celle de secours
  if (!(Number.isInteger(years) && years > MIN_YEARS && years <= 35)) years = numbersOf(FALLBACK_FIGURES, 'credit_duree_max')[0];
  const { monthly = 0, interest = 0 } = computeFormula('loan_over_years', years, { capital: CAPITAL, rate: RATE });
  // Arrondis du document : total et intérêts à 5 000 €, mensualité à 10 €
  const interestRounded = Math.round(interest / 5000) * 5000;
  const monthlyRounded = Math.round(monthly / 10) * 10;

  return {
    title: 'Le vrai prix d’un crédit',
    // Déclic du document : carte « À RETENIR » de la fin de leçon
    takeaway: 'Avec un [crédit], un logement coûte bien plus que son prix, et la [durée] change tout.',
    // Phrase d'accroche : carte de l'accueil sans compte
    hook: 'Ce que coûte vraiment un emprunt',
    screens: [
      {
        type: 'slider',
        scored: false,
        val: { intro: PARI_INTRO },
        payload: {
          question: `Tu empruntes 200 000 € sur ${years} ans, la durée maximale d’un crédit immobilier, à 3,5 %. Combien rembourses-tu en tout ?`,
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
          value: CAPITAL + interestRounded,
          unit: '€',
          start: { label: 'Tu as emprunté', value: CAPITAL },
          label: 'En tout, environ',
          from_screen: 0,
          lines: [
            { label: 'Tu as emprunté', value: CAPITAL },
            { label: 'Les intérêts coûtent environ', value: interestRounded, key: true },
            { label: 'Soit une mensualité d’environ', value: `${groupThousands(monthlyRounded)} €` },
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
          min: MIN_YEARS,
          max: years,
          step: 1,
          start: years,
          unit: 'ans',
          formula: 'loan_over_years',
          params: { capital: 200000, rate: 0.035 },
          outputs: [
            { key: 'monthly', label: 'Ta mensualité', unit: '€ par mois', big: true },
            { key: 'interest', label: 'Coût total des intérêts', unit: '€', caption: 'soit {} d’intérêts au total' },
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
}

// Leçon construite sur les valeurs de secours (référence du document et des tests)
export const logement = buildLogement(FALLBACK_FIGURES);
