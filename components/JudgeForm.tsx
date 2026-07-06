"use client";

import { useState } from "react";
import type { Team } from "@/lib/types";
import { config, JUDGE_MAX_PER_JUDGE, type JudgeCriterionKey } from "@/lib/config";
import { DriveVideo, Notice } from "./ui";

type Scores = Record<string, Record<JudgeCriterionKey, number>>;

function blankCriteria(): Record<JudgeCriterionKey, number> {
  return Object.fromEntries(
    config.judgeCriteria.map((c) => [c.key, 0]),
  ) as Record<JudgeCriterionKey, number>;
}

export function JudgeForm({ token, teams }: { token: string; teams: Team[] }) {
  const max = config.judgeMaxPerCriterion;
  const [scores, setScores] = useState<Scores>(() => {
    const s: Scores = {};
    for (const t of teams) s[t.id] = blankCriteria();
    return s;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function setScore(teamId: string, key: JudgeCriterionKey, value: number) {
    setScores((cur) => ({
      ...cur,
      [teamId]: { ...cur[teamId], [key]: value },
    }));
  }

  function teamTotal(teamId: string): number {
    return config.judgeCriteria.reduce((a, c) => a + (scores[teamId]?.[c.key] ?? 0), 0);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, scores }),
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
      <Notice tone="success" title="評分已送出 ⭐">
        感謝你的評分！評分已送出。
      </Notice>
    );
  }

  return (
    <div className="space-y-6">
      <Notice tone="info">
        每支作品 5 個項目、每項 0–{max} 分，單支上限 {JUDGE_MAX_PER_JUDGE} 分。
      </Notice>

      {teams.map((team) => (
        <div
          key={team.id}
          className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800"
        >
          <div className="mb-3">
            <p className="font-semibold">《{team.title}》</p>
            <p className="text-sm text-neutral-500">{team.name}</p>
          </div>
          {team.videoUrl && (
            <div className="mb-4">
              <DriveVideo url={team.videoUrl} />
            </div>
          )}
          <div className="space-y-3">
            {config.judgeCriteria.map((c) => {
              const val = scores[team.id]?.[c.key] ?? 0;
              return (
                <div key={c.key} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-sm">{c.label}</span>
                  <input
                    type="range"
                    min={0}
                    max={max}
                    step={1}
                    value={val}
                    onChange={(e) => setScore(team.id, c.key, Number(e.target.value))}
                    className="flex-1 accent-brand"
                  />
                  <span className="w-8 text-right font-mono text-sm">{val}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-right text-sm text-neutral-500">
            小計：<b className="text-brand">{teamTotal(team.id)}</b> / {JUDGE_MAX_PER_JUDGE}
          </p>
        </div>
      ))}

      {error && <Notice tone="error">{error}</Notice>}

      <button
        onClick={submit}
        disabled={submitting}
        className="sticky bottom-4 w-full rounded-xl bg-brand px-4 py-3 font-semibold text-white shadow-lg transition enabled:hover:bg-brand-dark disabled:opacity-40"
      >
        {submitting ? "送出中…" : "送出評分"}
      </button>
    </div>
  );
}
