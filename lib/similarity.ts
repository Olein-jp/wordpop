// lib/similarity.ts
// 家庭用の簡易スコア（英語向け）
// ※ 精度を上げたければ Levenshtein を追加してもOK（今回は軽量優先）
export function similarityScore(a: string, b: string): number {
  if (!a || !b) return 0;
  const aa = a.toLowerCase();
  const bb = b.toLowerCase();

  let score = 0;

  if (aa[0] === bb[0]) score += 2;
  if (aa.slice(0, 2) === bb.slice(0, 2)) score += 1;

  const lenDiff = Math.abs(aa.length - bb.length);
  if (lenDiff <= 1) score += 2;
  else if (lenDiff <= 2) score += 1;

  const suffix2a = aa.slice(-2);
  const suffix2b = bb.slice(-2);
  if (suffix2a === suffix2b) score += 1;

  const commonSuffix = ["ing", "ed", "ly", "tion", "s", "es"];
  for (const suf of commonSuffix) {
    if (aa.endsWith(suf) && bb.endsWith(suf)) score += 1;
  }

  // 部分一致（短い単語は過剰に上がらないように）
  if (aa.length >= 5) {
    const mid = aa.slice(1, 4);
    if (mid && bb.includes(mid)) score += 1;
  }

  return score;
}
