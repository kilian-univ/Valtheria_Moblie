// Répartition du patrimoine (par type, par risque) et profil de risque.
// Sans React : testable avec Node.

import { valueEurOf, type AssetType, type Position, type RiskLevel } from './model';

export type GroupKey = 'actions' | 'epargne' | 'crypto' | 'matieres' | 'autres';

export const TYPE_GROUPS: readonly { key: GroupKey; label: string; types: AssetType[] }[] = [
  { key: 'actions', label: 'Actions et ETF', types: ['action', 'etf'] },
  { key: 'epargne', label: 'Épargne', types: ['livret'] },
  { key: 'crypto', label: 'Crypto', types: ['crypto'] },
  { key: 'matieres', label: 'Matières premières', types: ['matiere'] },
  { key: 'autres', label: 'Immobilier et objets', types: ['autre'] },
];

export const TYPE_LABELS: Record<AssetType, string> = {
  crypto: 'Crypto',
  action: 'Action',
  etf: 'ETF',
  livret: 'Livret',
  matiere: 'Matière première',
  autre: 'Autre',
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  sans_risque: 'Sans risque',
  modere: 'Modéré',
  eleve: 'Élevé',
  tres_eleve: 'Très élevé',
};

// Risque d'une position : celui du serveur, sinon déduit du type (même règle
// que la table des actifs du site)
export function riskOf(p: Pick<Position, 'risk' | 'type'>): RiskLevel | null {
  if (p.risk) return p.risk;
  return ({ livret: 'sans_risque', etf: 'modere', action: 'eleve', matiere: 'eleve', crypto: 'tres_eleve', autre: null } as const)[p.type];
}

export type Share<K extends string> = { key: K; label: string; value: number; share: number };

function shares<K extends string>(entries: { key: K; label: string; value: number }[]): Share<K>[] {
  const total = entries.reduce((s, e) => s + Math.max(0, e.value), 0);
  return entries
    .filter((e) => e.value > 0)
    .map((e) => ({ ...e, share: total > 0 ? e.value / total : 0 }))
    .sort((a, b) => b.value - a.value);
}

export function byType(positions: Position[]): Share<GroupKey>[] {
  return shares(
    TYPE_GROUPS.map((g) => ({
      key: g.key,
      label: g.label,
      value: positions.filter((p) => g.types.includes(p.type)).reduce((s, p) => s + valueEurOf(p), 0),
    }))
  );
}

export type RiskKey = RiskLevel | 'non_classe';

export function byRisk(positions: Position[]): Share<RiskKey>[] {
  const keys: RiskKey[] = ['sans_risque', 'modere', 'eleve', 'tres_eleve', 'non_classe'];
  const list = shares(
    keys.map((k) => ({
      key: k,
      label: k === 'non_classe' ? 'Non classé' : RISK_LABELS[k],
      value: positions.filter((p) => (riskOf(p) ?? 'non_classe') === k).reduce((s, p) => s + valueEurOf(p), 0),
    }))
  );
  // Du moins risqué au plus risqué
  return list.sort((a, b) => keys.indexOf(a.key) - keys.indexOf(b.key));
}

export type RiskProfile = 'Prudent' | 'Équilibré' | 'Dynamique' | 'Audacieux';

// Profil selon la part à risque élevé et très élevé :
// moins de 20 % → Prudent ; moins de 45 % → Équilibré ; moins de 70 % →
// Dynamique ; au-delà → Audacieux
export const PROFILE_THRESHOLDS = { prudent: 0.2, equilibre: 0.45, dynamique: 0.7 } as const;

export function riskyShare(positions: Position[]): number {
  const total = positions.reduce((s, p) => s + Math.max(0, valueEurOf(p)), 0);
  if (total <= 0) return 0;
  const risky = positions
    .filter((p) => {
      const r = riskOf(p);
      return r === 'eleve' || r === 'tres_eleve';
    })
    .reduce((s, p) => s + Math.max(0, valueEurOf(p)), 0);
  return risky / total;
}

export function riskProfile(positions: Position[]): RiskProfile | null {
  if (positions.reduce((s, p) => s + valueEurOf(p), 0) <= 0) return null;
  const share = riskyShare(positions);
  if (share < PROFILE_THRESHOLDS.prudent) return 'Prudent';
  if (share < PROFILE_THRESHOLDS.equilibre) return 'Équilibré';
  if (share < PROFILE_THRESHOLDS.dynamique) return 'Dynamique';
  return 'Audacieux';
}

// « 45 % » arrondi, la somme affichée faisant 100
export function roundedShares<K extends string>(list: Share<K>[]): (Share<K> & { percent: number })[] {
  const raw = list.map((s) => s.share * 100);
  const floors = raw.map(Math.floor);
  let rest = 100 - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (rest <= 0 || list.length === 0) break;
    floors[i] += 1;
    rest -= 1;
  }
  return list.map((s, i) => ({ ...s, percent: list.length ? floors[i] : 0 }));
}
