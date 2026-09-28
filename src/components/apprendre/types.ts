export type ValMood = 'neutre' | 'rassurant' | 'fier' | 'complice' | 'determine' | 'celebrant';

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

export type LessonScreenProps = {
  screen: Screen;
  screenIndex: number;
  colors: any;
  onNext: () => void;
  onRecordAnswer: (a: CollectedAnswer) => void;
  isLast: boolean;
  onFinish: () => void;
  isSubmitting: boolean;
};