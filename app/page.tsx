import Link from "next/link";
import { config } from "@/lib/config";
import { getSettings } from "@/lib/store";
import { resolveBaseUrl } from "@/lib/base-url";
import { Shell, Notice } from "@/components/ui";
import { QrImg } from "@/components/admin/QrImg";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [settings, baseUrl] = await Promise.all([
    getSettings(),
    resolveBaseUrl(),
  ]);
  const voteUrl = `${baseUrl}/vote`;

  return (
    <Shell title={config.eventName} subtitle={config.tagline}>
      <div className="space-y-6">
        {settings.votingOpen ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-brand/30 bg-brand/5 p-6 text-center">
            <p className="text-lg font-semibold">📱 掃描 QR code 開始投票</p>
            <div className="rounded-xl bg-white p-3">
              <QrImg url={voteUrl} size={220} />
            </div>
            <Link
              href="/vote"
              className="w-full max-w-xs rounded-xl bg-brand px-4 py-3 font-semibold text-white transition hover:bg-brand-dark"
            >
              點我開始投票 →
            </Link>
            <p className="text-xs text-neutral-500">
              每人 2 票，投給不同的兩支 Vlog
            </p>
          </div>
        ) : (
          <Notice tone="warn" title="投票尚未開放">
            投票時間尚未開始或已結束，敬請留意主辦單位公告。
          </Notice>
        )}

        {settings.resultsPublic && (
          <Link
            href="/results"
            className="block rounded-xl border border-neutral-200 px-4 py-3 text-center font-medium transition hover:border-brand/60 dark:border-neutral-800"
          >
            查看即時排行榜 →
          </Link>
        )}

        <p className="text-center text-xs text-neutral-400">
          管理人員請至{" "}
          <Link href="/admin" className="underline">
            /admin
          </Link>
        </p>
      </div>
    </Shell>
  );
}
