// Leçon découverte 5 — objectif « Payer moins d'impôts ».
// Déclic : changer de tranche ne fait jamais perdre d'argent ; seule la partie
// au-dessus du seuil est taxée plus. Barème de l'impôt sur le revenu (pour une
// part) lu dans les chiffres réglementaires du site : ir_bareme_taux et
// ir_bareme_seuils. Les trois premières tranches suffisent à l'exemple, et
// chaque montant se calcule à partir d'elles : rien n'est écrit en dur.
// Texte : lecons-decouvertes.md (leçon 5). Au format de GET /lessons/{id}.

import { FALLBACK_FIGURES, figureParts, figureValue, groupThousands, numbersOf, type Figures } from '@/src/utils/regulatoryFigures';
import { PARI_INTRO, TRUE_FALSE_QUESTION } from './shared';

// Revenu imposable de Léa, à la dernière question (dans la 3e tranche)
const LEA = 40000;
// La prime de l'exemple : 1 000 € sous le seuil de la 3e tranche, 1 000 € au-dessus
const HALF_PRIME = 1000;

function bareme(figures: Figures) {
  const fallbackRates = numbersOf(FALLBACK_FIGURES, 'ir_bareme_taux', 3);
  const fallbackLimits = numbersOf(FALLBACK_FIGURES, 'ir_bareme_seuils', 3);
  let rates = numbersOf(figures, 'ir_bareme_taux', 3);
  let limits = numbersOf(figures, 'ir_bareme_seuils', 3);
  let rateParts = figureParts(figureValue(figures, 'ir_bareme_taux'));
  // Barème incohérent (seuils non croissants, Léa hors de la 3e tranche) : celui de secours
  const ok = (r: number[], l: number[]) => r.length >= 3 && l.length >= 3 && l[1] < l[2] && l[2] + HALF_PRIME < LEA && (l.length < 4 || LEA < l[3]);
  if (!ok(rates, limits)) {
    rates = fallbackRates;
    limits = fallbackLimits;
    rateParts = figureParts(FALLBACK_FIGURES.ir_bareme_taux.value);
  }
  const [t0, t1, t2] = rateParts;
  return { r1: rates[1] / 100, r2: rates[2] / 100, s1: limits[1], s2: limits[2], t0, t1, t2 };
}

export function buildImpots(figures: Figures) {
  const b = bareme(figures);
  const below = Math.round(HALF_PRIME * b.r1);
  const above = Math.round(HALF_PRIME * b.r2);
  const leaTax = (b.s2 - b.s1) * b.r1 + (LEA - b.s2) * b.r2;
  const leaRate = String(Math.round((leaTax / LEA) * 1000) / 10).replace('.', ',');
  const scale = `${b.t0} jusqu’à ${groupThousands(b.s1)} €, ${b.t1} jusqu’à ${groupThousands(b.s2)} €, ${b.t2} au-delà`;

  return {
    title: 'Le mythe de la tranche',
    // Déclic du document : carte « À RETENIR » de la fin de leçon
    takeaway: 'Changer de [tranche] ne fait jamais perdre d’argent ; seule la partie au-dessus du [seuil] est taxée plus.',
    // Phrase d'accroche : carte de l'accueil sans compte
    hook: 'Pourquoi une prime ne fait jamais perdre d’argent',
    screens: [
      {
        type: 'slider',
        scored: false,
        val: { intro: PARI_INTRO },
        payload: {
          question: `Une prime de 2 000 € fait passer ton revenu imposable de ${groupThousands(b.s2 - HALF_PRIME)} € à ${groupThousands(b.s2 + HALF_PRIME)} €, et tu changes de tranche : de ${b.t1} à ${b.t2}. De combien augmente ton impôt ?`,
          subtitle: `Barème de l’impôt pour une part : ${scale} (puis deux tranches plus hautes).`,
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
          value: below + above,
          unit: '€',
          label: 'En vrai',
          from_screen: 0,
          lines: [
            { label: `Les 1 000 € sous le seuil, taxés à ${b.t1}, font`, value: below },
            { label: `Les 1 000 € au-dessus, taxés à ${b.t2}, font`, value: above },
            { label: 'Au total, d’impôt en plus pour 2 000 € de prime', value: below + above, key: true },
            { label: 'Barème de l’impôt pour une part, sans décote ni réduction', value: '', dim: true },
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
          wrong: { line: `C’est le piège classique : les ${b.t2} ne touchent que le haut de son revenu.`, mood: 'rassurant' },
        },
        explanation: `Ses ${groupThousands(b.s1)} premiers euros ne sont pas taxés, les suivants le sont à ${b.t1} jusqu’à ${groupThousands(b.s2)} €. Son taux moyen est d’environ ${leaRate} %, bien en dessous de ${b.t2}.`,
        payload: {
          question: `Avec ce barème, Léa a un revenu imposable de ${groupThousands(LEA)} €. Son taux moyen est-il aussi de ${b.t2} ?`,
          mode: 'single',
          options: [
            { id: 'oui', text: `Oui, tout son revenu est taxé à ${b.t2}` },
            { id: 'plus-bas', text: 'Non, il est plus bas, car ses premiers euros sont moins taxés', correct: true },
            { id: 'plus-haut', text: `Non, il est plus haut que ${b.t2}` },
          ],
        },
      },
    ],
  } as const;
}

// Leçon construite sur les valeurs de secours (référence du document et des tests)
export const impots = buildImpots(FALLBACK_FIGURES);
