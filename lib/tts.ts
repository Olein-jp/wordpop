// lib/tts.ts

type SpeakOptions = {
  lang?: string;   // default: "en-US"
  rate?: number;   // recommended: 0.6 - 1.2
  pitch?: number;  // default: 1.0
  volume?: number; // default: 1.0
};

/**
 * Web Speech API (speechSynthesis) wrapper
 * - cancel() を必ず呼んで「設定変更が反映されない」問題を潰す
 * - voice をできるだけ適切に選ぶ（ブラウザ依存だが差が出やすくなる）
 */
export function speak(text: string, opts: SpeakOptions = {}) {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;

  const synth = window.speechSynthesis;
  synth.cancel(); // ★重要：キュー・再生中を止める

  const utter = new SpeechSynthesisUtterance(text);

  const lang = opts.lang ?? "en-US";
  utter.lang = lang;

  // voice を選ぶ（差が出やすい候補を優先）
  const voices = synth.getVoices();
  const preferred =
    voices.find((v) => v.lang === lang && /Google|Samantha|Alex/i.test(v.name)) ??
    voices.find((v) => v.lang === lang) ??
    voices.find((v) => v.lang?.startsWith(lang.split("-")[0])) ??
    null;

  if (preferred) utter.voice = preferred;

  utter.rate = clampNumber(opts.rate ?? 0.9, 0.1, 10);
  utter.pitch = clampNumber(opts.pitch ?? 1.0, 0, 2);
  utter.volume = clampNumber(opts.volume ?? 1.0, 0, 1);

  synth.speak(utter);
}

export function speakEn(text: string, opts: Omit<SpeakOptions, "lang"> = {}) {
  speak(text, { ...opts, lang: "en-US" });
}

export function speakJa(text: string, opts: Omit<SpeakOptions, "lang"> = {}) {
  speak(text, { ...opts, lang: "ja-JP" });
}

/**
 * iOS/Safari は voices が遅れて入ることがあるため、
 * 初回に呼んでおくと voice 選択が安定しやすい。
 */
export function warmupTTS() {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;

  const synth = window.speechSynthesis;

  // voices が空でも、イベント登録しておくと後で更新される
  const tryLoad = () => synth.getVoices();
  tryLoad();

  // 一部環境で voiceschanged が来る
  synth.addEventListener?.("voiceschanged", tryLoad);
}

function clampNumber(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
