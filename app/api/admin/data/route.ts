import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { resolveBaseUrl } from "@/lib/base-url";
import {
  listTeams,
  listVoterTokens,
  listJudgeTokens,
  listBonusVoters,
  getSettings,
  getStandings,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: "未授權" }, { status: 401 });

  const [
    teams,
    voterTokens,
    judgeTokens,
    bonusVoters,
    settings,
    standings,
    baseUrl,
  ] = await Promise.all([
    listTeams(),
    listVoterTokens(),
    listJudgeTokens(),
    listBonusVoters(),
    getSettings(),
    getStandings(),
    resolveBaseUrl(),
  ]);

  const usedCount = voterTokens.filter((t) => t.usedAt).length;

  return NextResponse.json({
    teams,
    voterTokens,
    judgeTokens,
    bonusVoters,
    settings,
    standings,
    baseUrl,
    stats: {
      teamCount: teams.length,
      voterTotal: voterTokens.length,
      voterUsed: usedCount,
      judgeCount: judgeTokens.length,
      judgeSubmitted: judgeTokens.filter((j) => j.submittedAt).length,
    },
  });
}
