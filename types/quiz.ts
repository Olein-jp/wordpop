// types/quiz.ts
export type StudyMode = "en-ja" | "ja-en";
export type AnswerMode = "choices" | "self-check";

export type VocabItem = {
  id: string;
  en: string;
  ja: string;
  hint?: string;
};

// 現行のクイズ実装が期待する項目
export type QuizItem = VocabItem;

export type UnitIndex = {
  units: { id: string; title: string; gradeRange?: string }[];
};

export type UnitFile = {
  unitId: string;
  title: string;
  items: VocabItem[];
};

export type WordLog = {
  seen: number;
  correct: number;
  streak: number;
  wrongRecent: number;
  lastShownAt: number;
};

export type UserSettings = {
  unitIds: string[];
  mode: StudyMode;
  answerMode?: AnswerMode;
  questionCount: number;
  choiceCount: number;
  autoSpeak: boolean;
  ttsRate?: number;
};

export type QuestionChoice = {
  value: string;
  label: string;
};

export type Question = {
  itemId: string;
  promptText: string;
  promptSpeakText: string;
  correctValue: string;
  hint?: string;
  choices: QuestionChoice[];
};

export type SessionState = {
  total: number;
  answered: number;
  correct: number;
  wrong: number;
  wrongItemIds: string[];
};

export type AppState = {
  users: string[];
  currentUser: string | null;
  logs: Record<string, Record<string, WordLog>>;
  settings: Record<string, UserSettings>;
};
