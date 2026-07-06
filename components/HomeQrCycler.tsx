"use client";

import { useState } from "react";
import Link from "next/link";
import { QrImg } from "./admin/QrImg";

export interface QrEntry {
  label: string; // 顯示名稱，例：一般同仁投票 / TOP1（8 票）
  hint: string; // 底下小字說明
  url: string; // QR 指向的網址
}

export function HomeQrCycler({ entries }: { entries: QrEntry[] }) {
  const [i, setI] = useState(0);
  const cur = entries[i] ?? entries[0];
  const hasMore = entries.length > 1;

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-brand/30 bg-brand/5 p-6 text-center">
      <p className="text-lg font-semibold">📱 {cur.label}</p>
      <div className="rounded-xl bg-white p-3">
        <QrImg url={cur.url} size={220} />
      </div>
      <Link
        href={cur.url}
        className="w-full max-w-xs rounded-xl bg-brand px-4 py-3 font-semibold text-white transition hover:bg-brand-dark"
      >
        點我開始投票 →
      </Link>
      <p className="text-xs text-neutral-500">{cur.hint}</p>

      {hasMore && (
        <button
          onClick={() => setI((n) => (n + 1) % entries.length)}
          className="mt-1 rounded-lg border border-brand/40 px-4 py-2 text-sm font-medium text-brand transition hover:bg-brand/10"
        >
          切換下一個 QR（{i + 1}/{entries.length}）→
        </button>
      )}
    </div>
  );
}
