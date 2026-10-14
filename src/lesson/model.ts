// Format INTERNE d'une leçon (et des univers), celui que lisent les composants.
// Il ne dépend pas de la forme renvoyée par le serveur : seul normalize.ts
// connaît cette forme. Un changement de format côté API se corrige là-bas.

import type { ValMood } from '@/src/components/common/ValBubble';
import type { GradableScreen } from '@/src/utils/grade';

export type { ValMood };

export type ValLine = { line: string; mood: ValMood };

export type ValBlock = {
  intro: ValLine | null;
  correct: ValLine | null;
  wrong: ValLine | null;
};

// Champs communs à tous les écrans
type ScreenBase = {
  // Position dans la leçon : c'est la clé des réponses envoyées à /complete
  index: number;
  scored: boolean;
  notion: string | null;
  val: ValBlock;
  explanation: string | null;
  question: string | null;
  subtitle: string | null;
  // Écran tel que servi : sert uniquement à la correction (grade.ts), qui doit
  // rester le miroir exact de celle du site
  source: GradableScreen;
};

export type ChoiceOption = { id: string; text: string; correct: boolean };

export type ChoiceScreen = ScreenBase & {
  kind: 'choice';
  multiple: boolean;
  options: ChoiceOption[];
};

export type DocumentLine = {
  // null : ligne décorative, non touchable
  id: string | null;
  libelle: string;
  date: string | null;
  sousLibelle: string | null;
  montant: number | null;
  // normale | section | total | gros
  type: string;
  revelation: string | null;
  correct: boolean;
};

export type DocumentUpcoming = { date: string | null; libelle: string; montant: number | null };

export type DocumentScreen = ScreenBase & {
  kind: 'document';
  // pick : une seule ligne ; select : plusieurs
  mode: 'pick' | 'select';
  header: {
    etablissement: string | null;
    numero: string | null;
    periode: string | null;
    ibanMasque: string | null;
  };
  lines: DocumentLine[];
  solde: { libelle: string; montant: number | null } | null;
  aVenir: DocumentUpcoming[];
};

// dim : ligne atténuée (hypothèse, précaution)
export type RevealLine = { label: string; value: number | string; key: boolean; dim: boolean };

export type RevealScreen = ScreenBase & {
  kind: 'reveal';
  value: number;
  unit: string | null;
  decimals: number;
  label: string | null;
  lines: RevealLine[];
  // Valeur de départ, montrée en barre pâle au-dessus de l'estimation
  // (1 000 € qui dorment, somme empruntée…). Facultative.
  start: { label: string; value: number } | null;
  // Index d'un écran slider / number précédent dont on rappelle l'estimation
  fromScreen: number | null;
};

export type SliderScreen = ScreenBase & {
  kind: 'slider';
  min: number;
  max: number;
  step: number;
  start: number;
  unit: string | null;
  // Écran noté : valeur attendue (affichée en cas d'erreur)
  answer: number | null;
};

// ---------------------------------------------------------------------------
// Écrans interactifs (vrai ou faux, ordre, associer, répartir, simulateur,
// dialogue). Corrigés sur le téléphone par lesson/interactive.ts.
// ---------------------------------------------------------------------------

export type TrueFalseCard = { id: string; statement: string; answer: boolean; explanation: string | null };

// true_false — cartes à balayer (droite : vrai, gauche : faux). Réussi à
// partir de pass bonnes réponses.
export type TrueFalseScreen = ScreenBase & {
  kind: 'true_false';
  cards: TrueFalseCard[];
  pass: number;
};

export type OrderItem = { id: string; text: string };

// Axe vertical à gauche de la liste : libellé du haut, du bas ; risk :
// vert en haut, rouge en bas (du moins au plus risqué)
export type OrderAxis = { start: string; end: string; risk: boolean };

// order — remettre dans l'ordre. items : dans l'ordre juste ; start : ordre
// présenté (ids).
export type OrderScreen = ScreenBase & {
  kind: 'order';
  items: OrderItem[];
  start: string[];
  axis: OrderAxis;
};

export type MatchPair = { id: string; left: string; right: string };

// match — relier des paires entre deux colonnes. rightOrder : ordre de la
// colonne de droite (ids). Réussi avec au plus maxErrors erreurs.
export type MatchScreen = ScreenBase & {
  kind: 'match';
  pairs: MatchPair[];
  rightOrder: string[];
  maxErrors: number;
};

export type AllocateBucket = {
  key: string;
  label: string;
  hint: string | null;
  start: number;
  // Pot réservoir : absorbe les changements des autres
  reservoir: boolean;
  // Texte en direct sous le pot : {clé} ou {clé*12} remplacés par les valeurs,
  // {clé_montant} par le montant en euros (répartition en pourcentages)
  live: string | null;
};

// Règle de réussite : le pot doit valoir au moins min ; sinon, réplique de Val
export type AllocateRule = { bucket: string; min: number; val: ValLine | null };

// allocate — répartir un total fixe entre des pots, avec des curseurs.
// Avec base : pots en pourcentages (total 100) d'une somme de base (la paie),
// le montant affiché en petit sous le pourcentage.
export type AllocateScreen = ScreenBase & {
  kind: 'allocate';
  total: number;
  step: number;
  unit: string | null;
  base: number | null;
  baseUnit: string | null;
  buckets: AllocateBucket[];
  rules: AllocateRule[];
};

// caption : phrase sous le grand chiffre, {} remplacé par la valeur et son
// unité (« dont {} versés »)
export type SimulatorOutput = { key: string; label: string; unit: string | null; big: boolean; caption: string | null };
export type SimulatorRange = { min: number | null; max: number | null; val: ValLine };

// simulator — un curseur et des résultats calculés en direct par une formule
// nommée (lesson/formulas.ts). Non noté.
export type SimulatorScreen = ScreenBase & {
  kind: 'simulator';
  label: string;
  min: number;
  max: number;
  step: number;
  start: number;
  unit: string | null;
  formula: string;
  params: Record<string, number>;
  outputs: SimulatorOutput[];
  // Réplique de Val selon la plage du curseur (bornes incluses)
  ranges: SimulatorRange[];
};

export type DialogueReply = { id: string; text: string; correct: boolean; reaction: string | null };

// dialogue — un personnage parle, on choisit sa réponse, il réagit
export type DialogueScreen = ScreenBase & {
  kind: 'dialogue';
  character: { name: string; role: string | null };
  messages: string[];
  replies: DialogueReply[];
};

// Types pas encore construits (number, live_month) ou inconnus : affichés
// par FallbackScreen
export type UnsupportedScreen = ScreenBase & {
  kind: 'unsupported';
  type: string;
  payload: unknown;
};

export type LessonScreen =
  | ChoiceScreen
  | DocumentScreen
  | RevealScreen
  | SliderScreen
  | TrueFalseScreen
  | OrderScreen
  | MatchScreen
  | AllocateScreen
  | SimulatorScreen
  | DialogueScreen
  | UnsupportedScreen;

export type LessonModel = {
  title: string | null;
  screens: LessonScreen[];
};

// Univers d'un module, tel que GET /modules le résume
export type UniverseRef = { id: number; slug: string; name: string };

// Univers de GET /universes
export type Universe = UniverseRef & {
  description: string | null;
  // Ordre d'affichage ; fixe aussi la couleur (moduleColorKey)
  position: number;
  // Modules publiés de l'univers, dans l'ordre de GET /modules
  moduleIds: number[];
};
