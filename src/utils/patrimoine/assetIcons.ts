// Icônes des placements sans cours (livrets, épargne logement, assurance vie,
// immobilier, biens) : familles, couleurs, dessins et reconnaissance d'après le
// nom ou le symbole de l'actif. Les dessins sont des données (repère 40 × 40),
// lus par components/common/AssetIcon.tsx et par la planche de contrôle.
// Sans React : testable avec Node.

import type { AssetType } from './model';

export type IconFamily = 'reglementee' | 'logement' | 'bancaire' | 'assurance' | 'immobilier' | 'biens';

// Rond sombre et liseré de la couleur de la famille, comme les logos des cryptos
export const ICON_DISC = '#1d1d23';
export const FAMILY_COLORS: Record<IconFamily, string> = {
  reglementee: '#3fa876',
  logement: '#7c9cc4',
  bancaire: '#d9d2c3',
  assurance: '#C9A84C',
  immobilier: '#c9855a',
  biens: '#a07ad6',
};
export const FAMILY_LABELS: Record<IconFamily, string> = {
  reglementee: 'Épargne réglementée',
  logement: 'Épargne logement',
  bancaire: 'Épargne bancaire',
  assurance: 'Assurance et retraite',
  immobilier: 'Immobilier',
  biens: 'Biens',
};

export type IconKey =
  | 'livret-a'
  | 'ldds'
  | 'lep'
  | 'livret-jeune'
  | 'pel'
  | 'cel'
  | 'livret-bancaire'
  | 'compte-courant'
  | 'assurance-vie'
  | 'per'
  | 'immobilier'
  | 'scpi'
  | 'or'
  | 'objet';

// Trait (couleur de la famille) ; fill : forme pleine de cette couleur, ou
// 'disc' : pleine de la couleur du rond (elle cache ce qui est derrière)
export type ShapeFill = boolean | 'disc';
export type Shape =
  | { kind: 'path'; d: string; fill?: ShapeFill }
  | { kind: 'circle'; cx: number; cy: number; r: number; fill?: ShapeFill }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; rx?: number; fill?: ShapeFill };

// Couleur de remplissage d'une forme
export const shapeFill = (fill: ShapeFill | undefined, color: string): string => (fill === 'disc' ? ICON_DISC : fill ? color : 'none');

export type AssetIconDef = { key: IconKey; label: string; family: IconFamily; shapes: Shape[] };

// Épaisseur du trait du symbole, dans le repère 40 × 40
export const SYMBOL_STROKE = 1.9;

const p = (d: string, fill: ShapeFill = false): Shape => ({ kind: 'path', d, fill });
const pane = (x: number, y: number): Shape => ({ kind: 'rect', x, y, w: 2.2, h: 2.2, rx: 0.4, fill: true });

const HOUSE = 'M10.5 20.5 L20 12 L29.5 20.5 M13 18.3 V29 H27 V18.3';

export const ASSET_ICONS: readonly AssetIconDef[] = [
  {
    key: 'livret-a',
    label: 'Livret A',
    family: 'reglementee',
    // « A » dans un écusson
    shapes: [p('M20 9.5 L28.5 12.5 V20 C28.5 25 25 28.8 20 30.5 C15 28.8 11.5 25 11.5 20 V12.5 Z'), p('M16.8 25 L20 15.5 L23.2 25 M17.9 21.8 H22.1')],
  },
  {
    key: 'ldds',
    label: 'LDDS',
    family: 'reglementee',
    // Feuille
    shapes: [p('M12 28 C11.5 18.5 17.5 12 28 11.5 C28.5 21.5 22 28 12 28 Z'), p('M12 28 L22.5 17.5')],
  },
  {
    key: 'lep',
    label: 'LEP',
    family: 'reglementee',
    // Main qui protège une pièce
    shapes: [
      { kind: 'circle', cx: 21, cy: 14.5, r: 4.6 },
      p('M21 12.6 V16.4'),
      p('M9.5 23 H13.5 L17.8 25 H23.6 A1.5 1.5 0 0 1 23.6 28 H18.6'),
      p('M23.4 26.6 L28.6 23.6 A1.5 1.5 0 0 1 30.2 26.2 L24.4 30 H13.5'),
      p('M9.5 23 V30 H13.5'),
    ],
  },
  {
    key: 'livret-jeune',
    label: 'Livret Jeune',
    family: 'reglementee',
    // Jeune pousse
    shapes: [
      p('M20 29.5 V19'),
      p('M20 22.5 C15 22.5 12 19.5 12 15 C16.8 15 20 18 20 22.5 Z'),
      p('M20 19 C20 14 23 11 28 11 C28 16 25 19 20 19 Z'),
      p('M14 29.5 H26'),
    ],
  },
  {
    key: 'pel',
    label: 'PEL',
    family: 'logement',
    // Maison et clé
    shapes: [p(HOUSE), { kind: 'circle', cx: 20, cy: 21.6, r: 2.4 }, p('M20 24 V27.6 M20 26.2 H22')],
  },
  {
    key: 'cel',
    label: 'CEL',
    family: 'logement',
    // Maison
    shapes: [p(HOUSE), p('M17.8 29 V23.6 H22.2 V29')],
  },
  {
    key: 'livret-bancaire',
    label: 'Livret bancaire, compte à terme',
    family: 'bancaire',
    // Cadenas sur une pièce
    shapes: [
      { kind: 'circle', cx: 16.2, cy: 16.8, r: 6.4 },
      p('M16.2 14 V19.6'),
      p('M21.9 21.2 V18.9 A2.8 2.8 0 0 1 27.5 18.9 V21.2', 'disc'),
      { kind: 'rect', x: 19.6, y: 21.2, w: 10.2, h: 7.8, rx: 1.6, fill: 'disc' },
      p('M24.7 24 V26.2'),
    ],
  },
  {
    key: 'compte-courant',
    label: 'Compte courant',
    family: 'bancaire',
    // Carte
    shapes: [{ kind: 'rect', x: 10, y: 13.5, w: 20, h: 13.5, rx: 2.4 }, { kind: 'rect', x: 10, y: 16.8, w: 20, h: 2.6, fill: true }, p('M13.5 23.4 H18.5')],
  },
  {
    key: 'assurance-vie',
    label: 'Assurance vie',
    family: 'assurance',
    // Parapluie
    shapes: [
      p('M10 20.5 A10 9.2 0 0 1 30 20.5 Q27.5 18.6 25 20.5 Q22.5 18.6 20 20.5 Q17.5 18.6 15 20.5 Q12.5 18.6 10 20.5 Z'),
      p('M20 20.5 V27.4 A2 2 0 0 1 16 27.4'),
      p('M20 10.4 V11.4'),
    ],
  },
  {
    key: 'per',
    label: 'PER',
    family: 'assurance',
    // Sablier
    shapes: [
      p('M13 10.5 H27 M13 29.5 H27'),
      p('M14.6 10.5 C14.6 16 20 17.6 20 20 C20 22.4 14.6 24 14.6 29.5'),
      p('M25.4 10.5 C25.4 16 20 17.6 20 20 C20 22.4 25.4 24 25.4 29.5'),
      p('M16.8 28.2 L20 24.8 L23.2 28.2 Z', true),
    ],
  },
  {
    key: 'immobilier',
    label: 'Immobilier',
    family: 'immobilier',
    // Immeuble
    shapes: [
      { kind: 'rect', x: 14, y: 10.5, w: 12, h: 19 },
      pane(16.4, 13.4),
      pane(21.4, 13.4),
      pane(16.4, 18),
      pane(21.4, 18),
      p('M18.6 29.5 V25 H21.4 V29.5'),
      p('M10.5 29.5 H29.5'),
    ],
  },
  {
    key: 'scpi',
    label: 'SCPI',
    family: 'immobilier',
    // Trois immeubles
    shapes: [
      { kind: 'rect', x: 10.2, y: 18, w: 6, h: 11.5 },
      { kind: 'rect', x: 17, y: 11, w: 6, h: 18.5 },
      { kind: 'rect', x: 23.8, y: 15, w: 6, h: 14.5 },
      pane(19, 14),
      pane(19, 19),
      pane(12.1, 21),
      pane(25.7, 18),
      p('M8.5 29.5 H31.5'),
    ],
  },
  {
    key: 'or',
    label: 'Or physique',
    family: 'biens',
    // Lingot
    shapes: [p('M10.5 26.5 L14.5 16.5 H25.5 L29.5 26.5 Z'), p('M17 20 H21.5'), p('M12.5 21.5 L14 17.5')],
  },
  {
    key: 'objet',
    label: 'Objet de valeur',
    family: 'biens',
    // Diamant
    shapes: [p('M12.5 16 L16.5 11 H23.5 L27.5 16 L20 29.5 Z'), p('M12.5 16 H27.5'), p('M16.5 11 L18 16 L20 29.5 L22 16 L23.5 11')],
  },
];

export const ICON_KEYS: readonly IconKey[] = ASSET_ICONS.map((i) => i.key);
export const iconDef = (key: IconKey): AssetIconDef => ASSET_ICONS.find((i) => i.key === key)!;
export const isIconKey = (v: unknown): v is IconKey => ICON_KEYS.includes(v as IconKey);

// Mots d'un nom ou d'un symbole, sans accents ni ponctuation : « Livret A » → « LIVRET A »
export function words(text: string): string {
  return ` ${text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()} `;
}

// Du plus précis au plus général : « Livret A » passe avant « livret »
const RULES: readonly { key: IconKey; any: readonly string[] }[] = [
  { key: 'livret-jeune', any: [' LIVRET JEUNE '] },
  { key: 'livret-a', any: [' LIVRET A ', ' LIVRETA '] },
  { key: 'ldds', any: [' LDDS ', ' LDD ', ' DEVELOPPEMENT DURABLE '] },
  { key: 'lep', any: [' LEP ', ' EPARGNE POPULAIRE '] },
  { key: 'pel', any: [' PEL ', ' PLAN D EPARGNE LOGEMENT ', ' PLAN EPARGNE LOGEMENT '] },
  { key: 'cel', any: [' CEL ', ' COMPTE D EPARGNE LOGEMENT ', ' COMPTE EPARGNE LOGEMENT '] },
  { key: 'assurance-vie', any: [' ASSURANCE VIE ', ' ASSURANCE '] },
  { key: 'per', any: [' PER ', ' PERP ', ' PERCO ', ' RETRAITE '] },
  { key: 'scpi', any: [' SCPI ', ' PIERRE PAPIER '] },
  { key: 'or', any: [' LINGOT ', ' LINGOTS ', ' NAPOLEON ', ' NAPOLEONS ', ' OR PHYSIQUE ', ' PIECE D OR ', ' PIECES D OR '] },
  { key: 'immobilier', any: [' IMMOBILIER ', ' APPARTEMENT ', ' MAISON ', ' STUDIO ', ' TERRAIN ', ' RESIDENCE ', ' LOCATIF ', ' CUSTOM IMMOBILIER '] },
  { key: 'objet', any: [' MONTRE ', ' BIJOU ', ' BIJOUX ', ' TABLEAU ', ' OEUVRE ', ' COLLECTION ', ' VOITURE ', ' VIN ', ' CUSTOM OBJET '] },
  { key: 'compte-courant', any: [' COMPTE COURANT ', ' COMPTE CHEQUE ', ' COMPTE CHEQUES ', ' CARTE '] },
  { key: 'livret-bancaire', any: [' COMPTE A TERME ', ' CAT ', ' LIVRET ', ' SUPER LIVRET ', ' EPARGNE '] },
];

// Icône reconnue d'après le nom ou le symbole ; seulement pour un placement
// sans cours (livret, bien estimé à la main) : un actif coté garde son logo ou
// ses initiales
export function recognizeIcon(asset: { ticker: string; name: string; type: AssetType }): IconKey | null {
  if (asset.type !== 'livret' && asset.type !== 'autre') return null;
  // Symbole générique d'un livret ou d'un bien saisi à la main (LIVRET_1729…,
  // CUSTOM_AUTRE_1729…) : il ne dit rien, seul le nom compte
  const ticker = /^(LIVRET|CUSTOM_AUTRE)_\d+$/.test(asset.ticker) ? '' : asset.ticker.replace(/_\d+$/, '');
  const text = `${words(asset.name)}${words(ticker)}`;
  return RULES.find((r) => r.any.some((w) => text.includes(w)))?.key ?? null;
}

// Placements sans cours proposés dans la recherche : un toucher ouvre le
// formulaire déjà rempli (livret : le site connaît le taux de ces symboles ;
// assurance vie et PER : valeur estimée, sans taux garanti)
// fullName : nom complet, cherché lui aussi (« livret » trouve le LDDS)
export type NoPriceSuggestion =
  | { icon: IconKey; name: string; fullName?: string; form: 'livret'; ticker: string }
  | { icon: IconKey; name: string; fullName?: string; form: 'manual' };
export const NO_PRICE_SUGGESTIONS: readonly NoPriceSuggestion[] = [
  { icon: 'livret-a', name: 'Livret A', form: 'livret', ticker: 'LIVRET_A' },
  { icon: 'ldds', name: 'LDDS', fullName: 'Livret de développement durable et solidaire', form: 'livret', ticker: 'LDDS' },
  { icon: 'lep', name: 'LEP', fullName: 'Livret d’épargne populaire', form: 'livret', ticker: 'LEP' },
  { icon: 'livret-jeune', name: 'Livret Jeune', form: 'livret', ticker: 'LIVRET_JEUNE' },
  { icon: 'pel', name: 'PEL', fullName: 'Plan d’épargne logement', form: 'livret', ticker: 'PEL' },
  { icon: 'cel', name: 'CEL', fullName: 'Compte épargne logement', form: 'livret', ticker: 'CEL' },
  { icon: 'assurance-vie', name: 'Assurance vie', form: 'manual' },
  { icon: 'per', name: 'PER', fullName: 'Plan d’épargne retraite', form: 'manual' },
];

// Placements sans cours qui répondent à une saisie (tous, sous 2 lettres)
export function suggestionsFor(query: string): readonly NoPriceSuggestion[] {
  const q = words(query).trim();
  if (q.length < 2) return NO_PRICE_SUGGESTIONS;
  return NO_PRICE_SUGGESTIONS.filter((s) => words(`${s.name} ${s.fullName ?? ''}`).includes(` ${q}`));
}
