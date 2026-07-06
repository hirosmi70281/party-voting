import { config } from "@/lib/config";
import { getBonusVoterByToken, listTeams, getSettings } from "@/lib/store";
import { BonusVoteForm } from "@/components/BonusVoteForm";
import { Shell, Notice } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function BonusVotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [bonus, teams, settings] = await Promise.all([
    getBonusVoterByToken(token),
    listTeams(),
    getSettings(),
  ]);

  if (!bonus) {
    return (
      <Shell title={config.eventName}>
        <Notice tone="error" title="投票連結無效">
          這個加分投票連結不存在，請向主辦單位確認。
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

  if (teams.length === 0) {
    return (
      <Shell title={config.eventName}>
        <Notice tone="warn" title="尚無參賽作品">
          參賽作品還在準備中，請稍後再回來。
        </Notice>
      </Shell>
    );
  }

  return (
    <Shell title={`加分投票 — ${bonus.name}`} subtitle={config.eventName}>
      <BonusVoteForm
        token={token}
        name={bonus.name}
        budget={bonus.budget}
        teams={teams}
        initial={bonus.allocations}
      />
    </Shell>
  );
}
