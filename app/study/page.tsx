// app/study/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getAppState, getUserSettings } from "@/lib/storage";
import { loadUnitsByIds } from "@/lib/data";
import { speakEn, warmupTTS } from "@/lib/tts";

import type { UnitFile, QuizItem, UserSettings } from "@/types/quiz";
import { makeSession, nextQuestion, answerQuestion, getSession } from "@/lib/quiz";

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">{children}</div>;
}

export default function StudyPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sessionSnap, setSessionSnap] = useState<ReturnType<typeof getSession> | null>(null);
  const [q, setQ] = useState<ReturnType<typeof nextQuestion> | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    setMounted(true);
    warmupTTS();

    const st = getAppState();
    const u = st.currentUser ?? null;

    if (!u) {
      router.replace("/");
      return;
    }
    setCurrentUser(u);

    const s = getUserSettings(u);
    if (!s || !Array.isArray(s.unitIds) || s.unitIds.length === 0) {
      router.replace("/settings");
      return;
    }
    setSettings(s);

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const units = await loadUnitsByIds(s.unitIds);
        const items = flattenItems(units);

        // ★重要：makeSession() → nextQuestion() の順（nextQuestionは引数なし）
        makeSession({
          items,
          mode: s.mode ?? "en-ja",
          questionCount: s.questionCount ?? 10,
          choiceCount: s.choiceCount ?? 4,
        });

        const first = nextQuestion();
        setQ(first);

        // 進捗表示など用にスナップショット保持
        setSessionSnap(getSession());
      } catch (e: any) {
        setError(e?.message ?? "学習の初期化に失敗しました。");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // 問題が切り替わったら自動読み上げ
  useEffect(() => {
    if (!settings?.autoSpeak) return;
    if (!q) return;

    const promptText = q.promptText;
    if (!promptText?.trim()) return;
    if (q.promptLang !== "en") return;
    speakEn(promptText, { rate: settings.ttsRate ?? 0.9 });
  }, [q, settings]);

  useEffect(() => {
    setShowAnswer(false);
  }, [q]);

  const progressText = useMemo(() => {
    if (!sessionSnap) return "";
    const done = sessionSnap.progress.done;
    const total = sessionSnap.progress.total;
    // done は「回答済み数」なので、表示は次の番号に寄せる
    return `${Math.min(done + 1, total)} / ${total}`;
  }, [sessionSnap]);

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="grid gap-4">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-6">
          <h1 className="text-2xl font-semibold tracking-tight">学習</h1>
          <p className="mt-2 text-sm text-white/70">読み込み中…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid gap-4">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-6">
          <h1 className="text-2xl font-semibold tracking-tight">学習</h1>
          <p className="mt-2 text-sm text-white/70">エラーが発生しました</p>
        </div>

        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-white/80">
          {error}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => router.push("/settings")}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            設定へ
          </button>
          <button
            onClick={() => router.push("/")}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            ホームへ
          </button>
        </div>
      </div>
    );
  }

  // 終了（q が null）
  if (!settings || !currentUser || !sessionSnap) {
    return (
      <div className="grid gap-4">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-6">
          <h1 className="text-2xl font-semibold tracking-tight">学習</h1>
          <p className="mt-2 text-sm text-white/70">セッション終了！おつかれさま。</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
          正解率: 0%
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/settings")}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            もう一回（設定へ）
          </button>
          <button
            onClick={() => router.push("/")}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            ホームへ
          </button>
        </div>
      </div>
    );
  }

  const total = sessionSnap.progress.total;
  const correct = sessionSnap.stats.correct;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  function restartSession() {
    const items = sessionSnap.items ?? [];
    makeSession({
      items,
      mode: settings.mode ?? "en-ja",
      questionCount: settings.questionCount ?? 10,
      choiceCount: settings.choiceCount ?? 4,
    });
    const first = nextQuestion();
    setQ(first);
    setSessionSnap(getSession());
  }

  if (!q) {
    return (
      <div className="grid gap-4">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-6">
          <h1 className="text-2xl font-semibold tracking-tight">学習</h1>
          <p className="mt-2 text-sm text-white/70">セッション終了！おつかれさま。</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
          正解率: {accuracy}% ・ {correct} / {total}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={restartSession}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
          >
            同じ設定で学習する
          </button>
          <button
            onClick={() => router.push("/settings")}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            設定へ
          </button>
          <button
            onClick={() => router.push("/")}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            ホームへ
          </button>
        </div>
      </div>
    );
  }

  const promptIsEnglish = q.promptLang === "en";
  const correctChoice = promptIsEnglish ? q.correctJa : q.correctEn;
  const isSelfCheck = settings.answerMode === "self-check";

  function onSpeak() {
    if (!q || !settings) return;
    const promptText = q.promptText;
    if (!promptText?.trim()) return;
    if (!promptIsEnglish) return;
    speakEn(promptText, { rate: settings.ttsRate ?? 0.9 });
  }

  function onPick(choice: string) {
    if (!q) return;
    // 1) 回答反映
    answerQuestion(q, choice);

    // 2) 次へ（引数なし）
    const nq = nextQuestion();
    setQ(nq);

    // 3) 進捗スナップショット更新
    setSessionSnap(getSession());
  }

  function onSelfCheckResult(isCorrect: boolean) {
    if (!q) return;
    const wrongChoice = q.choices.find((c) => c !== correctChoice) ?? "__wrong__";
    answerQuestion(q, isCorrect ? correctChoice : wrongChoice);
    const nq = nextQuestion();
    setQ(nq);
    setSessionSnap(getSession());
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">学習</h1>
            <p className="mt-2 text-sm text-white/70">
              ユーザー: <span className="font-semibold text-white">{currentUser}</span> ・ {progressText}
            </p>
          </div>

          {promptIsEnglish ? (
            <button
              onClick={onSpeak}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm hover:bg-white/10"
              title="読み上げ"
            >
              🔊 読み上げ
            </button>
          ) : null}
        </div>
      </div>

      <Card>
        <div className="grid gap-3">
          <div className="text-xs text-white/50">{promptIsEnglish ? "英語" : "日本語"} → 選択</div>
          <div className="text-xl font-semibold leading-relaxed">{q.promptText}</div>
          <div className="text-xs text-white/50">
            読み上げ速度: {Number(settings.ttsRate ?? 0.9).toFixed(2)}
          </div>
        </div>
      </Card>

      {isSelfCheck ? (
        <Card>
          <div className="grid gap-3">
            <div className="text-xs text-white/50">答えをノートに書いてから確認</div>
            {showAnswer ? (
              <div className="grid gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-base">
                  正解: <span className="font-semibold">{correctChoice}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onSelfCheckResult(true)}
                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
                  >
                    正解
                  </button>
                  <button
                    onClick={() => onSelfCheckResult(false)}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
                  >
                    不正解
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAnswer(true)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
              >
                答えを見る
              </button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {q.choices.map((c) => (
            <button
              key={c}
              onClick={() => onPick(c)}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left text-base hover:bg-white/10"
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => router.push("/settings")}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
        >
          設定へ
        </button>
      </div>
    </div>
  );
}

function flattenItems(units: UnitFile[]): QuizItem[] {
  const items: QuizItem[] = [];
  for (const u of units) {
    const arr = (u as any)?.items;
    if (Array.isArray(arr)) items.push(...arr);
  }
  return items;
}
