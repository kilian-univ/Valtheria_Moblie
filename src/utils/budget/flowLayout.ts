// Mise en page verticale du diagramme de flux (maquette, écrans 3, 3 bis et
// 3 ter) : postes empilés par famille, chaque famille centrée sur ses postes,
// le budget centré sur les familles, les rentrées sur le budget. Les nœuds
// sont proportionnels aux montants ; un petit poste garde la place de son
// étiquette. Les positions horizontales sont celles du dessin. Fonctions
// pures, testables avec Node.

import type { FlowFamily, Poste, Source } from './flows';
import { FLOW_FAMILIES } from './flows';

export type VNode = { top: number; height: number };
export type FamilyNode = VNode & { family: FlowFamily; amount: number };
export type PosteNode = VNode & Poste & { slotTop: number; slot: number };
export type SourceNode = VNode & Source & { deficit: boolean };
// Bande entre deux colonnes : haut et bas de chaque côté
export type Band = { key: string; level: 'source' | 'root' | 'family'; family: FlowFamily | null; from: [number, number]; to: [number, number] };

export type FlowLayout = {
  height: number;
  total: number;
  sources: SourceNode[];
  root: VNode;
  families: FamilyNode[];
  postes: PosteNode[];
  bands: Band[];
};

export type LayoutOptions = {
  // Hauteur visée (le dessin la dépasse seulement s'il y a trop de postes)
  height: number;
  // Place minimale d'un poste (son étiquette sur deux lignes)
  minSlot: number;
  gap: number;
  groupGap: number;
  sourceGap: number;
};

const MIN_NODE = 2;

export function layoutFlow(postesIn: readonly Poste[], sourcesIn: readonly Source[], o: LayoutOptions): FlowLayout {
  const groups = FLOW_FAMILIES.map((family) => ({ family, postes: postesIn.filter((p) => p.family === family && p.amount > 0) })).filter((g) => g.postes.length > 0);
  const all = groups.flatMap((g) => g.postes);
  const total = all.reduce((s, p) => s + p.amount, 0);
  const gaps = Math.max(0, all.length - groups.length) * o.gap + Math.max(0, groups.length - 1) * o.groupGap;
  const used = (k: number) => all.reduce((s, p) => s + Math.max(Math.max(p.amount * k, MIN_NODE), o.minSlot), 0) + gaps;

  // Échelle (pixels par euro) la plus grande qui tient dans la hauteur
  let lo = 0;
  let hi = total > 0 ? Math.max(0, o.height - gaps) / total : 0;
  if (used(hi) > o.height) {
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (used(mid) <= o.height) lo = mid;
      else hi = mid;
    }
    hi = lo;
  }
  const k = hi;
  const h = (amount: number) => Math.max(amount * k, MIN_NODE);

  const postes: PosteNode[] = [];
  const families: FamilyNode[] = [];
  let y = 0;
  groups.forEach((g, gi) => {
    if (gi > 0) y += o.groupGap;
    const start = y;
    g.postes.forEach((p, pi) => {
      if (pi > 0) y += o.gap;
      const height = h(p.amount);
      const slot = Math.max(height, o.minSlot);
      postes.push({ ...p, slotTop: y, slot, top: y + (slot - height) / 2, height });
      y += slot;
    });
    const height = g.postes.reduce((s, p) => s + h(p.amount), 0);
    families.push({ family: g.family, amount: g.postes.reduce((s, p) => s + p.amount, 0), top: (start + y) / 2 - height / 2, height });
  });
  const height = y;

  const rootHeight = families.reduce((s, f) => s + f.height, 0);
  const span = families.length ? [families[0].top, families[families.length - 1].top + families[families.length - 1].height] : [0, 0];
  const root: VNode = { top: Math.max(0, (span[0] + span[1]) / 2 - rootHeight / 2), height: rootHeight };

  // Rentrées ; si les dépenses et l'épargne les dépassent, la différence
  // vient du compte
  const income = sourcesIn.reduce((s, x) => s + x.amount, 0);
  const sourceList: (Source & { deficit: boolean })[] = sourcesIn.filter((s) => s.amount > 0).map((s) => ({ ...s, deficit: false }));
  if (total - income > 0.5) sourceList.push({ label: 'Pris sur ton compte', amount: total - income, deficit: true });
  const scale = total > 0 ? rootHeight / Math.max(total, income) : 0;
  const sh = (a: number) => Math.max(a * scale, MIN_NODE);
  const sourcesHeight = sourceList.reduce((s, x) => s + sh(x.amount), 0) + Math.max(0, sourceList.length - 1) * o.sourceGap;
  let sy = Math.max(0, root.top + root.height / 2 - sourcesHeight / 2);
  const sources: SourceNode[] = sourceList.map((s) => {
    const node = { ...s, top: sy, height: sh(s.amount) };
    sy += node.height + o.sourceGap;
    return node;
  });

  const bands: Band[] = [];
  let ry = root.top;
  for (const s of sources) {
    const hh = Math.min(s.height, root.top + root.height - ry);
    bands.push({ key: `s:${s.label}`, level: 'source', family: null, from: [s.top, s.top + s.height], to: [ry, ry + hh] });
    ry += hh;
  }
  ry = root.top;
  for (const f of families) {
    bands.push({ key: `f:${f.family}`, level: 'root', family: f.family, from: [ry, ry + f.height], to: [f.top, f.top + f.height] });
    ry += f.height;
  }
  for (const f of families) {
    let fy = f.top;
    for (const p of postes.filter((x) => x.family === f.family)) {
      bands.push({ key: `p:${p.key}`, level: 'family', family: f.family, from: [fy, fy + p.height], to: [p.top, p.top + p.height] });
      fy += p.height;
    }
  }
  return { height, total, sources, root, families, postes, bands };
}

// Ruban entre deux colonnes (x0 → x1), courbes de Bézier horizontales
export function bandPath(x0: number, x1: number, from: [number, number], to: [number, number]): string {
  const mid = (x0 + x1) / 2;
  const f = (n: number) => n.toFixed(1);
  return `M${f(x0)} ${f(from[0])} C${f(mid)} ${f(from[0])} ${f(mid)} ${f(to[0])} ${f(x1)} ${f(to[0])} L${f(x1)} ${f(to[1])} C${f(mid)} ${f(to[1])} ${f(mid)} ${f(from[1])} ${f(x0)} ${f(from[1])} Z`;
}

// Part d'un montant dans le total, en pourcentage entier
export function share(amount: number, total: number): number {
  return total > 0 ? Math.round((amount / total) * 100) : 0;
}
