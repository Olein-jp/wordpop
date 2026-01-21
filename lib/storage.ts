// lib/storage.ts
import type { UserSettings, WordLog } from "@/types/quiz";

const KEY_APP_STATE = "ew_app_state_v1";
const KEY_USERS = "ew_users_v1";
const KEY_SETTINGS_PREFIX = "ew_settings_v1:";
const KEY_LOGS_PREFIX = "ew_logs_v1:";

export type AppState = {
  currentUser: string | null;
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

// ------------------ app state ------------------
export function getAppState(): AppState {
  if (!canUseStorage()) return { currentUser: null };
  return safeParse<AppState>(localStorage.getItem(KEY_APP_STATE), { currentUser: null });
}

export function setCurrentUser(user: string | null) {
  if (!canUseStorage()) return;
  const next: AppState = { currentUser: user };
  localStorage.setItem(KEY_APP_STATE, JSON.stringify(next));
}

// ------------------ users ------------------
export function listUsers(): string[] {
  if (!canUseStorage()) return [];
  return safeParse<string[]>(localStorage.getItem(KEY_USERS), []);
}

export function addUser(user: string) {
  if (!canUseStorage()) return;
  const u = user.trim();
  if (!u) return;
  const users = new Set(listUsers());
  users.add(u);
  localStorage.setItem(KEY_USERS, JSON.stringify(Array.from(users)));
}

export function removeUser(user: string) {
  if (!canUseStorage()) return;
  const users = listUsers().filter((u) => u !== user);
  localStorage.setItem(KEY_USERS, JSON.stringify(users));

  // settings / logs も掃除
  localStorage.removeItem(KEY_SETTINGS_PREFIX + user);
  localStorage.removeItem(KEY_LOGS_PREFIX + user);

  // currentUser が削除対象なら解除
  const st = getAppState();
  if (st.currentUser === user) setCurrentUser(null);
}

// ------------------ settings ------------------
export function getUserSettings(user: string): UserSettings | null {
  if (!canUseStorage()) return null;
  return safeParse<UserSettings | null>(localStorage.getItem(KEY_SETTINGS_PREFIX + user), null);
}

export function setUserSettings(user: string, settings: UserSettings) {
  if (!canUseStorage()) return;
  localStorage.setItem(KEY_SETTINGS_PREFIX + user, JSON.stringify(settings));
}

// ------------------ logs ------------------
export function getUserLogs(user: string): Record<string, WordLog> {
  if (!canUseStorage()) return {};
  return safeParse<Record<string, WordLog>>(localStorage.getItem(KEY_LOGS_PREFIX + user), {});
}

export function setUserLogs(user: string, logs: Record<string, WordLog>) {
  if (!canUseStorage()) return;
  localStorage.setItem(KEY_LOGS_PREFIX + user, JSON.stringify(logs));
}

/**
 * ✅ 互換API：StudyPage が期待している関数名
 * 1単語ぶんのログを「追加/更新」する
 */
export function upsertUserLog(user: string, itemId: string, log: WordLog) {
  if (!canUseStorage()) return;
  const logs = getUserLogs(user);
  logs[itemId] = log;
  setUserLogs(user, logs);
}
