import type { JudgeCriterionKey } from "./config";

/** 參賽隊伍 */
export interface Team {
  id: string;
  name: string; // 隊名，例：白富美小隊
  title: string; // 作品名，例：最爆走的廈門行軍
  videoUrl: string; // Google Drive 分享連結
  order: number; // 顯示排序
  createdAt: number;
}

/** 同仁投票憑證（一次性） */
export interface VoterToken {
  token: string;
  label: string; // 備註（選填），例：行政部-01
  createdAt: number;
  usedAt: number | null; // 已投票時間戳；null = 未使用
  votes: string[]; // 投給的 team id（長度應為 2，且互異）
}

/** 神秘客評分（不記名）：一份提交 = 一位神秘客的評分。 */
export interface JudgeSubmission {
  scores: Record<string, Record<JudgeCriterionKey, number>>; // teamId -> 各項分數
  createdAt: number;
  source: "link" | "admin"; // 由共用連結送出，或管理者代輸入
}

/** 加分同仁（加權投票者）：有固定票數額度，可分散投給各隊，併入公開投票。 */
export interface BonusVoter {
  id: string;
  name: string; // 例：TOP1
  budget: number; // 可投票數上限，例：8
  allocations: Record<string, number>; // teamId -> 分配票數
  createdAt: number;
}

/** 活動設定 */
export interface Settings {
  votingOpen: boolean; // 公開投票是否開放
  resultsPublic: boolean; // /results 是否對外公開
}

/** 單隊計分結果 */
export interface TeamResult {
  team: Team;
  voteCount: number; // 得票數
  publicScore: number; // 公開投票得分（0–70）
  judgeTotal: number; // 神秘客原始總分（0–JUDGE_MAX_TOTAL）
  judgeScore: number; // 神秘客得分（0–30）
  finalScore: number; // 最終成績（0–100）
  rank: number; // 名次（1 起）
}

/** 整體結果 */
export interface Standings {
  results: TeamResult[];
  totalValidVotes: number; // 全部有效票數（分母）
  ballotsCast: number; // 已投票人數
}
