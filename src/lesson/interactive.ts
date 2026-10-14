// Correction locale et calculs des écrans interactifs (vrai ou faux, ordre,
// associer, répartir, simulateur). Le dialogue est corrigé par grade.ts,
// comme sur le site. Fonctions pures, sans React : testables avec Node.

import type {
  AllocateBucket,
  AllocateRule,
  AllocateScreen,
  MatchScreen,
  OrderScreen,
  SimulatorRange,
  TrueFalseScreen,
  ValLine,
} from './model';

// ---------------------------------------------------------------------------
// Vrai ou faux en rafale
// ---------------------------------------------------------------------------

// Bonnes réponses, carte par carte (answers[i] : réponse donnée à la carte i)
export function trueFalseResults(screen: Pick<TrueFalseScreen, 'cards'>, answers: boolean[]): boolean[] {
  return screen.cards.map((card, i) => answers[i] === card.answer);
}

export function trueFalseScore(screen: Pick<TrueFalseScreen, 'cards'>, answers: boolean[]): number {
  return trueFalseResults(screen, answers).filter(Boolean).length;
}

// Réaction de Val après une carte (le verdict de la carte suit sur elle)
const TRUE_FALSE_RIGHT: ValLine[] = [
  { line: 'Bien vu !', mood: 'celebrant' },
  { line: 'Exactement.', mood: 'fier' },
  { line: 'Tout juste, la suivante.', mood: 'complice' },
];
const TRUE_FALSE_WRONG: ValLine[] = [
  { line: 'Pas grave, retiens bien celle-là.', mood: 'rassurant' },
  { line: 'Raté, mais maintenant tu sais.', mood: 'rassurant' },
];

export function trueFalseReaction(correct: boolean, cardIndex: number): ValLine {
  const lines = correct ? TRUE_FALSE_RIGHT : TRUE_FALSE_WRONG;
  return lines[Math.abs(cardIndex) % lines.length];
}

// Réussi : toutes les cartes jouées, et au moins pass bonnes réponses
export function trueFalsePassed(screen: Pick<TrueFalseScreen, 'cards' | 'pass'>, answers: boolean[]): boolean {
  return answers.length === screen.cards.length && trueFalseScore(screen, answers) >= screen.pass;
}

// ---------------------------------------------------------------------------
// Remettre dans l'ordre
// ---------------------------------------------------------------------------

// Chaque position est-elle à sa place ?
export function orderResults(screen: Pick<OrderScreen, 'items'>, order: string[]): boolean[] {
  return screen.items.map((item, i) => order[i] === item.id);
}

export function orderCorrect(screen: Pick<OrderScreen, 'items'>, order: string[]): boolean {
  return order.length === screen.items.length && orderResults(screen, order).every(Boolean);
}

// Déplace l'élément d'une position vers une autre (glisser, monter, descendre)
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length) return list;
  const target = Math.min(list.length - 1, Math.max(0, to));
  if (target === from) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item);
  return next;
}

// ---------------------------------------------------------------------------
// Associer
// ---------------------------------------------------------------------------

// Une paire touchée (gauche, droite) est-elle juste ?
export function isMatch(leftId: string, rightId: string): boolean {
  return leftId === rightId;
}

// Réussi : toutes les paires trouvées, avec au plus maxErrors erreurs
export function matchPassed(screen: Pick<MatchScreen, 'pairs' | 'maxErrors'>, found: number, errors: number): boolean {
  return found === screen.pairs.length && errors <= screen.maxErrors;
}

// ---------------------------------------------------------------------------
// Répartir
// ---------------------------------------------------------------------------

export type Allocation = Record<string, number>;

export function initialAllocation(buckets: AllocateBucket[]): Allocation {
  return Object.fromEntries(buckets.map((b) => [b.key, b.start]));
}

function reservoirKey(buckets: AllocateBucket[]): string | undefined {
  return buckets.find((b) => b.reservoir)?.key;
}

// Plus haute valeur possible d'un pot : ce qu'il a, plus tout le réservoir
export function allocationMax(screen: Pick<AllocateScreen, 'buckets' | 'total'>, values: Allocation, key: string): number {
  const reservoir = reservoirKey(screen.buckets);
  if (!reservoir || key === reservoir) return screen.total;
  return (values[key] ?? 0) + (values[reservoir] ?? 0);
}

// Un pot change : le réservoir absorbe la différence, sans jamais passer sous
// zéro (le pot est plafonné à ce que le réservoir peut céder). Le total ne
// change pas. Le réservoir lui-même ne se règle pas directement.
export function moveAllocation(
  screen: Pick<AllocateScreen, 'buckets' | 'total' | 'step'>,
  values: Allocation,
  key: string,
  wanted: number
): Allocation {
  const reservoir = reservoirKey(screen.buckets);
  if (!reservoir || key === reservoir || !(key in values)) return values;
  const stepped = Math.round(wanted / screen.step) * screen.step;
  const next = Math.min(allocationMax(screen, values, key), Math.max(0, stepped));
  const delta = next - (values[key] ?? 0);
  if (delta === 0) return values;
  return { ...values, [key]: next, [reservoir]: (values[reservoir] ?? 0) - delta };
}

export type AllocationVerdict = { passed: boolean; failed: AllocateRule | null };

// Règles dans l'ordre de la leçon : la première non respectée donne la réplique
export function gradeAllocation(screen: Pick<AllocateScreen, 'rules'>, values: Allocation): AllocationVerdict {
  const failed = screen.rules.find((r) => (values[r.bucket] ?? 0) < r.min) ?? null;
  return { passed: failed === null, failed };
}

// Valeurs des gabarits : celles des pots, plus, en pourcentages d'une somme
// de base, le montant de chaque pot sous « <clé>_montant » (arrondi à l'euro)
export function allocationTemplateValues(screen: Pick<AllocateScreen, 'base'>, values: Allocation): Allocation {
  if (screen.base === null) return values;
  const amounts = Object.fromEntries(
    Object.entries(values).map(([key, v]) => [`${key}_montant`, allocationAmount(screen, v)])
  );
  return { ...values, ...amounts };
}

// Montant d'un pourcentage de la somme de base (sans base : la valeur)
export function allocationAmount(screen: Pick<AllocateScreen, 'base'>, value: number): number {
  return screen.base === null ? value : Math.round((screen.base * value) / 100);
}

// « Dans un an : {epargne*12} € » → « Dans un an : 2 160 € ». format : mise
// en forme des nombres (formatNumber de l'app).
export function fillTemplate(template: string, values: Allocation, format: (n: number) => string): string {
  return template.replace(/\{(\w+)(?:\s*\*\s*(\d+(?:\.\d+)?))?\}/g, (whole, key: string, factor?: string) => {
    if (!(key in values)) return whole;
    return format(values[key] * (factor ? Number(factor) : 1));
  });
}

// ---------------------------------------------------------------------------
// Simulateur
// ---------------------------------------------------------------------------

// Réplique de Val pour la valeur du curseur : première plage qui la contient
// (bornes incluses ; borne absente = ouverte)
export function rangeLine(ranges: SimulatorRange[], x: number): ValLine | null {
  const range = ranges.find((r) => (r.min === null || x >= r.min) && (r.max === null || x <= r.max));
  return range?.val ?? null;
}
