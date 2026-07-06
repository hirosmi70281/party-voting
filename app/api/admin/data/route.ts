import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { resolveBaseUrl } from "@/lib/base-url";
import { config } from "@/lib/config";
import {
  listTeams,
  listVoterTokens,
  listJudgeSubmissions,
  listBonusVoters,
  getJudgeShareToken,
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
    judgeSubmissions,
    bonusVoters,
    judgeShareToken,
    settings,
    standings,
    baseUrl,
  ] = await Promise.all([
    listTeams(),
    listVoterTokens(),
    listJudgeSubmissions(),
    listBonusVoters(),
    getJudgeShareToken(),
    getSettings(),
    getStandings(),
    resolveBaseUrl(),
  ]);

  const usedCount = voterTokens.filter((t) => t.usedAt).length;

  return NextResponse.json({
    teams,
    voterTokens,
    bonusVoters,
    judgeShareToken,
    judgeSubmissionCount: judgeSubmissions.length,
    judgeCount: config.judgeCount,
    settings,
    standings,
    baseUrl,
    stats: {
      teamCount: teams.length,
      voterTotal: voterTokens.length,
      voterUsed: usedCount,
      judgeCount: config.judgeCount,
      judgeSubmitted: judgeSubmissions.length,
    },
  });
}
