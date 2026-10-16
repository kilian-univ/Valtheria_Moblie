// Coin propre à une page du fond commun (AppBackground) : celui du halo bleu
// nuit, calculé depuis l'adresse de la page. Fonctions pures, sans React : testables avec Node.
//
// Règles :
// - seul le premier segment de l'adresse compte (« /apprendre/module/3 » →
//   « apprendre ») : les pages ouvertes depuis un onglet gardent son coin, et
//   le lecteur de leçon (/apprendre/<id>) garde celui de l'onglet Apprendre ;
// - un segment qui commence par le nom d'un onglet lui appartient
//   (« articles » → onglet « article ») ;
// - coin = hachage simple du segment, modulo 4 ; une page nouvelle en reçoit
//   un sans code supplémentaire ;
// - les onglets visibles ont des coins différents (jusqu'à 4) : en cas de
//   collision, l'onglet suivant prend le prochain coin libre ;
// - le halo doré est toujours dans le coin opposé (oppositeCorner).

export const CORNERS = ['topRight', 'bottomLeft', 'topLeft', 'bottomRight'] as const;
export type Corner = (typeof CORNERS)[number];

const OPPOSITE: Record<Corner, Corner> = {
  topRight: 'bottomLeft',
  bottomLeft: 'topRight',
  topLeft: 'bottomRight',
  bottomRight: 'topLeft',
};

export function oppositeCorner(corner: Corner): Corner {
  return OPPOSITE[corner];
}

// Hachage djb2 : stable, simple
export function hashSegment(segment: string): number {
  let h = 5381;
  for (let i = 0; i < segment.length; i++) h = ((h << 5) + h + segment.charCodeAt(i)) >>> 0;
  return h;
}

export function hashedCorner(segment: string): Corner {
  return CORNERS[hashSegment(segment) % CORNERS.length];
}

// Premier segment de l'adresse, sans groupe « (tabs) » ni paramètre
export function firstSegment(pathname: string): string {
  const parts = pathname.split(/[?#]/)[0].split('/').filter((p) => p && !/^\(.*\)$/.test(p));
  return (parts[0] ?? '').toLowerCase();
}

// Coins des onglets visibles, dans l'ordre de la barre : chacun prend son coin
// haché, ou le prochain coin libre s'il est déjà pris
export function tabCorners(tabs: readonly string[]): Record<string, Corner> {
  const used = new Set<Corner>();
  const result: Record<string, Corner> = {};
  for (const tab of tabs) {
    // Plus de 4 onglets : une fois les 4 coins pris, on recommence
    if (used.size === CORNERS.length) used.clear();
    const start = CORNERS.indexOf(hashedCorner(tab));
    let corner = CORNERS[start];
    for (let k = 0; k < CORNERS.length; k++) {
      const candidate = CORNERS[(start + k) % CORNERS.length];
      if (!used.has(candidate)) {
        corner = candidate;
        break;
      }
    }
    used.add(corner);
    result[tab] = corner;
  }
  return result;
}

// Onglet auquel appartient un segment (« articles » → « article »), ou null
export function owningTab(segment: string, tabs: readonly string[]): string | null {
  if (tabs.includes(segment)) return segment;
  return tabs.find((t) => segment.startsWith(t)) ?? null;
}

// Coin de la lumière pour une adresse. Adresse vide (« / ») : premier onglet.
export function cornerForPath(pathname: string, tabs: readonly string[]): Corner {
  const segment = firstSegment(pathname) || tabs[0] || '';
  const tab = owningTab(segment, tabs);
  return tab ? tabCorners(tabs)[tab] : hashedCorner(segment);
}
