"use client";

import { useState } from "react";
import type { Team } from "@/lib/types";
import { config } from "@/lib/config";
import { DriveVideo, Notice } from "./ui";

export function VoteForm({ token, teams }: { token?: string; teams: Team[] }) {
  const need = config.votesPerBallot;
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function toggle(id: string) {
    setError(null);
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= need) return cur; // 已達上限，忽略
      return [...cur, id];
    });
  }

  async function submit() {
    if (selected.length !== need) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, teamIds: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "投票失敗，請稍後再試");
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
      <Notice tone="success" title="投票完成，感謝你 🎉">
        你的兩票已送出。結果將於主辦單位公布時揭曉！
      </Notice>
    );
  }

  const remaining = need - selected.length;

  return (
    <div className="space-y-5">
      <Notice tone="info">
        請選出你心中最強的 <b>{need}</b> 支 Vlog（不同作品）。
        {remaining > 0
          ? ` 還需選 ${remaining} 支。`
          : " 已選滿，可送出！"}
      </Notice>

      <div className="space-y-4">
        {teams.map((team) => {
          const picked = selected.includes(team.id);
          const full = selected.length >= need && !picked;
          return (
            <label
              key={team.id}
              className={`block cursor-pointer rounded-2xl border-2 p-4 transition ${
                picked
                  ? "border-brand bg-brand/5"
                  : full
                    ? "border-neutral-200 opacity-50 dark:border-neutral-800"
                    : "border-neutral-200 hover:border-brand/60 dark:border-neutral-800"
              }`}
            >
              <div className="mb-3 flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 accent-brand"
                  checked={picked}
                  disabled={full}
                  onChange={() => toggle(team.id)}
                />
                <div className="min-w-0">
                  <p className="font-semibold">《{team.title}》</p>
                  <p className="text-sm text-neutral-500">{team.name}</p>
                </div>
              </div>
              {team.videoUrl && <DriveVideo url={team.videoUrl} />}
            </label>
          );
        })}
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <button
        onClick={submit}
        disabled={selected.length !== need || submitting}
        className="sticky bottom-4 w-full rounded-xl bg-brand px-4 py-3 font-semibold text-white shadow-lg transition enabled:hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting
          ? "送出中…"
          : selected.length === need
            ? "送出投票"
            : `再選 ${remaining} 支即可送出`}
      </button>
    </div>
  );
}
