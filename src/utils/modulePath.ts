// Chemin de la page module (façon Duolingo). Fonctions pures, sans React :
// testables avec Node. Toute la géométrie du chemin vit ici.

import type { Module } from '@/src/context/ApiContext';
import type { LessonView } from './learning';

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

// ---------------------------------------------------------------------------
// Géométrie
// ---------------------------------------------------------------------------
export const PATH_OFFSETS = [0, 62, 92, 62, 0, -62, -92, -62] as const;
export const STEP_Y = 108;
export const NODE_W = 82;
export const NODE_FACE_H = 74;
export const NODE_EDGE = 8;
export const NODE_H = NODE_FACE_H + NODE_EDGE;
export const TROPHY_W = 96;
export const TROPHY_FACE_H = 86;
export const TROPHY_H = TROPHY_FACE_H + NODE_EDGE;
// Anneau autour du rond en cours
export const RING_STROKE = 8;
export const RING_DIAMETER = 112;
// Bulle « COMMENCER » au-dessus du rond en cours
export const BUBBLE_W = 132;
export const BUBBLE_H = 40;
export const BUBBLE_GAP = 26; // bas de la bulle → haut du rond (l'anneau déborde de 15)
// Place au-dessus du premier rond, pour la bulle et son rebond
export const PATH_TOP = BUBBLE_H + BUBBLE_GAP + 12;
export const VAL_W = 128;

export function pathOffset(index: number): number {
  return PATH_OFFSETS[((index % PATH_OFFSETS.length) + PATH_OFFSETS.length) % PATH_OFFSETS.length];
}

export type Rect = { x: number; y: number; w: number; h: number };

// Rond n° index (le trophée est le dernier, index = nombre de leçons)
export function nodeRect(index: number, width: number, trophy = false): Rect {
  const w = trophy ? TROPHY_W : NODE_W;
  const h = trophy ? TROPHY_H : NODE_H;
  const cx = width / 2 + pathOffset(index);
  // Les ronds sont alignés sur leur centre vertical, trophée compris
  const cy = PATH_TOP + index * STEP_Y + NODE_H / 2;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

export function pathHeight(nodeCount: number): number {
  if (nodeCount <= 0) return 0;
  const last = nodeRect(nodeCount - 1, 0, true);
  return last.y + last.h;
}

export function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

// Ce qui entoure un rond : l'anneau (rond en cours) et la bulle au-dessus
export function ringRect(index: number, width: number): Rect {
  const n = nodeRect(index, width);
  const cx = n.x + n.w / 2;
  const cy = n.y + NODE_FACE_H / 2;
  return { x: cx - RING_DIAMETER / 2, y: cy - RING_DIAMETER / 2, w: RING_DIAMETER, h: RING_DIAMETER };
}

export function bubbleRect(index: number, width: number): Rect {
  const n = nodeRect(index, width);
  const cx = n.x + n.w / 2;
  return { x: cx - BUBBLE_W / 2, y: n.y - BUBBLE_GAP - BUBBLE_H, w: BUBBLE_W, h: BUBBLE_H };
}

// ---------------------------------------------------------------------------
// États
// ---------------------------------------------------------------------------
export type NodeState = 'completed' | 'current' | 'locked';

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

// ---------------------------------------------------------------------------
// Val sur le chemin
// ---------------------------------------------------------------------------
export type PathPose = 'saut' | 'fier' | 'salut';
// largeur / hauteur des images en pied
const POSE_RATIO: Record<PathPose, number> = { saut: 603 / 800, fier: 534 / 800, salut: 534 / 800 };

export function valHeight(pose: PathPose): number {
  return Math.round(VAL_W / POSE_RATIO[pose]);
}

export type ValSpot = { bend: number; pose: PathPose; rect: Rect };

// Virages = ronds les plus écartés (décalage ±92). Un virage sur deux reçoit
// Val, dans le creux, du côté opposé aux ronds. Pose selon l'avancement :
// - module terminé : fier ;
// - aucune leçon faite : salut ;
// - sinon : saut au premier virage après la leçon en cours, fier avant
//   (chemin parcouru), salut après (chemin à venir).
// Un Val qui chevaucherait un rond, l'anneau ou la bulle n'est pas posé.
export function valSpots(views: LessonView[], width: number): ValSpot[] {
  const nodeCount = views.length + 1; // + trophée
  const bends: number[] = [];
  for (let i = 0; i < nodeCount; i++) {
    if (Math.abs(pathOffset(i)) === 92) bends.push(i);
  }
  const chosen = bends.filter((_, k) => k % 2 === 0);

  const done = moduleDone(views);
  const noneDone = views.every((v) => v.status !== 'completed');
  const current = currentIndex(views);
  const sautBend = chosen.find((b) => b > current);

  const obstacles: Rect[] = [];
  for (let i = 0; i < nodeCount; i++) obstacles.push(nodeRect(i, width, i === views.length));
  if (current >= 0) obstacles.push(ringRect(current, width), bubbleRect(current, width));

  const spots: ValSpot[] = [];
  for (const bend of chosen) {
    let pose: PathPose;
    if (done) pose = 'fier';
    else if (noneDone) pose = 'salut';
    else if (bend === sautBend) pose = 'saut';
    else pose = bend < current ? 'fier' : 'salut';

    const h = valHeight(pose);
    // Miroir du virage par rapport au centre
    const cx = width / 2 - pathOffset(bend);
    const cy = nodeRect(bend, width).y + NODE_H / 2;
    const rect = { x: cx - VAL_W / 2, y: cy - h / 2, w: VAL_W, h };
    const inside = rect.x >= 0 && rect.x + rect.w <= width && rect.y >= 0;
    if (inside && !obstacles.some((o) => intersects(rect, o))) spots.push({ bend, pose, rect });
  }
  return spots;
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
