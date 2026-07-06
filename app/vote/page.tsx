import { cookies } from "next/headers";
import Link from "next/link";
import { config, BALLOT_COOKIE } from "@/lib/config";
import { listTeams, getSettings } from "@/lib/store";
import { VoteForm } from "@/components/VoteForm";
import { Shell, Notice } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SharedVotePage() {
  const [teams, settings, store] = await Promise.all([
    listTeams(),
    getSettings(),
    cookies(),
  ]);

  if (!settings.votingOpen) {
    return (
      <Shell title={config.eventName}>
        <Notice tone="warn" title="投票尚未開放">
          投票目前未開放或已結束，請留意主辦單位公告的投票時間。
        </Notice>
        <HomeLink />
      </Shell>
    );
  }

  if (store.get(BALLOT_COOKIE)) {
    return (
      <Shell title={config.eventName}>
        <Notice tone="success" title="你已經投過票囉 🎉">
          這台裝置已完成投票，感謝參與！
        </Notice>
        <HomeLink />
      </Shell>
    );
  }

  if (teams.length < config.votesPerBallot) {
    return (
      <Shell title={config.eventName}>
        <Notice tone="warn" title="尚未就緒">
          參賽作品還在準備中，請稍後再回來投票。
        </Notice>
        <HomeLink />
      </Shell>
    );
  }

  return (
    <Shell title={config.eventName} subtitle={config.tagline}>
      <VoteForm teams={teams} />
    </Shell>
  );
}

function HomeLink() {
  return (
    <div className="mt-6 text-center">
      <Link href="/" className="text-sm text-neutral-500 underline">
        ← 返回首頁
      </Link>
    </div>
  );
}
