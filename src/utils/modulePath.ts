// Chemin de la page module (façon Duolingo, version 4). Fonctions pures, sans
// React : testables avec Node. Toute la géométrie du chemin vit ici.

import type { Lesson, Module } from '@/src/context/ApiContext';
import type { Universe } from '../lesson/model';
import { moduleUniverse, stepKind, type StepKind } from '../lesson/normalize';
import { lessonsWord, type LessonView } from './learning';

// ---------------------------------------------------------------------------
// Couleur d'un module
// ---------------------------------------------------------------------------
export type ModuleColorKey = 'ardoise' | 'sarcelle' | 'cuivre' | 'ivoire';
export const MODULE_COLOR_ORDER: readonly ModuleColorKey[] = ['ardoise', 'sarcelle', 'cuivre', 'ivoire'];

// Couleur d'un univers : sa position, modulo 4. Stable tant que l'univers ne
// change pas de position, quel que soit le nombre d'univers chargés.
export function universeColorKey(universe: Universe): ModuleColorKey {
  const n = MODULE_COLOR_ORDER.length;
  return MODULE_COLOR_ORDER[((universe.position % n) + n) % n];
}

// Univers d'un module parmi ceux de GET /universes : d'après module.universe,
// sinon d'après les module_ids des univers
export function universeOfModule(module: Module, universes: Universe[]): Universe | null {
  const ref = moduleUniverse(module);
  return (
    (ref ? universes.find((u) => u.id === ref.id) : undefined) ??
    universes.find((u) => u.moduleIds.includes(module.id)) ??
    null
  );
}

// SEUL endroit qui choisit la couleur d'un module : celle de son univers
// quand il est connu, sinon le rang du module dans la liste du serveur,
// modulo 4
export function moduleColorKey(modules: Module[], moduleId: number, universes: Universe[] = []): ModuleColorKey {
  const index = modules.findIndex((m) => m.id === moduleId);
  const universe = index < 0 ? null : universeOfModule(modules[index], universes);
  if (universe) return universeColorKey(universe);
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
// Place au-dessus du premier rond, pour la bulle et son rebond
export const PATH_TOP = BUBBLE_H + BUBBLE_GAP + 12;
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

export const DECOR_MIN = 56;
export const DECOR_MAX = 72;
export const DECOR_ROTATION = 4;
// Marge minimale au bord de l'écran
export const DECOR_EDGE = 8;
// Écart minimal entre deux décors, en lignes
const DECOR_ROW_GAP = 2;
// Effet de profondeur (92 % de la vitesse) : déplacement vertical maximal
// par rapport au chemin, réservé autour de chaque décor
export const PARALLAX_FACTOR = 0.08;
export const PARALLAX_MAX = 20;
// Ombre au sol sous le décor
export const DECOR_SHADOW_H = 10;

export type DecorSide = -1 | 1; // -1 : à gauche du chemin ; 1 : à droite
export type DecorSpot = { name: DecorName; rect: Rect; rotation: number; row: number; side: DecorSide };

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

// Environ 1 décor pour 3 ronds (trophée compris), au moins 1
export function decorTarget(stepCount: number): number {
  return Math.max(1, Math.round((stepCount + 1) / 3));
}

type Candidate = { row: number; side: DecorSide; rect: Rect; zone: Rect; bend: boolean };

// Décors au bord du chemin :
// - de préférence dans le creux d'un virage, du côté opposé au rond de sa
//   ligne, à mi-chemin entre ce rond et le bord de l'écran ;
// - sinon sur une autre ligne, toujours à l'opposé du rond (rond centré : un
//   côté ou l'autre) ;
// - jamais au-dessus du premier rond, jamais deux de suite du même côté,
//   jamais du côté de Val sur les mêmes lignes, jamais sur un rond, l'anneau,
//   le halo, la bulle ou un autre décor (marge de l'effet de profondeur
//   comprise) ; s'il n'y a pas de place, un décor de moins.
// Objets, tailles et rotations tirés selon l'id du module ; jamais deux fois
// le même objet de suite.
export function decorSpots(moduleId: number, views: LessonView[], width: number, vals: ValSpot[]): DecorSpot[] {
  const rand = seededRandom(moduleId * 7919 + 17);
  const trophyRow = views.length;
  const obstacles = pathObstacles(views, width);
  const target = decorTarget(views.length);

  // Candidats, ligne par ligne (tirages faits pour chaque ligne : ordre stable)
  const candidates: Candidate[] = [];
  for (let row = 1; row <= trophyRow; row++) {
    const size = Math.round(DECOR_MIN + rand() * (DECOR_MAX - DECOR_MIN));
    const coin = rand();
    const offset = pathOffset(row);
    const shape = row === trophyRow ? 'trophy' : viewShape(views[row]);
    const node = nodeRect(row, width, shape);
    const sides: DecorSide[] = offset !== 0 ? [offset > 0 ? -1 : 1] : coin < 0.5 ? [-1, 1] : [1, -1];
    for (const side of sides) {
      // À mi-chemin entre le bord du rond et le bord de l'écran
      const gapStart = side < 0 ? 0 : node.x + node.w;
      const gapEnd = side < 0 ? node.x : width;
      const cx = (gapStart + gapEnd) / 2;
      const cy = rowCenterY(row);
      const rect = { x: cx - size / 2, y: cy - size / 2, w: size, h: size + DECOR_SHADOW_H / 2 };
      const zone = inflate(rect, 2, PARALLAX_MAX);
      const inside = rect.x >= DECOR_EDGE && rect.x + rect.w <= width - DECOR_EDGE;
      // Jamais du côté de Val sur les mêmes lignes
      const valSide = vals.some(
        (v) => Math.sign(v.rect.x + v.rect.w / 2 - width / 2) === side && zone.y < v.rect.y + v.rect.h && v.rect.y < zone.y + zone.h
      );
      const free = !obstacles.some((o) => intersects(zone, o)) && !vals.some((v) => intersects(zone, v.rect));
      if (inside && !valSide && free) {
        candidates.push({ row, side, rect, zone, bend: Math.abs(offset) === BEND_OFFSET });
      }
    }
  }

  // Choix : les virages d'abord, puis les autres lignes. Un candidat n'est
  // gardé que si, rangé dans l'ordre du chemin, il reste à 2 lignes de ses
  // voisins et d'un autre côté qu'eux.
  const chosen: Candidate[] = [];
  const fits = (c: Candidate) => {
    const sorted = [...chosen, c].sort((a, b) => a.row - b.row);
    const i = sorted.indexOf(c);
    const before = sorted[i - 1];
    const after = sorted[i + 1];
    const ok = (n?: Candidate) => !n || (Math.abs(n.row - c.row) >= DECOR_ROW_GAP && n.side !== c.side);
    return ok(before) && ok(after) && !chosen.some((n) => intersects(n.zone, c.zone));
  };
  for (const pass of [true, false]) {
    for (const c of candidates) {
      if (chosen.length >= target) break;
      if (c.bend === pass && fits(c)) chosen.push(c);
    }
  }
  chosen.sort((a, b) => a.row - b.row);

  // Objets et rotations, dans l'ordre du chemin
  let previous: DecorName | null = null;
  return chosen.map((c) => {
    let pick = Math.floor(rand() * DECOR_NAMES.length);
    if (DECOR_NAMES[pick] === previous) pick = (pick + 1) % DECOR_NAMES.length;
    previous = DECOR_NAMES[pick];
    const rotation = Math.round((rand() * 2 - 1) * DECOR_ROTATION * 10) / 10;
    return { name: DECOR_NAMES[pick], rect: c.rect, rotation, row: c.row, side: c.side };
  });
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
