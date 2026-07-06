export const config = {
  eventName: process.env.NEXT_PUBLIC_EVENT_NAME ?? "2026 夏季夜｜Vlog 團戰",
  tagline:
    process.env.NEXT_PUBLIC_EVENT_TAGLINE ?? "投下你心中最強的兩支 Vlog",
  // 留空 ⇒ resolveBaseUrl() 會從 request host 推導（方便區網測試）。
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL ?? "",
  kvProvider: (process.env.KV_PROVIDER ?? "memory") as "memory" | "upstash",
  // 管理密鑰；留空則 /admin 全關（fail-closed）。
  adminSecret: process.env.ADMIN_SECRET ?? "",

  // ── 活動規則（來自 reference/ 辦法）──────────────────
  votesPerBallot: 2, // 每位同仁 2 票，須投不同作品
  publicWeight: 70, // 公開投票佔比
  judgeWeight: 30, // 神秘客佔比
  judgeCount: 2, // 神秘客人數
  // 神秘客 5 個評分項目，每項滿分 10 → 每位神秘客每隊上限 50
  judgeCriteria: [
    { key: "creativity", label: "創意表現" },
    { key: "shooting", label: "拍攝技巧" },
    { key: "editing", label: "剪輯流暢度" },
    { key: "story", label: "劇情完整性" },
    { key: "impact", label: "整體感染力" },
  ] as const,
  judgeMaxPerCriterion: 10,
};

export type JudgeCriterionKey = (typeof config.judgeCriteria)[number]["key"];

// 每位神秘客每隊滿分 = 項目數 × 每項上限
export const JUDGE_MAX_PER_JUDGE =
  config.judgeCriteria.length * config.judgeMaxPerCriterion;
// 全部神秘客每隊合計滿分
export const JUDGE_MAX_TOTAL = JUDGE_MAX_PER_JUDGE * config.judgeCount;
