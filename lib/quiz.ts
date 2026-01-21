// lib/quiz.ts
import type { QuizItem, StudyMode } from "@/types/quiz";

export type Question = {
  id: string;
  promptLang: "en" | "ja";
  promptText: string;
  correctEn: string;
  correctJa: string;
  choices: string[];
};

export type Session = {
  items: QuizItem[];
  mode: StudyMode;
  questionCount: number;
  choiceCount: number;

  progress: {
    done: number;
    total: number;
  };

  // 出題プール（間違えたものを優先的に混ぜる等）
  pool: {
    remainingIds: string[]; // まだ出してない
    wrongQueue: string[];   // 間違えたもの（優先的に出す）
    recentIds: string[];    // 直近の出題（ダブり抑制）
  };

  // ログ
  stats: {
    correct: number;
    wrong: number;
    wrongIds: Record<string, number>;
  };
};

let _session: Session | null = null;

function requireSession(): Session {
  if (!_session) {
    throw new Error("Session is not initialized. Call makeSession() and store it before nextQuestion().");
  }
  return _session;
}

export function getSession(): Session {
  return requireSession();
}

export function clearSession() {
  _session = null;
}

export function makeSession(args: {
  items: QuizItem[];
  mode: StudyMode;
  questionCount: number;
  choiceCount: number;
}) {
  const items = Array.isArray(args.items) ? args.items : [];
  const total = Math.max(1, args.questionCount || 10);

  const ids = items.map((it) => it.id).filter(Boolean);

  _session = {
    items,
    mode: args.mode,
    questionCount: total,
    choiceCount: Math.max(2, args.choiceCount || 4),

    progress: { done: 0, total },

    pool: {
      remainingIds: shuffle([...ids]),
      wrongQueue: [],
      recentIds: [],
    },

    stats: {
      correct: 0,
      wrong: 0,
      wrongIds: {},
    },
  };
}

/**
 * 次の問題を生成して返す（引数なし）
 */
export function nextQuestion(): Question | null {
  const session = requireSession();

  // セッション終了
  if (session.progress.done >= session.progress.total) return null;

  const nextId = pickNextId(session);
  if (!nextId) return null;

  const item = session.items.find((x) => x.id === nextId);
  if (!item) return null;

  const q = buildQuestion(session, item);

  // recent に積む
  session.pool.recentIds.unshift(nextId);
  session.pool.recentIds = session.pool.recentIds.slice(0, 12);

  return q;
}

/**
 * 回答を反映する（引数なしsession方式）
 */
export function answerQuestion(q: Question, selected: string): { correct: boolean } {
  const session = requireSession();

  const isCorrect =
    q.promptLang === "en"
      ? selected === q.correctJa
      : selected === q.correctEn;

  if (isCorrect) {
    session.stats.correct += 1;
  } else {
    session.stats.wrong += 1;
    session.stats.wrongIds[q.id] = (session.stats.wrongIds[q.id] ?? 0) + 1;

    // 間違えたものを優先キューに積む（ダブり過ぎ防止）
    if (!session.pool.wrongQueue.includes(q.id)) {
      session.pool.wrongQueue.push(q.id);
    }
  }

  session.progress.done += 1;
  return { correct: isCorrect };
}

/* ---------------- helpers ---------------- */

function pickNextId(s: Session): string | null {
  // 1) 間違えたものを優先（ただし直近に出したものは避ける）
  const wrong = s.pool.wrongQueue.find((id) => !s.pool.recentIds.includes(id));
  if (wrong) {
    // 使ったら先頭から削除
    s.pool.wrongQueue = s.pool.wrongQueue.filter((x) => x !== wrong);
    return wrong;
  }

  // 2) まだ出してないもの
  while (s.pool.remainingIds.length > 0) {
    const id = s.pool.remainingIds.shift()!;
    if (!s.pool.recentIds.includes(id)) return id;
  }

  // 3) それでも無ければ、全体から（直近以外）ランダム
  const candidates = s.items.map((x) => x.id).filter((id) => !s.pool.recentIds.includes(id));
  if (candidates.length === 0) return s.items[0]?.id ?? null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function buildQuestion(s: Session, item: QuizItem): Question {
  const promptLang: "en" | "ja" = s.mode === "en-ja" ? "en" : "ja";

  const promptText = promptLang === "en" ? item.en : item.ja;
  const correctEn = item.en;
  const correctJa = item.ja;

  const correctChoice = promptLang === "en" ? correctJa : correctEn;

  const distractors = makeDistractors(s, item.id, promptLang, s.choiceCount - 1);
  const choices = shuffle([correctChoice, ...distractors]).slice(0, s.choiceCount);

  return {
    id: item.id,
    promptLang,
    promptText,
    correctEn,
    correctJa,
    choices,
  };
}

function makeDistractors(
  s: Session,
  correctId: string,
  promptLang: "en" | "ja",
  count: number
): string[] {
  const pool = s.items.filter((x) => x.id !== correctId);

  // prompt が英語なら選択肢は日本語、prompt が日本語なら選択肢は英語
  const getChoice = (it: QuizItem) => (promptLang === "en" ? it.ja : it.en);

  const candidates = shuffle(pool).map(getChoice);
  const uniq: string[] = [];
  for (const c of candidates) {
    if (!c) continue;
    if (!uniq.includes(c)) uniq.push(c);
    if (uniq.length >= count) break;
  }
  return uniq;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
