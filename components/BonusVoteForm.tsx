"use client";

import { useState } from "react";
import type { Team } from "@/lib/types";
import { Notice } from "./ui";

export function BonusVoteForm({
  token,
  name,
  budget,
  teams,
  initial,
}: {
  token: string;
  name: string;
  budget: number;
  teams: Team[];
  initial: Record<string, number>;
}) {
  const [alloc, setAlloc] = useState<Record<string, number>>(() => {
    const a: Record<string, number> = {};
    for (const t of teams) a[t.id] = initial[t.id] ?? 0;
    return a;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const used = Object.values(alloc).reduce((s, n) => s + (n || 0), 0);
  const remaining = budget - used;

  function setTeam(teamId: string, value: number) {
    setError(null);
    setAlloc((cur) => ({ ...cur, [teamId]: Math.max(0, Math.floor(value || 0)) }));
  }

  async function submit() {
    if (remaining < 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bonus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, allocations: alloc }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "送出失敗，請稍後再試");
        return;
      }
      setDone(true);
    } catch {
      setError("連線失敗，請檢查網路後再試");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Notice tone="success" title="已送出，感謝你 🎉">
        你的 {budget} 票已分配完成。如需修改，重新整理本頁再調整送出即可。
      </Notice>
    );
  }

  return (
    <div className="space-y-5">
      <Notice tone="info">
        {name}，你有 <b>{budget}</b> 票，可自由分配給下列作品（可只投部分）。目前剩{" "}
        <b className={remaining < 0 ? "text-red-600" : ""}>{remaining}</b> 票。
      </Notice>

      <div className="space-y-3">
        {teams.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">《{t.title}》</p>
              <p className="text-xs text-neutral-500">{t.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTeam(t.id, (alloc[t.id] ?? 0) - 1)}
                disabled={(alloc[t.id] ?? 0) <= 0}
                className="h-9 w-9 rounded-lg bg-neutral-200 text-lg font-bold disabled:opacity-40 dark:bg-neutral-700"
              >
                −
              </button>
              <input
                type="number"
                min={0}
                max={budget}
                value={alloc[t.id] ?? 0}
                onChange={(e) => setTeam(t.id, Number(e.target.value))}
                className="input w-16 text-center"
              />
              <button
                onClick={() => setTeam(t.id, (alloc[t.id] ?? 0) + 1)}
                disabled={remaining <= 0}
                className="h-9 w-9 rounded-lg bg-neutral-200 text-lg font-bold disabled:opacity-40 dark:bg-neutral-700"
              >
                ＋
              </button>
            </div>
          </div>
        ))}
      </div>

      {remaining < 0 && (
        <Notice tone="error">分配票數超過 {budget}，請調整。</Notice>
      )}
      {error && <Notice tone="error">{error}</Notice>}

      <button
        onClick={submit}
        disabled={submitting || remaining < 0}
        className="sticky bottom-4 w-full rounded-xl bg-brand px-4 py-3 font-semibold text-white shadow-lg transition enabled:hover:bg-brand-dark disabled:opacity-40"
      >
        {submitting ? "送出中…" : "送出加分票"}
      </button>
    </div>
  );
}
