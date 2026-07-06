import Link from "next/link";
import { config } from "@/lib/config";
import { getSettings, listBonusVoters } from "@/lib/store";
import { resolveBaseUrl } from "@/lib/base-url";
import { Shell, Notice } from "@/components/ui";
import { HomeQrCycler, type QrEntry } from "@/components/HomeQrCycler";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [settings, baseUrl, bonusVoters] = await Promise.all([
    getSettings(),
    resolveBaseUrl(),
    listBonusVoters(),
  ]);

  // QR 循環：一般同仁 →（各）加分同仁 → 回一般同仁
  const entries: QrEntry[] = [
    {
      label: "一般同仁投票",
      hint: "每人 2 票，投給不同的兩支 Vlog",
      url: `${baseUrl}/vote`,
    },
    ...bonusVoters.map((b) => ({
      label: `${b.name}（${b.budget} 票）`,
      hint: `${b.name} 專屬：把 ${b.budget} 票分給各作品`,
      url: `${baseUrl}/bonus/${b.token}`,
    })),
  ];

  return (
    <Shell title={config.eventName} subtitle={config.tagline}>
      <div className="space-y-6">
        {settings.votingOpen ? (
          <HomeQrCycler entries={entries} />
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
