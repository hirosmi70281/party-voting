import Link from "next/link";
import { config } from "@/lib/config";
import { getSettings } from "@/lib/store";
import { Shell, Notice } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Home() {
  const settings = await getSettings();
  return (
    <Shell title={config.eventName} subtitle={config.tagline}>
      <div className="space-y-4">
        <Notice tone="info" title="怎麼投票？">
          請使用主辦單位發給你的<b>專屬投票連結</b>（或掃 QR code）進入投票頁。
          每人 2 票，投給不同的兩支 Vlog。
        </Notice>

        {settings.resultsPublic && (
          <Link
            href="/results"
            className="block rounded-xl bg-brand px-4 py-3 text-center font-semibold text-white transition hover:bg-brand-dark"
          >
            查看即時排行榜 →
          </Link>
        )}

        <p className="text-center text-xs text-neutral-400">
          管理人員請至 <Link href="/admin" className="underline">/admin</Link>
        </p>
      </div>
    </Shell>
  );
}
