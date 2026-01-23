// app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addUser, getAppState, listUsers, removeUser, setCurrentUser } from "@/lib/storage";

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">{children}</div>;
}

export default function HomePage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [users, setUsers] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const st = getAppState();
    setCurrent(st.currentUser ?? null);

    const u = listUsers();
    setUsers(Array.isArray(u) ? u : []);
  }, []);

  function refreshUsers() {
    const u = listUsers();
    setUsers(Array.isArray(u) ? u : []);
  }

  function selectUser(u: string) {
    setCurrentUser(u); // ✅ localStorage保存
    setCurrent(u); // ✅ UI反映
  }

  function onAdd() {
    const v = name.trim();
    if (!v) return;

    addUser(v);
    setName("");
    refreshUsers();

    // ✅ 追加したら「自動で選択」して次へ進める状態にする
    selectUser(v);
  }

  function onDelete(u: string) {
    removeUser(u);
    refreshUsers();

    if (current === u) {
      setCurrent(null);
      setCurrentUser(null);
    }
  }

  const canGo = useMemo(() => mounted && !!current, [mounted, current]);

  return (
    <div className="grid gap-4">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">英単語学習</h1>
        <p className="mt-2 text-sm text-white/70">ユーザーを選んで進みます。</p>
      </div>

      <Card>
        <div className="grid gap-3">
          <div className="text-sm font-semibold">ユーザー追加</div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例）koji"
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-white/20"
            />
            <button
              onClick={onAdd}
              className="w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90 sm:w-auto"
            >
              追加
            </button>
          </div>
          <div className="text-xs text-white/50">※ 追加すると自動で選択されます</div>
        </div>
      </Card>

      <Card>
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">ユーザー一覧</div>
            <div className="text-xs text-white/60">{users.length} 人</div>
          </div>

          {users.length === 0 ? (
            <div className="text-sm text-white/60">まだユーザーがいません。</div>
          ) : (
            <div className="grid gap-2">
              {users.map((u) => {
                const isActive = u === current;
                return (
                  <div
                    key={u}
                    role="button"
                    tabIndex={0}
                    onClick={() => selectUser(u)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectUser(u);
                      }
                    }}
                    className={[
                      "flex cursor-pointer flex-col gap-2 rounded-xl border px-3 py-2 sm:flex-row sm:items-center sm:justify-between",
                      "border-white/10 bg-white/5",
                      isActive ? "ring-2 ring-white/20" : "",
                    ].join(" ")}
                  >
                    <div className="text-left text-sm font-semibold break-words">
                      {u}
                      {isActive ? <span className="ml-2 text-xs text-white/60">（選択中）</span> : null}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(u);
                      }}
                      className="self-start rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10 sm:self-auto"
                    >
                      削除
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={() => router.push("/settings")}
              disabled={!canGo}
              className={[
                "w-full rounded-xl px-4 py-2 text-sm font-semibold sm:w-auto",
                canGo ? "bg-white text-black hover:bg-white/90" : "bg-white/20 text-white/50 cursor-not-allowed",
              ].join(" ")}
            >
              設定へ
            </button>

            <button
              onClick={() => router.push("/study")}
              disabled={!canGo}
              className={[
                "w-full rounded-xl border px-4 py-2 text-sm sm:w-auto",
                canGo ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-white/10 bg-white/5 text-white/40 cursor-not-allowed",
              ].join(" ")}
            >
              学習へ
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
