// app/settings/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAppState, getUserSettings, setUserSettings } from "@/lib/storage";
import { loadUnitIndex, loadUnitsByIds, type UnitMeta } from "@/lib/data";
import type { StudyMode, UserSettings } from "@/types/quiz";
import { warmupTTS } from "@/lib/tts";

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">{children}</div>;
}

// ★体感差が出やすい値に変更
const RATE_PRESETS = [
  { label: "ゆっくり", value: 0.6 },
  { label: "ふつう", value: 0.9 },
  { label: "はやめ", value: 1.15 },
] as const;

export default function SettingsPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  const [unitIndex, setUnitIndex] = useState<UnitMeta[]>([]);
  const [unitIndexError, setUnitIndexError] = useState<string | null>(null);

  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [totalSelectedItems, setTotalSelectedItems] = useState<number | null>(null);
  const [totalItemsLoading, setTotalItemsLoading] = useState(false);

  const [mode, setMode] = useState<StudyMode>("en-ja");
  const [questionCount, setQuestionCount] = useState(10);
  const [answerMode, setAnswerMode] = useState<"choices" | "self-check">("choices");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [ttsRate, setTtsRate] = useState(0.9);
  const [lastRangeCount, setLastRangeCount] = useState(10);

  useEffect(() => {
    setMounted(true);

    // voice一覧が取れない環境（iPad Safari等）で安定させる
    warmupTTS();

    const st = getAppState();
    const u = st.currentUser ?? null;

    if (!u) {
      router.replace("/");
      return;
    }

    setCurrentUser(u);

    const saved = getUserSettings(u);
    if (saved) {
      setSelectedUnitIds(Array.isArray(saved.unitIds) ? saved.unitIds : []);
      setMode(saved.mode ?? "en-ja");
      setQuestionCount(saved.questionCount ?? 10);
      setAnswerMode(saved.answerMode ?? "choices");
      setAutoSpeak(saved.autoSpeak ?? true);
      setTtsRate(typeof saved.ttsRate === "number" ? saved.ttsRate : 0.9);
    }

    (async () => {
      try {
        const idx = await loadUnitIndex();
        setUnitIndex(idx);
        setUnitIndexError(null);
      } catch (e: any) {
        setUnitIndex([]);
        setUnitIndexError(e?.message ?? "単元一覧の読み込みに失敗しました。");
      }
    })();
  }, [router]);

  const selectedSet = useMemo(() => new Set(selectedUnitIds), [selectedUnitIds]);

  useEffect(() => {
    let alive = true;
    if (selectedUnitIds.length === 0) {
      setTotalSelectedItems(0);
      setTotalItemsLoading(false);
      return;
    }
    setTotalItemsLoading(true);
    loadUnitsByIds(selectedUnitIds)
      .then((units) => {
        if (!alive) return;
        const total = units.reduce((sum, u) => {
          const items = (u as any)?.items;
          return sum + (Array.isArray(items) ? items.length : 0);
        }, 0);
        setTotalSelectedItems(total);
      })
      .catch(() => {
        if (!alive) return;
        setTotalSelectedItems(0);
      })
      .finally(() => {
        if (!alive) return;
        setTotalItemsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [selectedUnitIds]);

  const totalCount = totalSelectedItems ?? 0;
  const rangeMax = Math.max(1, 50, totalCount);
  const isAllSelected = totalCount > 0 && questionCount === totalCount;
  const totalItemsText = totalItemsLoading ? "計算中…" : totalCount > 0 ? `${totalCount}` : "-";

  useEffect(() => {
    if (!isAllSelected) setLastRangeCount(questionCount);
  }, [isAllSelected, questionCount]);

  function toggleUnit(id: string) {
    setSelectedUnitIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return Array.from(s);
    });
  }

  function selectAll() {
    setSelectedUnitIds(unitIndex.map((u) => u.id));
  }

  function clearAll() {
    setSelectedUnitIds([]);
  }

  const canSave = mounted && !!currentUser && selectedUnitIds.length > 0 && questionCount >= 1;

  function onSave() {
    if (!currentUser) return;

    const s: UserSettings = {
      unitIds: selectedUnitIds,
      mode,
      answerMode,
      questionCount,
      choiceCount: 4,
      autoSpeak,
      ttsRate,
    };

    setUserSettings(currentUser, s);
    router.push("/study");
  }

  if (!mounted) return null;
  if (!currentUser) return null;

  return (
    <div className="grid gap-4">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">設定</h1>
        <p className="mt-2 text-sm text-white/70">
          ユーザー: <span className="font-semibold text-white">{currentUser}</span>
        </p>
      </div>

      <Card>
        <div className="grid gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">単元を選ぶ（複数選択OK）</div>
              <div className="mt-1 text-xs text-white/60">
                選択中: <span className="font-semibold text-white">{selectedUnitIds.length}</span> 件
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={selectAll}
                disabled={unitIndex.length === 0}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                全選択
              </button>
              <button
                onClick={clearAll}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
              >
                クリア
              </button>
            </div>
          </div>

          {unitIndexError ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-white/80">
              <div className="font-semibold">単元一覧の読み込みに失敗</div>
              <div className="mt-1 text-xs text-white/70">{unitIndexError}</div>
              <div className="mt-2 text-xs text-white/60">
                <code>public/data/index.json</code> が存在するか確認してください。
              </div>
            </div>
          ) : null}

          {unitIndex.length === 0 && !unitIndexError ? (
            <div className="text-sm text-white/60">単元がまだありません（public/data/index.json を確認）</div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {unitIndex.map((u) => {
                const active = selectedSet.has(u.id);
                const title = u.title ?? u.id;
                const subtitle = u.subtitle ?? (typeof u.count === "number" ? `${u.count} items` : "");

                return (
                  <button
                    key={u.id}
                    onClick={() => toggleUnit(u.id)}
                    className={[
                      "rounded-2xl border p-4 text-left transition",
                      active ? "border-white/30 bg-white text-black" : "border-white/10 bg-white/5 hover:bg-white/10",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold break-words">{title}</div>
                        {subtitle ? (
                          <div
                            className={[
                              "mt-1 text-xs break-words",
                              active ? "text-black/70" : "text-white/60",
                            ].join(" ")}
                          >
                            {subtitle}
                          </div>
                        ) : null}
                        <div className={["mt-2 text-[11px]", active ? "text-black/60" : "text-white/40"].join(" ")}>
                          ID: {u.id}
                        </div>
                      </div>
                      <div
                        className={[
                          "rounded-full border px-2 py-1 text-[11px]",
                          active ? "border-black/20 bg-black/5" : "border-white/10 bg-white/5",
                        ].join(" ")}
                      >
                        {active ? "選択中" : "未選択"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="grid gap-3">
          <div className="text-sm font-semibold">出題モード</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setMode("en-ja")}
              className={[
                "rounded-xl border px-4 py-2 text-sm",
                mode === "en-ja" ? "border-white/30 bg-white text-black" : "border-white/10 bg-white/5 hover:bg-white/10",
              ].join(" ")}
            >
              英→日
            </button>
            <button
              onClick={() => setMode("ja-en")}
              className={[
                "rounded-xl border px-4 py-2 text-sm",
                mode === "ja-en" ? "border-white/30 bg-white text-black" : "border-white/10 bg-white/5 hover:bg-white/10",
              ].join(" ")}
            >
              日→英
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="grid gap-3">
          <div className="text-sm font-semibold">学習モード</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setAnswerMode("choices")}
              className={[
                "rounded-xl border px-4 py-2 text-sm",
                answerMode === "choices"
                  ? "border-white/30 bg-white text-black"
                  : "border-white/10 bg-white/5 hover:bg-white/10",
              ].join(" ")}
            >
              4択
            </button>
            <button
              onClick={() => setAnswerMode("self-check")}
              className={[
                "rounded-xl border px-4 py-2 text-sm",
                answerMode === "self-check"
                  ? "border-white/30 bg-white text-black"
                  : "border-white/10 bg-white/5 hover:bg-white/10",
              ].join(" ")}
            >
              筆記学習
            </button>
          </div>
          <div className="text-xs text-white/60">
            筆記学習は答えをノートに書いてから確認します。
          </div>
        </div>
      </Card>

      <Card>
        <div className="grid gap-3">
          <div className="text-sm font-semibold">1セッションの問題数</div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="range"
              min={1}
              max={rangeMax}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value || 10))}
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-2 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
            <div>
              出題数: <span className="font-semibold text-white">{questionCount}</span> ・ 全問:{" "}
              <span className="font-semibold text-white">{totalItemsText}</span>
            </div>
            <button
              onClick={() => {
                if (totalCount === 0) return;
                if (isAllSelected) {
                  setQuestionCount(Math.max(1, lastRangeCount));
                  return;
                }
                setLastRangeCount(questionCount);
                setQuestionCount(totalCount);
              }}
              disabled={totalItemsLoading || totalCount === 0}
              className={[
                "w-full rounded-xl border px-3 py-2 text-xs sm:w-auto",
                totalItemsLoading || totalCount === 0
                  ? "cursor-not-allowed border-white/10 bg-white/5 opacity-50"
                  : isAllSelected
                    ? "border-white bg-white text-black"
                    : "border-white/10 bg-white/5 hover:bg-white/10",
              ].join(" ")}
            >
              全問挑戦
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="grid gap-3">
          <div className="text-sm font-semibold">読み上げ</div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} />
            自動で読み上げる
          </label>

          <div className="text-sm font-semibold">読み上げ速度</div>
          <div className="flex flex-wrap gap-2">
            {RATE_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setTtsRate(p.value)}
                className={[
                  "rounded-xl border px-4 py-2 text-sm",
                  Math.abs(ttsRate - p.value) < 0.001
                    ? "border-white/30 bg-white text-black"
                    : "border-white/10 bg-white/5 hover:bg-white/10",
                ].join(" ")}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-white/50">速度: {ttsRate.toFixed(2)}</div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => router.push("/")}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 sm:w-auto"
        >
          戻る
        </button>

        <button
          onClick={onSave}
          disabled={!canSave}
          className={[
            "w-full rounded-xl px-4 py-2 text-sm font-semibold sm:w-auto",
            canSave ? "bg-white text-black hover:bg-white/90" : "bg-white/20 text-white/50 cursor-not-allowed",
          ].join(" ")}
        >
          保存して学習へ
        </button>
      </div>
    </div>
  );
}
