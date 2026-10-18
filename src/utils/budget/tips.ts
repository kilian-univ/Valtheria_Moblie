// Remarque de Val sur le budget : une seule à la fois, choisie par ordre de
// priorité, reliée à un module de l'univers « Garder la main sur son argent »
// (même système que le patrimoine : lessonLink). Des constats, jamais de
// morale : ni « tu devrais », ni reproche sur une dépense. Sans React :
// testable avec Node.

import { NBSP, NNBSP } from '@/src/utils/frenchSpaces';
import type { LessonTarget } from '@/src/utils/patrimoine/valTips';

export type BudgetTipKey = 'subscriptions' | 'low_saving' | 'overspend' | 'envelope_over' | 'steady';

export type BudgetTip = { key: BudgetTipKey; text: string; link: LessonTarget };

export const BUDGET_TIP_RULES = {
  subscriptions: 0.05, // abonnements au-delà de 5 % des rentrées
  saving: 0.1, // épargne sous 10 % des rentrées
} as const;

const UNIVERSE = 'garder-la-main';

const TARGETS: Record<BudgetTipKey, LessonTarget> = {
  subscriptions: { universe: UNIVERSE, keywords: ['abonnement'], label: 'Revoir « Les abonnements qui s’oublient »' },
  low_saving: { universe: UNIVERSE, keywords: ['payer en premier', 'épargn', 'epargn'], label: 'Revoir « Se payer en premier »' },
  overspend: { universe: UNIVERSE, keywords: ['reste à vivre', 'reste a vivre', 'dépense', 'depense'], label: 'Revoir « Le reste à vivre »' },
  envelope_over: { universe: UNIVERSE, keywords: ['enveloppe', 'budget'], label: 'Revoir « Les enveloppes »' },
  steady: { universe: UNIVERSE, keywords: ['budget', 'suivre'], label: 'Revoir « Garder la main sur son argent »' },
};

const euros = (n: number) => `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP)}${NBSP}€`;
const pct = (share: number) => `${Math.round(share * 100)}${NBSP}%`;

export type BudgetTipContext = {
  // Rentrées mensuelles (récurrentes)
  income: number;
  // Abonnements récurrents par mois
  subscriptions: number;
  // Épargne prévue par mois
  saving: number;
  // Mois terminés, du plus ancien au plus récent : fini dans le vert ou non
  // (null : pas assez de relevés pour le dire)
  greenMonths?: (boolean | null)[];
  // Enveloppe dépassée les deux derniers mois terminés (son nom), sinon null
  envelopeOverTwice?: string | null;
};

export function chooseBudgetTip(c: BudgetTipContext): BudgetTip | null {
  if (c.income <= 0) return null;
  if (c.envelopeOverTwice) {
    return {
      key: 'envelope_over',
      text: `Ton enveloppe ${c.envelopeOverTwice} a débordé deux mois de suite. Son plafond est peut-être un peu juste pour ta vie réelle.`,
      link: TARGETS.envelope_over,
    };
  }
  const recent = (c.greenMonths ?? []).slice(-3).filter((g): g is boolean => g !== null);
  if (recent.length >= 2 && recent.filter((g) => !g).length >= 2) {
    return {
      key: 'overspend',
      text: 'Tes dépenses courantes ont dépassé plusieurs mois récents. Ça arrive à tout le monde : le plus utile, c’est de voir où ça part.',
      link: TARGETS.overspend,
    };
  }
  if (c.subscriptions / c.income > BUDGET_TIP_RULES.subscriptions) {
    return {
      key: 'subscriptions',
      text: `Tes abonnements font ${pct(c.subscriptions / c.income)} de tes revenus : ${euros(c.subscriptions)} par mois, ${euros(c.subscriptions * 12)} par an.`,
      link: TARGETS.subscriptions,
    };
  }
  if (c.saving / c.income < BUDGET_TIP_RULES.saving) {
    return {
      key: 'low_saving',
      text:
        c.saving > 0
          ? `Tu mets ${pct(c.saving / c.income)} de tes rentrées de côté. Même un petit montant viré le jour de la paie devient une habitude.`
          : 'Rien n’est mis de côté pour l’instant. Même un petit montant viré le jour de la paie devient une habitude.',
      link: TARGETS.low_saving,
    };
  }
  return {
    key: 'steady',
    text: 'Un solde à jour de temps en temps, et ton budget tient tout seul.',
    link: TARGETS.steady,
  };
}

// Garde-fou : aucune remarque ne fait la morale
export const FORBIDDEN_TONE = /\b(tu devrais|il faut que tu|arrête|trop dépensé|gaspill|irresponsable|mauvais)/i;
