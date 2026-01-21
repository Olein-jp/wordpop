// lib/data.ts
import type { UnitFile } from "@/types/quiz";

export type UnitMeta = {
  id: string;
  title?: string;
  subtitle?: string;
  count?: number;
  /**
   * 任意：単元JSONのパス（/data/units/xxx.json など）
   * 例: "/data/units/yuki-z-kai-202601.json"
   */
  path?: string;
};

type IndexShape =
  | UnitMeta[]
  | {
      units: UnitMeta[];
    };

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch ${url} (${res.status})`);
  return (await res.json()) as T;
}

/**
 * public/data/index.json を読む
 * - 配列 or { units: [...] } の両対応
 */
export async function loadUnitIndex(): Promise<UnitMeta[]> {
  const raw = await fetchJson<IndexShape>("/data/index.json");
  const units: UnitMeta[] = Array.isArray(raw) ? raw : Array.isArray((raw as any)?.units) ? (raw as any).units : [];
  return units.filter((u) => typeof u?.id === "string" && u.id.trim().length > 0);
}

/**
 * 単元JSONを読む
 * - index.json に path があればそれを優先
 * - なければ /data/units/<unitId>.json を読む（あなたの配置に合わせたデフォルト）
 */
export async function loadUnit(unitId: string): Promise<UnitFile> {
  // indexを一度読み、該当ユニットに path があるならそれを使う
  // ※ index を毎回読むのが気になるなら、StudyPage側でまとめて index を保持してもOK
  const idx = await loadUnitIndex();
  const meta = idx.find((u) => u.id === unitId);
  const url = meta?.path?.trim() ? meta.path.trim() : `/data/units/${unitId}.json`;

  return await fetchJson<UnitFile>(url);
}

export async function loadUnitsByIds(unitIds: string[]): Promise<UnitFile[]> {
  // index を1回だけ読み、path解決してまとめて読む（効率化）
  const idx = await loadUnitIndex();
  const map = new Map(idx.map((u) => [u.id, u]));

  const urls = unitIds.map((id) => {
    const meta = map.get(id);
    return meta?.path?.trim() ? meta.path.trim() : `/data/units/${id}.json`;
  });

  return await Promise.all(urls.map((u) => fetchJson<UnitFile>(u)));
}
