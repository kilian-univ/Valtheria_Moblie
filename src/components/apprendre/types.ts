import type { ValMood } from '@/src/components/common/ValBubble';

export type { ValMood };

export type ValLine = { line: string; mood: ValMood };

export type ValBlock = {
  intro: ValLine;
  correct?: ValLine;
  wrong?: ValLine;
};

export type Screen = {
  type: string;
  val: ValBlock;
  notion?: string;
  scored: boolean;
  payload: any;
  explanation?: string;
  [key: string]: any;
};

export type CollectedAnswer = {
  screenIndex: number;
  type: string;
  notion?: string;
  correct: boolean;
  raw: any; // la tentative brute, au format attendu par /complete
};

// Réponse en cours sur un écran noté, prête à être validée
export type AnswerDraft = {
  raw: any; // au format attendu par /complete
  correct: boolean;
  // La bonne réponse en clair, montrée dans la feuille en cas d'erreur
  correctText: string | null;
};

// Le lecteur porte le bouton du bas et la feuille de réponse ; l'écran
// affiche son contenu et signale la réponse en cours (écrans notés).
export type LessonScreenProps = {
  screen: Screen;
  screenIndex: number;
  // Écran noté validé : l'écran montre la correction
  answered: boolean;
  onDraftChange: (draft: AnswerDraft | null) => void;
  // Fait défiler le lecteur jusqu'à une position de l'écran (y depuis son haut)
  scrollToY: (y: number) => void;
};
