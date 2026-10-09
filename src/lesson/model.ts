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

export type RevealLine = { label: string; value: number | string; key: boolean };

export type RevealScreen = ScreenBase & {
  kind: 'reveal';
  value: number;
  unit: string | null;
  decimals: number;
  label: string | null;
  lines: RevealLine[];
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

// Types pas encore construits (number, dialogue, allocate, live_month) ou
// inconnus : affichés par FallbackScreen
export type UnsupportedScreen = ScreenBase & {
  kind: 'unsupported';
  type: string;
  payload: unknown;
};

export type LessonScreen = ChoiceScreen | DocumentScreen | RevealScreen | SliderScreen | UnsupportedScreen;

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
