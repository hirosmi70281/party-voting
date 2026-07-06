import Link from "next/link";
import { config } from "@/lib/config";
import {
  getJudgeToken,
  listJudgeTokens,
  listTeams,
  getJudgeShareToken,
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

  // 共用連結：先讓對方選「我是哪位神秘客」
  if (token === shareToken) {
    const judges = await listJudgeTokens();
    return (
      <Shell title="神秘客評分" subtitle={config.eventName}>
        {judges.length === 0 ? (
          <Notice tone="warn" title="尚未建立神秘客">
            請主辦單位先於後台建立神秘客。
          </Notice>
        ) : (
          <div className="space-y-3">
            <Notice tone="info">請選擇你是哪一位神秘客，進入後評分。</Notice>
            {judges.map((j) => (
              <Link
                key={j.token}
                href={`/judge/${j.token}`}
                className="flex items-center justify-between rounded-xl border-2 border-neutral-200 px-4 py-3 font-medium transition hover:border-brand/60 dark:border-neutral-800"
              >
                <span>{j.name}</span>
                <span className="text-xs text-neutral-500">
                  {j.submittedAt ? "● 已評分（可重新調整）" : "○ 尚未評分"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Shell>
    );
  }

  // 具名連結：直接評分
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
      <JudgeForm
        token={token}
        judgeName={judge.name}
        teams={teams}
        initial={judge.scores}
      />
    </Shell>
  );
}
