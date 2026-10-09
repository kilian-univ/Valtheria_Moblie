import type { LessonScreen } from '@/src/lesson/model';

// Tentative recueillie sur un écran, telle qu'elle partira à /complete
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
  // Verdict immédiat (grade.ts) ; le serveur recalcule et fait foi
  correct: boolean;
  // La bonne réponse en clair, montrée dans la feuille en cas d'erreur
  correctText: string | null;
};

// Le lecteur porte le bouton du bas et la feuille de réponse ; l'écran
// affiche son contenu et signale la réponse en cours. Chaque composant
// d'écran ne reçoit que son propre type (format interne, voir lesson/model.ts).
export type LessonScreenProps<S extends LessonScreen = LessonScreen> = {
  screen: S;
  // Écran noté validé : l'écran montre la correction
  answered: boolean;
  // Réponse en cours (écrans notés), ou valeur choisie (curseur d'estimation)
  onDraftChange: (draft: AnswerDraft | null) => void;
  // Fait défiler le lecteur jusqu'à une position de l'écran (y depuis son haut)
  scrollToY: (y: number) => void;
  // Révélation : estimation donnée plus tôt par l'utilisateur (from_screen)
  estimate: number | null;
};
