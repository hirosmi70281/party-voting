"use client";

import { useCallback, useEffect, useState } from "react";
import { config } from "@/lib/config";
import { Notice, VersionFooter } from "@/components/ui";
import { adminApi, type DashboardData } from "./api";
import {
  OverviewPanel,
  TeamsPanel,
  VotersPanel,
  JudgesPanel,
  BonusPanel,
  SettingsPanel,
  ResultsPanel,
} from "./panels";

const TABS = [
  { key: "overview", label: "總覽" },
  { key: "teams", label: "隊伍" },
  { key: "voters", label: "投票券" },
  { key: "judges", label: "神秘客" },
  { key: "bonus", label: "加分" },
  { key: "results", label: "結果" },
  { key: "settings", label: "設定" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function AdminApp() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null); // null = 檢查中
  const [tab, setTab] = useState<TabKey>("overview");

  const reload = useCallback(async () => {
    const d = await adminApi.getData();
    setData(d);
  }, []);

  // 首次載入：嘗試取資料，401 → 需登入
  useEffect(() => {
    adminApi
      .getData()
      .then((d) => {
        setData(d);
        setAuthed(true);
      })
      .catch(() => setAuthed(false));
  }, []);

  if (authed === null)
    return (
      <div className="p-8 text-center text-sm text-neutral-500">載入中…</div>
    );

  if (!authed)
    return <LoginGate onSuccess={() => { setAuthed(true); reload(); }} />;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">管理後台</h1>
          <p className="text-xs text-neutral-500">{config.eventName}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/"
            className="rounded-lg bg-neutral-200 px-3 py-1.5 text-xs font-medium hover:bg-neutral-300 dark:bg-neutral-700"
          >
            首頁
          </a>
          <button
            onClick={reload}
            className="rounded-lg bg-neutral-200 px-3 py-1.5 text-xs font-medium hover:bg-neutral-300 dark:bg-neutral-700"
          >
            重新整理
          </button>
          <button
            onClick={async () => {
              await adminApi.logout();
              setAuthed(false);
              setData(null);
            }}
            className="rounded-lg bg-neutral-200 px-3 py-1.5 text-xs font-medium hover:bg-neutral-300 dark:bg-neutral-700"
          >
            登出
          </button>
        </div>
      </div>

      <nav className="mb-6 flex flex-wrap gap-1 border-b border-neutral-200 dark:border-neutral-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
              tab === t.key
                ? "border-brand text-brand"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {data && (
        <>
          {tab === "overview" && <OverviewPanel data={data} />}
          {tab === "teams" && <TeamsPanel data={data} reload={reload} />}
          {tab === "voters" && <VotersPanel data={data} reload={reload} />}
          {tab === "judges" && <JudgesPanel data={data} reload={reload} />}
          {tab === "bonus" && <BonusPanel data={data} reload={reload} />}
          {tab === "results" && <ResultsPanel data={data} />}
          {tab === "settings" && <SettingsPanel data={data} reload={reload} />}
        </>
      )}
      <VersionFooter />
    </main>
  );
}

function LoginGate({ onSuccess }: { onSuccess: () => void }) {
  const [secret, setSecret] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function login() {
    setBusy(true);
    setErr(null);
    try {
      await adminApi.login(secret);
      onSuccess();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 text-center text-xl font-bold">管理後台</h1>
      <p className="mb-6 text-center text-xs text-neutral-500">{config.eventName}</p>
      <div className="space-y-3">
        <input
          type="password"
          className="input"
          placeholder="請輸入管理密鑰"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
        />
        {err && <Notice tone="error">{err}</Notice>}
        <button
          onClick={login}
          disabled={busy || !secret}
          className="w-full rounded-lg bg-brand px-4 py-2.5 font-semibold text-white transition enabled:hover:bg-brand-dark disabled:opacity-40"
        >
          {busy ? "登入中…" : "登入"}
        </button>
      </div>
    </main>
  );
}
