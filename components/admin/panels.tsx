"use client";

import { useState } from "react";
import { config, JUDGE_MAX_PER_JUDGE, type JudgeCriterionKey } from "@/lib/config";
import type { Team, BonusVoter } from "@/lib/types";
import { Notice } from "@/components/ui";
import { StandingsTable } from "@/components/StandingsTable";
import { QrImg, CopyLink } from "./QrImg";
import { adminApi, type DashboardData } from "./api";

const voteUrl = (base: string, token: string) => `${base}/vote/${token}`;

function Btn({
  children,
  onClick,
  tone = "brand",
  disabled,
  small,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: "brand" | "neutral" | "danger";
  disabled?: boolean;
  small?: boolean;
}) {
  const tones = {
    brand: "bg-brand text-white enabled:hover:bg-brand-dark",
    neutral:
      "bg-neutral-200 text-neutral-800 enabled:hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-100",
    danger: "bg-red-600 text-white enabled:hover:bg-red-700",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg font-medium transition disabled:opacity-40 ${
        small ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm"
      } ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

function DeleteButton({
  onDelete,
  label = "刪除",
  confirmLabel = "確定刪除?",
  tone = "danger",
}: {
  onDelete: () => void;
  label?: string;
  confirmLabel?: string;
  tone?: "danger" | "neutral";
}) {
  const [armed, setArmed] = useState(false);
  return (
    <Btn tone={tone} small onClick={() => (armed ? onDelete() : setArmed(true))}>
      {armed ? confirmLabel : label}
    </Btn>
  );
}

// ── 總覽 ──────────────────────────────────────────────────
export function OverviewPanel({ data }: { data: DashboardData }) {
  const s = data.stats;
  const cards = [
    { label: "參賽隊伍", value: s.teamCount },
    { label: "投票券已用 / 總數", value: `${s.voterUsed} / ${s.voterTotal}` },
    { label: "神秘客已評 / 總數", value: `${s.judgeSubmitted} / ${s.judgeCount}` },
    { label: "有效票數", value: data.standings.totalValidVotes },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
          >
            <p className="text-xs text-neutral-500">{c.label}</p>
            <p className="mt-1 text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
      <Notice tone={data.settings.votingOpen ? "success" : "warn"}>
        投票狀態：<b>{data.settings.votingOpen ? "開放中" : "未開放"}</b>
        {" ｜ "}
        結果頁：<b>{data.settings.resultsPublic ? "已公開" : "未公開"}</b>
        （可到「設定」分頁切換）
      </Notice>
      {data.settings.testMode && (
        <Notice tone="error">
          ⚠️ <b>測試模式開啟中</b>：同一支手機可重複投票。正式活動前請到「設定」關閉。
        </Notice>
      )}
    </div>
  );
}

// ── 隊伍 ──────────────────────────────────────────────────
export function TeamsPanel({
  data,
  reload,
}: {
  data: DashboardData;
  reload: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    setErr(null);
    try {
      await adminApi.createTeam({ name, title, videoUrl });
      setName("");
      setTitle("");
      setVideoUrl("");
      await reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <p className="font-semibold">新增隊伍</p>
        <input
          className="input"
          placeholder="隊名，例：白富美小隊"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="input"
          placeholder="作品名，例：最爆走的廈門行軍"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="input"
          placeholder="Google Drive 影片分享連結"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
        />
        {err && <Notice tone="error">{err}</Notice>}
        <Btn onClick={add} disabled={busy}>
          {busy ? "新增中…" : "新增隊伍"}
        </Btn>
      </div>

      <div className="space-y-3">
        {data.teams.length === 0 && (
          <Notice tone="info">尚無隊伍，請先於上方新增。</Notice>
        )}
        {data.teams.map((team) => (
          <TeamRow key={team.id} team={team} reload={reload} />
        ))}
      </div>
    </div>
  );
}

function TeamRow({ team, reload }: { team: Team; reload: () => Promise<void> }) {
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(team.name);
  const [title, setTitle] = useState(team.title);
  const [videoUrl, setVideoUrl] = useState(team.videoUrl);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setErr(null);
    try {
      await adminApi.updateTeam(team.id, { name, title, videoUrl });
      setEdit(false);
      await reload();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      {edit ? (
        <div className="space-y-2">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input
            className="input"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Google Drive 連結"
          />
          {err && <Notice tone="error">{err}</Notice>}
          <div className="flex gap-2">
            <Btn onClick={save} small>
              儲存
            </Btn>
            <Btn tone="neutral" small onClick={() => setEdit(false)}>
              取消
            </Btn>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold">《{team.title}》</p>
            <p className="text-sm text-neutral-500">{team.name}</p>
            <p className="mt-1 truncate text-xs text-neutral-400">
              {team.videoUrl || "（未填影片連結）"}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Btn tone="neutral" small onClick={() => setEdit(true)}>
              編輯
            </Btn>
            <DeleteButton
              onDelete={async () => {
                await adminApi.deleteTeam(team.id);
                await reload();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── 投票券 ────────────────────────────────────────────────
export function VotersPanel({
  data,
  reload,
}: {
  data: DashboardData;
  reload: () => Promise<void>;
}) {
  const [count, setCount] = useState(10);
  const [prefix, setPrefix] = useState("");
  const [busy, setBusy] = useState(false);

  async function gen() {
    setBusy(true);
    try {
      await adminApi.createVoterTokens(count, prefix || undefined);
      await reload();
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const rows = [
      ["備註", "投票連結", "狀態"],
      ...data.voterTokens.map((t) => [
        t.label,
        voteUrl(data.baseUrl, t.token),
        t.usedAt ? "已投票" : "未使用",
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "voter-links.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const sharedUrl = `${data.baseUrl}/vote`;

  return (
    <div className="space-y-5">
      {/* 共用投票連結（主要方式）*/}
      <div className="rounded-2xl border-2 border-brand/30 bg-brand/5 p-4">
        <p className="font-semibold">共用投票連結（發這個給所有同仁）</p>
        <p className="mt-1 text-xs text-neutral-500">
          所有人掃同一個 QR／開同一條連結即可投票，不記名。此 QR 也會出現在
          <b>首頁</b>——投票開放時把首頁投影出來，大家就能直接掃描。
          同一台裝置只能投一次（軟性防重複）。
        </p>
        <div className="mt-3 flex items-center gap-4">
          <div className="rounded-lg bg-white p-2">
            <QrImg url={sharedUrl} size={120} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <CopyLink url={sharedUrl} />
            <a
              href={sharedUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-brand underline"
            >
              開啟投票頁
            </a>
          </div>
        </div>
      </div>

      {/* 進階：一人一票券 */}
      <details className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <summary className="cursor-pointer text-sm font-medium text-neutral-600 dark:text-neutral-300">
          進階：一人一票券（需要嚴格防重複時才用）
        </summary>
        <div className="mt-3 space-y-2">
        <p className="text-xs text-neutral-500">
          會為每個人產生獨立的一次性連結／QR，一張只能投一次、可追蹤使用狀況。
          一般情況用上面的共用連結即可。
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm">張數</label>
          <input
            type="number"
            min={1}
            max={1000}
            className="input w-24"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
          <input
            className="input flex-1"
            placeholder="備註前綴（選填），例：行政部"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
          />
          <Btn onClick={gen} disabled={busy}>
            {busy ? "產生中…" : "產生"}
          </Btn>
        </div>
        <p className="text-xs text-neutral-500">
          每張連結只能投一次。產生後把連結／QR 發給同仁即可。
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-neutral-500">
          共 {data.voterTokens.length} 張，已投{" "}
          {data.voterTokens.filter((t) => t.usedAt).length} 張
        </p>
        {data.voterTokens.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Btn tone="neutral" small onClick={exportCsv}>
              匯出 CSV
            </Btn>
            {data.voterTokens.some((t) => !t.usedAt) && (
              <DeleteButton
                tone="neutral"
                label="清除未使用"
                confirmLabel="確定清除未使用?"
                onDelete={async () => {
                  await adminApi.clearVoterTokens("unused");
                  await reload();
                }}
              />
            )}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {data.voterTokens.map((t) => (
          <div
            key={t.token}
            className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"
          >
            <QrImg url={voteUrl(data.baseUrl, t.token)} size={72} />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex items-center gap-2 text-xs">
                {t.label || "（無備註）"}
                <span
                  className={
                    t.usedAt ? "text-green-600" : "text-neutral-400"
                  }
                >
                  {t.usedAt ? "● 已投票" : "○ 未使用"}
                </span>
              </span>
              <CopyLink url={voteUrl(data.baseUrl, t.token)} />
            </div>
            <DeleteButton
              label={t.usedAt ? "作廢" : "刪除"}
              confirmLabel="確定?"
              onDelete={async () => {
                await adminApi.deleteVoterToken(t.token);
                await reload();
              }}
            />
          </div>
        ))}
        </div>
        </div>
      </details>
    </div>
  );
}

// ── 神秘客（不記名共用評分）────────────────────────────────
export function JudgesPanel({
  data,
  reload,
}: {
  data: DashboardData;
  reload: () => Promise<void>;
}) {
  const [showManual, setShowManual] = useState(false);
  const shareUrl = `${data.baseUrl}/judge/${data.judgeShareToken}`;
  const received = data.judgeSubmissionCount;
  const total = data.judgeCount;
  const full = received >= total;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border-2 border-brand/30 bg-brand/5 p-4">
        <p className="font-semibold">神秘客共用評分連結（發這一條給兩位）</p>
        <p className="mt-1 text-xs text-neutral-500">
          {total} 位神秘客用同一條連結、不記名，各自打開評分送出即可（最多收 {total}{" "}
          份，滿了自動關閉）。此連結含密鑰、<b>只發給神秘客、別放首頁</b>。
        </p>
        <div className="mt-3 flex items-center gap-4">
          <div className="rounded-lg bg-white p-2">
            <QrImg url={shareUrl} size={110} />
          </div>
          <div className="min-w-0 flex-1">
            <CopyLink url={shareUrl} />
          </div>
        </div>
      </div>

      <Notice tone={full ? "success" : "info"}>
        已收到 <b>{received} / {total}</b> 位神秘客的評分。
        {full ? "（已額滿）" : ""}
      </Notice>

      <div className="flex flex-wrap gap-2">
        {!full && (
          <Btn tone="neutral" small onClick={() => setShowManual((s) => !s)}>
            {showManual ? "收合代輸入" : "管理者代輸入一份"}
          </Btn>
        )}
        {received > 0 && (
          <DeleteButton
            tone="neutral"
            label="清除重來"
            confirmLabel="確定清除全部評分?"
            onDelete={async () => {
              await adminApi.clearJudgeSubmissions();
              await reload();
            }}
          />
        )}
      </div>

      {showManual && !full && (
        <AdminScoreEditor teams={data.teams} reload={reload} onDone={() => setShowManual(false)} />
      )}
    </div>
  );
}

// 管理者代輸入一份神秘客評分（不記名，新增一份 submission）
function AdminScoreEditor({
  teams,
  reload,
  onDone,
}: {
  teams: Team[];
  reload: () => Promise<void>;
  onDone: () => void;
}) {
  const max = config.judgeMaxPerCriterion;
  const [scores, setScores] = useState<
    Record<string, Record<JudgeCriterionKey, number>>
  >(() => {
    const s: Record<string, Record<JudgeCriterionKey, number>> = {};
    for (const t of teams) {
      s[t.id] = Object.fromEntries(
        config.judgeCriteria.map((c) => [c.key, 0]),
      ) as Record<JudgeCriterionKey, number>;
    }
    return s;
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await adminApi.addJudgeSubmission(scores);
      await reload();
      onDone();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="text-sm font-medium">代輸入一位神秘客的評分</p>
      {teams.map((t) => (
        <div key={t.id}>
          <p className="mb-1 text-sm font-medium">《{t.title}》</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {config.judgeCriteria.map((c) => (
              <label key={c.key} className="flex flex-col text-xs">
                <span className="text-neutral-500">{c.label}</span>
                <input
                  type="number"
                  min={0}
                  max={max}
                  className="input"
                  value={scores[t.id][c.key]}
                  onChange={(e) =>
                    setScores((cur) => ({
                      ...cur,
                      [t.id]: {
                        ...cur[t.id],
                        [c.key]: Math.max(0, Math.min(max, Number(e.target.value))),
                      },
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <p className="mt-1 text-right text-xs text-neutral-500">
            小計 {config.judgeCriteria.reduce((a, c) => a + scores[t.id][c.key], 0)} /{" "}
            {JUDGE_MAX_PER_JUDGE}
          </p>
        </div>
      ))}
      {msg && <Notice tone="error">{msg}</Notice>}
      <Btn onClick={save} disabled={busy}>
        {busy ? "送出中…" : "送出這份評分"}
      </Btn>
    </div>
  );
}

// ── 設定 ──────────────────────────────────────────────────
export function SettingsPanel({
  data,
  reload,
}: {
  data: DashboardData;
  reload: () => Promise<void>;
}) {
  async function toggle(patch: {
    votingOpen?: boolean;
    resultsPublic?: boolean;
    testMode?: boolean;
  }) {
    await adminApi.setSettings(patch);
    await reload();
  }
  return (
    <div className="space-y-3">
      <ToggleRow
        label="開放公開投票"
        desc="開啟後，同仁掃共用 QR 即可投票。"
        on={data.settings.votingOpen}
        onToggle={(v) => toggle({ votingOpen: v })}
      />
      <ToggleRow
        label="公開結果頁 /results"
        desc="開啟後，任何人都能看到即時排行榜。通常等頒獎時再開。"
        on={data.settings.resultsPublic}
        onToggle={(v) => toggle({ resultsPublic: v })}
      />
      <ToggleRow
        label="測試模式（允許同一手機重複投票）"
        desc="測試時開啟，同一支手機可重複掃碼投票。⚠️ 正式活動前務必關閉，否則防重複會失效。可隨時開關。"
        on={data.settings.testMode}
        onToggle={(v) => toggle({ testMode: v })}
      />
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  on,
  onToggle,
}: {
  label: string;
  desc: string;
  on: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-neutral-500">{desc}</p>
      </div>
      <button
        onClick={() => onToggle(!on)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          on ? "bg-brand" : "bg-neutral-300 dark:bg-neutral-600"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
            on ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

// ── 加分同仁 ──────────────────────────────────────────────
export function BonusPanel({
  data,
  reload,
}: {
  data: DashboardData;
  reload: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [budget, setBudget] = useState(8);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    setErr(null);
    try {
      await adminApi.createBonus(name, budget);
      setName("");
      await reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Notice tone="info">
        加分同仁是「加權投票者」：各有固定票數，可分散投給不同隊伍，票數會
        <b>併入公開投票</b>（隊伍得票與總有效票數皆計入）。例：TOP1=8、TOP2=5、TOP3=3。
      </Notice>

      <div className="space-y-2 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <p className="font-semibold">新增加分同仁</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input flex-1"
            placeholder="名稱，例：TOP1"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label className="text-sm">票數</label>
          <input
            type="number"
            min={1}
            className="input w-24"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
          />
          <Btn onClick={add} disabled={busy}>
            {busy ? "新增中…" : "新增"}
          </Btn>
        </div>
        {err && <Notice tone="error">{err}</Notice>}
      </div>

      {data.teams.length === 0 && (
        <Notice tone="warn">請先在「隊伍」分頁建立隊伍，才能分配加分票。</Notice>
      )}

      {data.bonusVoters.map((bv) => (
        <BonusCard
          key={bv.id}
          bonus={bv}
          teams={data.teams}
          baseUrl={data.baseUrl}
          reload={reload}
        />
      ))}
    </div>
  );
}

function BonusCard({
  bonus,
  teams,
  baseUrl,
  reload,
}: {
  bonus: BonusVoter;
  teams: Team[];
  baseUrl: string;
  reload: () => Promise<void>;
}) {
  const [alloc, setAlloc] = useState<Record<string, number>>(() => {
    const a: Record<string, number> = {};
    for (const t of teams) a[t.id] = bonus.allocations[t.id] ?? 0;
    return a;
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const used = Object.values(alloc).reduce((s, n) => s + (n || 0), 0);
  const remaining = bonus.budget - used;

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await adminApi.setBonusAllocations(bonus.id, alloc);
      setMsg("已儲存");
      await reload();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{bonus.name}</p>
          <p className="text-xs text-neutral-500">
            額度 {bonus.budget} 票 ｜ 已分配{" "}
            <b className={remaining < 0 ? "text-red-600" : "text-brand"}>{used}</b> ｜
            剩 {remaining}
          </p>
        </div>
        <DeleteButton
          onDelete={async () => {
            await adminApi.deleteBonus(bonus.id);
            await reload();
          }}
        />
      </div>

      {/* 專屬投票連結/QR：發給這位加分同仁自己分配 */}
      <div className="mt-3 flex items-center gap-3 rounded-lg bg-brand/5 p-2">
        <div className="rounded-lg bg-white p-1.5">
          <QrImg url={`${baseUrl}/bonus/${bonus.token}`} size={72} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-xs text-neutral-500">
            專屬連結（發給 {bonus.name} 自己分配票）
          </p>
          <CopyLink url={`${baseUrl}/bonus/${bonus.token}`} />
        </div>
      </div>

      <p className="mt-4 text-xs font-medium text-neutral-500">
        或由管理者代分配：
      </p>
      <div className="mt-1 space-y-2">
        {teams.map((t) => (
          <div key={t.id} className="flex items-center gap-3">
            <span className="min-w-0 flex-1 truncate text-sm">
              《{t.title}》
              <span className="text-neutral-500"> {t.name}</span>
            </span>
            <input
              type="number"
              min={0}
              max={bonus.budget}
              className="input w-20"
              value={alloc[t.id] ?? 0}
              onChange={(e) =>
                setAlloc((cur) => ({
                  ...cur,
                  [t.id]: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                }))
              }
            />
          </div>
        ))}
      </div>

      {remaining < 0 && (
        <Notice tone="error">分配票數超過額度 {bonus.budget}，請調整。</Notice>
      )}
      {msg && <Notice tone="info">{msg}</Notice>}
      <div className="mt-3">
        <Btn onClick={save} disabled={busy || remaining < 0}>
          {busy ? "儲存中…" : "儲存分配"}
        </Btn>
      </div>
    </div>
  );
}

// ── 結果 ──────────────────────────────────────────────────
export function ResultsPanel({ data }: { data: DashboardData }) {
  return <StandingsTable standings={data.standings} />;
}
