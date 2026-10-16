// Lueur de la carte de couleur (UniverseCard), sans React : testable avec
// Node. Dégradé horizontal de la couleur de l'univers : GLOW.edge au bord
// gauche, GLOW.at à la hauteur de la progression, éteint GLOW.span plus loin.
// À 0 % : une touche contre le bord ; à 100 % : toute la carte teintée.

export const GLOW = { edge: 0.2, at: 0.08, span: 0.25 } as const;

export type GlowStop = { at: number; opacity: number };

export function glowStops(progress: number): GlowStop[] {
  const p = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  const end = p + GLOW.span;
  if (end <= 1) {
    return [
      { at: 0, opacity: GLOW.edge },
      { at: p, opacity: GLOW.at },
      { at: end, opacity: 0 },
    ];
  }
  // Pas encore éteinte au bord droit : l'opacité qu'elle y a sur sa pente
  return [
    { at: 0, opacity: GLOW.edge },
    { at: p, opacity: GLOW.at },
    { at: 1, opacity: GLOW.at * (1 - (1 - p) / GLOW.span) },
  ];
}
