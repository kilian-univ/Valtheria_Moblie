export type MaxLine = { line: string; visual?: string };

export type Choice = {
  id: string;
  text: string;
  feedback?: string;
  store_value?: string;
  is_best?: boolean;
};

export type Screen = {
  type: string;
  max?: MaxLine;
  [key: string]: any;
};

export type CollectedAnswer = {
  type: string;
  correct: boolean;
  concept?: string;
};

export const VISUAL_EMOJI: Record<string, string> = {
  neutre: '🙂',
  concerne: '😟',
  complice: '😉',
  fier: '🤩',
  rassurant: '🤗',
  fete: '🎉',
};

// Props communes à tous les composants d'écran de leçon
export type LessonScreenProps = {
  screen: Screen;
  colors: any;
  onNext: () => void;
  onRecordAnswer: (a: CollectedAnswer) => void;
  isLast: boolean;
  onFinish: () => void;
  isSubmitting: boolean;
};