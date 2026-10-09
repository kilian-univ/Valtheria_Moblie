// Chemin de la page module (façon Duolingo, version 4). Fonctions pures, sans
// React : testables avec Node. Toute la géométrie du chemin vit ici.

import type { Lesson, Module } from '@/src/context/ApiContext';
import { stepKind, type StepKind } from '../lesson/normalize';
import { lessonsWord, type LessonView } from './learning';

// ---------------------------------------------------------------------------
// Couleur d'un module
// ---------------------------------------------------------------------------
export type ModuleColorKey = 'ardoise' | 'sarcelle' | 'cuivre' | 'ivoire';
export const MODULE_COLOR_ORDER: readonly ModuleColorKey[] = ['ardoise', 'sarcelle', 'cuivre', 'ivoire'];

// SEUL endroit qui choisit la couleur d'un module : rang du module dans la
// liste du serveur, modulo 4. Quand les univers existeront, c'est ici qu'on
// lira la couleur de l'univers.
export function moduleColorKey(modules: Module[], moduleId: number): ModuleColorKey {
  const index = modules.findIndex((m) => m.id === moduleId);
  return MODULE_COLOR_ORDER[(index < 0 ? 0 : index) % MODULE_COLOR_ORDER.length];
}

// « MODULE 3 » : rang dans la liste du serveur, à partir de 1
export function moduleNumber(modules: Module[], moduleId: number): number | null {
  const index = modules.findIndex((m) => m.id === moduleId);
  return index < 0 ? null : index + 1;
}

// Module suivant dans l'ordre du serveur (null pour le dernier)
export function followingModule(modules: Module[], moduleId: number): Module | null {
  const index = modules.findIndex((m) => m.id === moduleId);
  return index < 0 || index >= modules.length - 1 ? null : modules[index + 1];
}

// « MODULE 3, 2 LEÇONS SUR 5 » (sans rang connu : « 2 LEÇONS SUR 5 »)
export function bannerLabel(number: number | null, done: number, total: number): string {
  const progress = `${done} ${lessonsWord(done)} sur ${total}`.toUpperCase();
  return number === null ? progress : `MODULE ${number}, ${progress}`;
}

// ---------------------------------------------------------------------------
// Géométrie
// ---------------------------------------------------------------------------
export const PATH_OFFSETS = [0, 58, 84, 58, 0, -58, -84, -58] as const;
export const BEND_OFFSET = 84;
export const STEP_Y = 104;
export const NODE_EDGE = 10;
// Leçon, révision, défi : ovale ; cas pratique : carré arrondi ; trophée
export const NODE_SIZES = {
  lesson: { w: 76, face: 70 },
  case: { w: 88, face: 78 },
  trophy: { w: 96, face: 86 },
} as const;
export type NodeShape = keyof typeof NODE_SIZES;
export const CASE_RADIUS = 18;
// Hauteur de référence d'une ligne : celle d'un rond de leçon
export const NODE_H = NODE_SIZES.lesson.face + NODE_EDGE;
// Anneau autour du rond en cours, halo de la couleur du module derrière
export const RING_STROKE = 8;
export const RING_DIAMETER = 104;
export const HALO_SIZE = 112; // au plus 1,5 fois le rond (règle des halos)
// Bulle « COMMENCER » au-dessus du rond en cours
export const BUBBLE_W = 132;
export const BUBBLE_H = 40;
export const BUBBLE_GAP = 28; // bas de la bulle → haut du rond (l'anneau déborde de 17)
// Place au-dessus du premier rond : la bulle et son rebond, et une rangée
// de décors
export const DECOR_TOP_ROOM = 40;
export const PATH_TOP = BUBBLE_H + BUBBLE_GAP + 12 + DECOR_TOP_ROOM;
export const VAL_W = 128;

export function pathOffset(index: number): number {
  return PATH_OFFSETS[((index % PATH_OFFSETS.length) + PATH_OFFSETS.length) % PATH_OFFSETS.length];
}

export type Rect = { x: number; y: number; w: number; h: number };

export function nodeShape(kind: StepKind): NodeShape {
  return kind === 'case' ? 'case' : 'lesson';
}

// Centre vertical de la ligne n° index
export function rowCenterY(index: number): number {
  return PATH_TOP + index * STEP_Y + NODE_H / 2;
}

// Rond n° index (le trophée est le dernier, index = nombre d'étapes)
export function nodeRect(index: number, width: number, shape: NodeShape = 'lesson'): Rect {
  const { w, face } = NODE_SIZES[shape];
  const h = face + NODE_EDGE;
  const cx = width / 2 + pathOffset(index);
  const cy = rowCenterY(index);
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

export function pathHeight(stepCount: number): number {
  const trophy = nodeRect(stepCount, 0, 'trophy');
  return trophy.y + trophy.h;
}

export function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function inflate(r: Rect, dx: number, dy: number): Rect {
  return { x: r.x - dx, y: r.y - dy, w: r.w + 2 * dx, h: r.h + 2 * dy };
}

// Centre de la face d'un rond (sans la tranche)
function faceCenter(index: number, width: number, shape: NodeShape): { cx: number; cy: number } {
  const n = nodeRect(index, width, shape);
  return { cx: n.x + n.w / 2, cy: n.y + NODE_SIZES[shape].face / 2 };
}

export function ringRect(index: number, width: number, shape: NodeShape = 'lesson'): Rect {
  const { cx, cy } = faceCenter(index, width, shape);
  return { x: cx - RING_DIAMETER / 2, y: cy - RING_DIAMETER / 2, w: RING_DIAMETER, h: RING_DIAMETER };
}

export function haloRect(index: number, width: number, shape: NodeShape = 'lesson'): Rect {
  const { cx, cy } = faceCenter(index, width, shape);
  return { x: cx - HALO_SIZE / 2, y: cy - HALO_SIZE / 2, w: HALO_SIZE, h: HALO_SIZE };
}

export function bubbleRect(index: number, width: number, shape: NodeShape = 'lesson'): Rect {
  const n = nodeRect(index, width, shape);
  const cx = n.x + n.w / 2;
  return { x: cx - BUBBLE_W / 2, y: n.y - BUBBLE_GAP - BUBBLE_H, w: BUBBLE_W, h: BUBBLE_H };
}

// ---------------------------------------------------------------------------
// Étapes et états
// ---------------------------------------------------------------------------
export type StepIcon = 'star' | 'book' | 'barbell' | 'flash';

// Icône d'une étape : leçon → étoile (la première, une fois terminée : un
// livre), révision → haltère, défi → éclair, cas pratique → livre
export function stepIcon(lesson: Lesson, number: number, completed: boolean): StepIcon {
  switch (stepKind(lesson)) {
    case 'review':
      return 'barbell';
    case 'challenge':
      return 'flash';
    case 'case':
      return 'book';
    default:
      return number === 1 && completed ? 'book' : 'star';
  }
}

export function viewShape(view: LessonView): NodeShape {
  return nodeShape(stepKind(view.lesson));
}

export function currentIndex(views: LessonView[]): number {
  return views.findIndex((v) => v.status === 'current');
}

export function completedRatio(views: LessonView[]): number {
  if (views.length === 0) return 0;
  return views.filter((v) => v.status === 'completed').length / views.length;
}

export function moduleDone(views: LessonView[]): boolean {
  return views.length > 0 && views.every((v) => v.status === 'completed');
}

// Tout ce qui occupe le chemin : ronds, trophée, et autour du rond en cours
// l'anneau, le halo et la bulle
export function pathObstacles(views: LessonView[], width: number): Rect[] {
  const rects: Rect[] = views.map((v, i) => nodeRect(i, width, viewShape(v)));
  rects.push(nodeRect(views.length, width, 'trophy'));
  const current = currentIndex(views);
  if (current >= 0) {
    const shape = viewShape(views[current]);
    rects.push(ringRect(current, width, shape), haloRect(current, width, shape), bubbleRect(current, width, shape));
  }
  return rects;
}

// ---------------------------------------------------------------------------
// Val sur le chemin
// ---------------------------------------------------------------------------
export type PathPose = 'saut' | 'fier' | 'salut';
// largeur / hauteur des images en pied
const POSE_RATIO: Record<PathPose, number> = { saut: 603 / 800, fier: 534 / 800, salut: 534 / 800 };
// Ombre au sol sous Val : 64 % de sa largeur
export const VAL_SHADOW_RATIO = 0.64;
export const VAL_SHADOW_H = 14;

export function valHeight(pose: PathPose): number {
  return Math.round(VAL_W / POSE_RATIO[pose]);
}

export type ValSpot = { bend: number; pose: PathPose; rect: Rect };

// Virages = ronds les plus écartés (décalage ±84). Un virage sur deux reçoit
// Val, dans le creux, du côté opposé aux ronds. Pose selon l'avancement :
// - module terminé : fier ;
// - aucune leçon faite : salut ;
// - sinon : saut au premier virage après la leçon en cours, fier avant
//   (chemin parcouru), salut après (chemin à venir).
// Un Val qui chevaucherait un rond, l'anneau, le halo ou la bulle n'est pas
// posé. Le rectangle compte l'ombre au sol.
export function valSpots(views: LessonView[], width: number): ValSpot[] {
  const nodeCount = views.length + 1; // + trophée
  const bends: number[] = [];
  for (let i = 0; i < nodeCount; i++) {
    if (Math.abs(pathOffset(i)) === BEND_OFFSET) bends.push(i);
  }
  const chosen = bends.filter((_, k) => k % 2 === 0);

  const done = moduleDone(views);
  const noneDone = views.every((v) => v.status !== 'completed');
  const current = currentIndex(views);
  const sautBend = chosen.find((b) => b > current);
  const obstacles = pathObstacles(views, width);

  const spots: ValSpot[] = [];
  for (const bend of chosen) {
    let pose: PathPose;
    if (done) pose = 'fier';
    else if (noneDone) pose = 'salut';
    else if (bend === sautBend) pose = 'saut';
    else pose = bend < current ? 'fier' : 'salut';

    const h = valHeight(pose) + VAL_SHADOW_H / 2;
    // Miroir du virage par rapport au centre
    const cx = width / 2 - pathOffset(bend);
    const cy = rowCenterY(bend);
    const rect = { x: cx - VAL_W / 2, y: cy - h / 2, w: VAL_W, h };
    const inside = rect.x >= 0 && rect.x + rect.w <= width && rect.y >= 0;
    if (inside && !obstacles.some((o) => intersects(rect, o))) spots.push({ bend, pose, rect });
  }
  return spots;
}

// ---------------------------------------------------------------------------
// Décors au bord du chemin
// ---------------------------------------------------------------------------
export const DECOR_NAMES = [
  'pile-pieces',
  'tirelire',
  'coffre-fort',
  'plante',
  'graphique',
  'calculatrice',
  'carnet',
  'sablier',
  'cle',
  'enveloppe',
  'banque',
] as const;
export type DecorName = (typeof DECOR_NAMES)[number];

export const DECOR_MIN = 64;
export const DECOR_MAX = 88;
export const DECOR_ROTATION = 6;
// Marge minimale au bord de l'écran
export const DECOR_EDGE = 8;
const DECOR_INWARD_JITTER = 12;
// Écart vertical minimal entre deux décors (même côté ou non)
const DECOR_GAP_Y = Math.round(STEP_Y * 0.9);
// Effet de profondeur (92 % de la vitesse) : déplacement vertical maximal
// par rapport au chemin, réservé autour de chaque décor
export const PARALLAX_FACTOR = 0.08;
export const PARALLAX_MAX = 20;
// Ombre au sol sous le décor
export const DECOR_SHADOW_H = 10;
// Au moins 3 décors, puis environ un tous les deux ronds
export const DECOR_MIN_COUNT = 3;

export type DecorSpot = { name: DecorName; rect: Rect; rotation: number; row: number };

// Tirage pseudo-aléatoire stable (mulberry32) : même module, mêmes décors
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function decorTarget(stepCount: number): number {
  return Math.max(DECOR_MIN_COUNT, Math.ceil((stepCount + 1) / 2));
}

// Décors au bord du chemin, collés au bord de l'écran (8 px au moins), des
// deux côtés : au-dessus du premier rond, à chaque ligne et demi-ligne, et
// autour du trophée. Jamais sur un rond, l'anneau, le halo, la bulle, Val ou
// un autre décor (marge de l'effet de profondeur comprise), jamais coupé par
// le bord. Côté opposé au rond essayé d'abord ; taille réduite si la place
// manque. Objets tirés selon l'id du module, jamais deux fois le même de suite.
export function decorSpots(moduleId: number, views: LessonView[], width: number, vals: ValSpot[]): DecorSpot[] {
  const rand = seededRandom(moduleId * 7919 + 17);
  const trophyRow = views.length;
  const taken: Rect[] = [...pathObstacles(views, width), ...vals.map((v) => v.rect)];
  const spots: DecorSpot[] = [];
  const target = decorTarget(views.length);
  let previous: DecorName | null = null;
  let lastY = -Infinity;

  // Lignes candidates (en rang : 0,5 = entre deux ronds), du haut vers le bas
  const rows: number[] = [-0.75];
  for (let r = 0; r <= trophyRow; r++) rows.push(r, r + 0.5);
  rows.push(trophyRow + 0.9);

  for (const row of rows) {
    if (spots.length >= target) break;
    const cy0 = rowCenterY(0) + row * STEP_Y;
    if (cy0 - lastY < DECOR_GAP_Y) continue;

    // Tirages faits pour chaque ligne, même sans décor posé : ordre stable
    const preferred = DECOR_MAX - Math.round(rand() * (DECOR_MAX - DECOR_MIN));
    const rotation = Math.round((rand() * 2 - 1) * DECOR_ROTATION * 10) / 10;
    const inward = rand() * DECOR_INWARD_JITTER;
    const coin = rand();
    let pick = Math.floor(rand() * DECOR_NAMES.length);
    if (DECOR_NAMES[pick] === previous) pick = (pick + 1) % DECOR_NAMES.length;

    // Côté : à l'opposé du rond le plus proche ; rond centré → au hasard
    const offset = pathOffset(Math.round(row));
    const first = offset !== 0 ? -Math.sign(offset) : coin < 0.5 ? -1 : 1;
    const sizes = [preferred, ...[72, DECOR_MIN].filter((s) => s < preferred)];

    let placed: DecorSpot | null = null;
    for (const side of [first, -first]) {
      for (const size of sizes) {
        const x = side < 0 ? DECOR_EDGE + inward : width - DECOR_EDGE - inward - size;
        const rect = { x, y: cy0 - size / 2, w: size, h: size + DECOR_SHADOW_H / 2 };
        const zone = inflate(rect, 2, PARALLAX_MAX);
        const inside = rect.x >= DECOR_EDGE && rect.x + rect.w <= width - DECOR_EDGE && zone.y >= 0;
        if (inside && !taken.some((t) => intersects(zone, t))) {
          placed = { name: DECOR_NAMES[pick], rect, rotation, row };
          taken.push(zone);
          break;
        }
      }
      if (placed) break;
    }
    if (placed) {
      spots.push(placed);
      previous = placed.name;
      lastY = cy0;
    }
  }
  return spots;
}

// Hauteur du chemin, décors sous le trophée compris
export function pathContentHeight(stepCount: number, decors: DecorSpot[]): number {
  const bottom = decors.reduce((m, d) => Math.max(m, d.rect.y + d.rect.h + PARALLAX_MAX), 0);
  return Math.max(pathHeight(stepCount), bottom);
}

// Décalage d'effet de profondeur : nul quand le décor est au milieu de
// l'écran, borné à ±PARALLAX_MAX
export function parallaxShift(decorCenterY: number, scrollY: number, viewport: number): number {
  const shift = (scrollY + viewport / 2 - decorCenterY) * PARALLAX_FACTOR;
  return Math.max(-PARALLAX_MAX, Math.min(PARALLAX_MAX, shift));
}

// ---------------------------------------------------------------------------
// Retour d'une leçon réussie
// ---------------------------------------------------------------------------
export type Unlock = {
  // Leçon que l'on vient de terminer : son rond se remplit
  completedId: number;
  // Leçon suivante, déverrouillée (null si c'était la dernière)
  unlockedId: number | null;
  // Dernière leçon du module : le trophée devient doré
  trophy: boolean;
};

// before : ids des leçons terminées au lancement (null : rien de connu)
export function unlockTransition(before: number[] | null, views: LessonView[]): Unlock | null {
  if (!before) return null;
  const completed = views.find((v) => v.status === 'completed' && !before.includes(v.lesson.id));
  if (!completed) return null;
  const current = views.find((v) => v.status === 'current');
  return {
    completedId: completed.lesson.id,
    unlockedId: current ? current.lesson.id : null,
    trophy: moduleDone(views),
  };
}

// ---------------------------------------------------------------------------
// Bouton flottant
// ---------------------------------------------------------------------------
export type Visibility = 'visible' | 'above' | 'below';

// top / height : rond dans le contenu défilant ; scrollY / viewport : zone visible
export function visibility(top: number, height: number, scrollY: number, viewport: number): Visibility {
  if (top + height < scrollY) return 'above';
  if (top > scrollY + viewport) return 'below';
  return 'visible';
}
