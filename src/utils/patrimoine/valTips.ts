// Remarque de Val sur le patrimoine : une seule à la fois, choisie par ordre de
// priorité, chacune reliée à une leçon ou un module. Des constats, jamais un
// conseil d'achat ou de vente d'un actif précis (aucun nom de produit à
// acheter, aucun « vends » ni « achète »). Sans React : testable avec Node.

import { riskOf } from './analysis';
import { NBSP } from '@/src/utils/frenchSpaces';
import { valueEurOf, type Position } from './model';

export type TipKey = 'no_emergency' | 'emergency_low' | 'concentration' | 'crypto_heavy' | 'all_safe_long' | 'regular';

// Où mène le lien : un univers, et des mots pour trouver le module dans ses titres
export type LessonTarget = { universe: string; keywords: string[]; label: string };

export type ValTip = { key: TipKey; text: string; link: LessonTarget };

export const TIP_RULES = {
  concentration: 0.3, // un actif (hors sans risque) à plus de 30 %
  crypto: 0.2, // crypto à plus de 20 %
  allSafeDays: 365, // tout sans risque depuis plus d'un an
} as const;

const TARGETS: Record<TipKey, LessonTarget> = {
  no_emergency: { universe: 'avant-d-investir', keywords: ['coussin', 'sécurité', 'precaution', 'précaution'], label: 'Revoir « Ton coussin de sécurité »' },
  emergency_low: { universe: 'avant-d-investir', keywords: ['coussin', 'sécurité', 'combien'], label: 'Revoir « Combien garder de côté ? »' },
  concentration: { universe: 'bourse', keywords: ['diversif', 'répartir', 'repartir'], label: 'Revoir « Diversifier »' },
  crypto_heavy: { universe: 'crypto', keywords: ['risque', 'volatil', 'diversif'], label: 'Revoir « Diversifier »' },
  all_safe_long: { universe: 'avant-d-investir', keywords: ['inflation', 'horizon', 'premier plan'], label: 'Revoir « Choisir son horizon »' },
  regular: { universe: 'avant-d-investir', keywords: ['plan', 'régul', 'regul'], label: 'Revoir « Ton premier plan »' },
};

const pct = (share: number) => `${Math.round(share * 100)}${NBSP}%`;

export type TipContext = {
  positions: Position[];
  now: Date;
  // Dépenses mensuelles indiquées pour l'épargne de précaution (null : inconnues)
  monthlyExpenses: number | null;
};

export function chooseValTip({ positions, now, monthlyExpenses }: TipContext): ValTip | null {
  const total = positions.reduce((s, p) => s + Math.max(0, valueEurOf(p)), 0);
  if (total <= 0) return null;
  const safe = positions.filter((p) => riskOf(p) === 'sans_risque').reduce((s, p) => s + Math.max(0, valueEurOf(p)), 0);

  // 1. Pas d'épargne de précaution
  if (safe <= 0) {
    return {
      key: 'no_emergency',
      text: 'Tu n’as pas encore d’épargne sans risque. C’est elle qui évite de devoir vendre au mauvais moment.',
      link: TARGETS.no_emergency,
    };
  }
  // 1 bis. Épargne de précaution sous un mois de dépenses
  if (monthlyExpenses && monthlyExpenses > 0 && safe < monthlyExpenses) {
    return {
      key: 'emergency_low',
      text: 'Ton épargne sans risque couvre moins d’un mois de dépenses. La règle courante, c’est 3 à 6 mois.',
      link: TARGETS.emergency_low,
    };
  }

  // 2. Un actif (hors sans risque) à plus de 30 %
  const biggest = positions
    .filter((p) => riskOf(p) !== 'sans_risque')
    .map((p) => ({ p, share: Math.max(0, valueEurOf(p)) / total }))
    .sort((a, b) => b.share - a.share)[0];
  if (biggest && biggest.share > TIP_RULES.concentration && positions.length > 1) {
    return {
      key: 'concentration',
      text: `${biggest.p.name} pèse ${pct(biggest.share)} de ton patrimoine. Quand un seul actif pèse autant, tout dépend de lui.`,
      link: TARGETS.concentration,
    };
  }

  // 3. Crypto à plus de 20 %
  const crypto = positions.filter((p) => p.type === 'crypto').reduce((s, p) => s + Math.max(0, valueEurOf(p)), 0) / total;
  if (crypto > TIP_RULES.crypto) {
    return {
      key: 'crypto_heavy',
      text: `Ta crypto pèse ${pct(crypto)} de ton patrimoine. C’est beaucoup ?`,
      link: TARGETS.crypto_heavy,
    };
  }

  // 4. Tout sans risque depuis longtemps
  if (safe >= total - 0.01) {
    const oldest = positions
      .map((p) => (p.openedAt ? Date.parse(p.openedAt) : NaN))
      .filter((t) => Number.isFinite(t))
      .sort((a, b) => a - b)[0];
    if (oldest !== undefined && (now.getTime() - oldest) / 86_400_000 > TIP_RULES.allSafeDays) {
      return {
        key: 'all_safe_long',
        text: 'Tout ton patrimoine est sans risque depuis plus d’un an. C’est rassurant, mais l’inflation, elle, ne s’arrête pas.',
        link: TARGETS.all_safe_long,
      };
    }
  }

  // 5. Rien de particulier : encourager le suivi
  return {
    key: 'regular',
    text: 'Suivre ton patrimoine régulièrement, c’est déjà le piloter.',
    link: TARGETS.regular,
  };
}

// Aucun conseil d'achat ou de vente : garde-fou testé
export const FORBIDDEN_ADVICE = /\b(ach[eè]te|vends|vendre ton|investis dans|place ton argent sur)\b/i;
