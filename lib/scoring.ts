import { config, JUDGE_MAX_TOTAL } from "./config";
import type { Team, TeamResult, Standings } from "./types";

/** 四捨五入到小數 1 位（與辦法範例一致：21、26.7）。 */
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * 依辦法計算各隊成績與排名（純函式，方便測試）。
 *
 * 公開投票得分 =（該隊票數 ÷ 全部有效票數）× 70   （0 票或無票時為 0）
 * 神秘客得分   =（兩位神秘客該隊總分 ÷ 100）× 30
 * 最終成績     = 公開投票得分 + 神秘客得分
 * 排名：最終成績高者優先；同分則神秘客得分高者優先。
 */
export function computeStandings(
  teams: Team[],
  voteCounts: Record<string, number>,
  judgeTotals: Record<string, number>,
): Standings {
  const totalValidVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);

  const results: TeamResult[] = teams.map((team) => {
    const voteCount = voteCounts[team.id] ?? 0;
    const judgeTotal = judgeTotals[team.id] ?? 0;
    const publicScore =
      totalValidVotes > 0
        ? (voteCount / totalValidVotes) * config.publicWeight
        : 0;
    const judgeScore = (judgeTotal / JUDGE_MAX_TOTAL) * config.judgeWeight;
    return {
      team,
      voteCount,
      publicScore: round1(publicScore),
      judgeTotal,
      judgeScore: round1(judgeScore),
      finalScore: round1(publicScore + judgeScore),
      rank: 0,
    };
  });

  // 排序：finalScore desc，平手時 judgeScore desc（神秘客高者優先）。
  results.sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    if (b.judgeScore !== a.judgeScore) return b.judgeScore - a.judgeScore;
    return a.team.order - b.team.order;
  });
  results.forEach((r, i) => (r.rank = i + 1));

  return {
    results,
    totalValidVotes,
    ballotsCast: totalValidVotes / config.votesPerBallot,
  };
}
