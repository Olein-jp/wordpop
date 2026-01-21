// lib/weight.ts
import type { WordLog } from "@/types/quiz";

// 未出題優先 + 苦手優先 + 連続出題抑制
export function calcWeight(log: WordLog | undefined): number {
  if (!log) return 5; // 未出題を強く出す

  let w = 1;

  // 苦手ほど強く
  w += (log.wrongRecent ?? 0) * 2;

  // 連続正解で徐々に下げる
  w -= (log.streak ?? 0) * 0.7;

  // 直近出題の抑制（連続を避ける）
  const last = log.lastShownAt ?? 0;
  const since = Date.now() - last;
  if (since < 30_000) w -= 3; // 30秒以内に見たのは出にくくする
  if (since < 10_000) w -= 2; // さらに直近なら強く抑制

  return Math.max(w, 0.1);
}

export function weightedPick<T extends { id: string }>(
  items: T[],
  logs: Record<string, WordLog | undefined>
): T {
  const weights = items.map((i) => calcWeight(logs[i.id]));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;

  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[0];
}
