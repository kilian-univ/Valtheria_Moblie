// Bulle de Val : texte sans mot orphelin, géométrie de la pointe, placement à
// côté de la tête. Fonctions pures, sans React : testables avec Node.

const NBSP = ' ';

// Pas de mot seul sur la dernière ligne : le dernier mot est collé au
// précédent par une espace insécable ; une ponctuation finale isolée (« ? »,
// « ! », « : », « ; ») l'est aussi, avec le mot d'avant.
export function noOrphan(text: string): string {
  const glued = text.trim().replace(/ ([?!:;»]+)$/, `${NBSP}$1`);
  // Dernière espace normale restante avant la fin : insécable
  return glued.replace(/ ([^ ]+)$/, `${NBSP}$1`);
}

export type TailSide = 'left' | 'right' | 'bottom';
export type Point = { x: number; y: number };

// Bouche et bord de la tête de Val, en fractions de l'image (relevés sur les
// dessins) : de quoi orienter la pointe et la régler à 55 % de l'écart
export type ValFace = { mouthX: number; mouthY: number; headRight: number };

// Part de l'écart entre la bulle et la tête couverte par la pointe (règle du
// lettrage : prolongée, elle arriverait sur la bouche)
export const TAIL_REACH = 0.55;
const TAIL_MIN = 8;
const TAIL_MAX = 40;

// Direction sortante de chaque côté
const OUTWARD: Record<TailSide, Point> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  bottom: { x: 0, y: 1 },
};
// La pointe ne s'écarte pas de plus de 60° de la direction sortante
const MAX_ANGLE = (60 * Math.PI) / 180;

// Direction de la pointe : vers la bouche, ramenée dans un cône de 60°
// autour de la direction sortante (jamais le long de la bulle)
export function tailDirection(side: TailSide, aim?: Point | null): Point {
  const out = OUTWARD[side];
  if (!aim || (aim.x === 0 && aim.y === 0)) return out;
  const len = Math.hypot(aim.x, aim.y);
  const dir = { x: aim.x / len, y: aim.y / len };
  const angle = Math.atan2(dir.y, dir.x) - Math.atan2(out.y, out.x);
  const wrapped = Math.atan2(Math.sin(angle), Math.cos(angle));
  if (Math.abs(wrapped) <= MAX_ANGLE) return dir;
  const clamped = Math.atan2(out.y, out.x) + Math.sign(wrapped) * MAX_ANGLE;
  return { x: Math.cos(clamped), y: Math.sin(clamped) };
}

export function tailLength(gap: number): number {
  return Math.min(TAIL_MAX, Math.max(TAIL_MIN, gap * TAIL_REACH));
}

// Triangle de la pointe, dans un repère centré sur le milieu de sa base (au
// bord de la bulle) : base légèrement rentrée dans la bulle (même matière,
// sans couture), sommet à `length` dans la direction donnée
export function tailPoints(side: TailSide, direction: Point, length: number, base: number): Point[] {
  const out = OUTWARD[side];
  const along = { x: -out.y, y: out.x }; // le long du bord
  const inset = 1.5;
  const half = base / 2;
  const b1 = { x: -out.x * inset + along.x * half, y: -out.y * inset + along.y * half };
  const b2 = { x: -out.x * inset - along.x * half, y: -out.y * inset - along.y * half };
  const tip = { x: direction.x * length, y: direction.y * length };
  return [b1, tip, b2];
}

export type BesideLayout = {
  // Décalage vertical de la bulle par rapport au haut de Val
  offsetTop: number;
  // Position de la pointe le long du bord gauche de la bulle (depuis son haut)
  anchor: number;
  // Vers la bouche, depuis la base de la pointe
  aim: Point;
  length: number;
};

// Bulle posée à droite de Val (rangée : Val, écart, bulle), pointe à gauche à
// hauteur de bouche. width × height : image de Val ; gap : écart entre l'image
// et la bulle ; anchor : hauteur voulue de la pointe dans la bulle.
export function besideLayout(face: ValFace, width: number, height: number, gap: number, anchor: number): BesideLayout {
  const mouth = { x: width * face.mouthX, y: height * face.mouthY };
  const offsetTop = Math.max(0, mouth.y - anchor);
  const base = { x: width + gap, y: offsetTop + anchor };
  const toHead = width + gap - width * face.headRight;
  return {
    offsetTop,
    anchor: mouth.y - offsetTop,
    aim: { x: mouth.x - base.x, y: mouth.y - base.y },
    length: tailLength(toHead),
  };
}
