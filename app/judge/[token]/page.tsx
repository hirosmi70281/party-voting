import { config } from "@/lib/config";
import {
  listTeams,
  getJudgeShareToken,
  listJudgeSubmissions,
} from "@/lib/store";
import { JudgeForm } from "@/components/JudgeForm";
import { Shell, Notice } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function JudgePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const shareToken = await getJudgeShareToken();

  if (token !== shareToken) {
    return (
      <Shell title={config.eventName}>
        <Notice tone="error" title="評分連結無效">
          這個神秘客評分連結不存在，請向主辦單位確認。
        </Notice>
      </Shell>
    );
  }

  const [teams, subs] = await Promise.all([
    listTeams(),
    listJudgeSubmissions(),
  ]);

  if (teams.length === 0) {
    return (
      <Shell title={config.eventName}>
        <Notice tone="warn" title="尚無參賽作品">
          目前還沒有可評分的作品，請稍後再回來。
        </Notice>
      </Shell>
    );
  }

  if (subs.length >= config.judgeCount) {
    return (
      <Shell title="神秘客評分" subtitle={config.eventName}>
        <Notice tone="success" title="評分已額滿 ⭐">
          已收到 {config.judgeCount} 位神秘客的評分，感謝參與！
        </Notice>
      </Shell>
    );
  }

  return (
    <Shell title="神秘客評分" subtitle={config.eventName}>
      <JudgeForm token={shareToken} teams={teams} />
    </Shell>
  );
}
