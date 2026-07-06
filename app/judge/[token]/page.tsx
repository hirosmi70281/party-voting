import { config } from "@/lib/config";
import { getJudgeToken, listTeams } from "@/lib/store";
import { JudgeForm } from "@/components/JudgeForm";
import { Shell, Notice } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function JudgePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [judge, teams] = await Promise.all([getJudgeToken(token), listTeams()]);

  if (!judge) {
    return (
      <Shell title={config.eventName}>
        <Notice tone="error" title="評分連結無效">
          這個神秘客評分連結不存在，請向主辦單位確認。
        </Notice>
      </Shell>
    );
  }

  if (teams.length === 0) {
    return (
      <Shell title={config.eventName}>
        <Notice tone="warn" title="尚無參賽作品">
          目前還沒有可評分的作品，請稍後再回來。
        </Notice>
      </Shell>
    );
  }

  return (
    <Shell title={`神秘客評分 — ${judge.name}`} subtitle={config.eventName}>
      <JudgeForm token={token} judgeName={judge.name} teams={teams} initial={judge.scores} />
    </Shell>
  );
}
