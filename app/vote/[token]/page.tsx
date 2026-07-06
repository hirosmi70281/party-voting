import { config } from "@/lib/config";
import { getVoterToken, listTeams, getSettings } from "@/lib/store";
import { VoteForm } from "@/components/VoteForm";
import { Shell, Notice } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function VotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [voter, teams, settings] = await Promise.all([
    getVoterToken(token),
    listTeams(),
    getSettings(),
  ]);

  if (!voter) {
    return (
      <Shell title={config.eventName}>
        <Notice tone="error" title="投票連結無效">
          這個投票連結不存在，請確認網址是否正確，或向主辦單位索取新的連結。
        </Notice>
      </Shell>
    );
  }

  if (voter.usedAt) {
    return (
      <Shell title={config.eventName}>
        <Notice tone="success" title="你已經投過票囉 🎉">
          這張票已於稍早完成投票，感謝參與！每人僅能投一次。
        </Notice>
      </Shell>
    );
  }

  if (!settings.votingOpen) {
    return (
      <Shell title={config.eventName}>
        <Notice tone="warn" title="投票尚未開放">
          投票目前未開放或已結束，請留意主辦單位公告的投票時間。
        </Notice>
      </Shell>
    );
  }

  if (teams.length < config.votesPerBallot) {
    return (
      <Shell title={config.eventName}>
        <Notice tone="warn" title="尚未就緒">
          參賽作品還在準備中，請稍後再回來投票。
        </Notice>
      </Shell>
    );
  }

  return (
    <Shell title={config.eventName} subtitle={config.tagline}>
      <VoteForm token={token} teams={teams} />
    </Shell>
  );
}
