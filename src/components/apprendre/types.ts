import type { LessonScreen, ValLine } from '@/src/lesson/model';

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
  // Nombre de bonnes réponses qu'elle contient (1 par défaut) : décide du
  // singulier ou du pluriel dans la feuille
  correctCount?: number;
  // Réplique de Val propre au cas (répartir) ; sinon val.correct / wrong
  val?: ValLine | null;
  // Texte de la feuille à la place de screen.explanation (score « 3 sur 4 »)
  explanation?: string | null;
  // Réponse complète sans bouton Valider (dernière carte, dernière paire,
  // réplique choisie) : le lecteur valide aussitôt
  autoSubmit?: boolean;
  // Temps que l'écran prend pour montrer sa correction (ordre qui se
  // colore puis se range…) avant que la feuille ne monte ; 200 ms sinon
  sheetDelay?: number;
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
  // Moment (ms après le montage) où le contenu de l'écran finit d'arriver :
  // les séquences propres à l'écran partent de là
  enterDelay: number;
  // Change la réplique (et l'humeur) de Val en haut de l'écran ; null :
  // celle de l'arrivée
  setVal: (line: ValLine | null) => void;
};
