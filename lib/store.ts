import { nanoid } from "nanoid";
import { config, JUDGE_MAX_TOTAL, type JudgeCriterionKey } from "./config";
import { getKv } from "./kv";
import { computeStandings } from "./scoring";
import { isValidDriveUrl } from "./drive";
import type {
  Team,
  VoterToken,
  JudgeToken,
  BonusVoter,
  Settings,
  Standings,
} from "./types";

// KV keys
const K_TEAMS = "teams"; // hash: teamId -> JSON(Team)
const K_VOTERS = "voters"; // hash: token  -> JSON(VoterToken)
const K_VOTER_USED = "voter_used"; // hash: token -> ts（原子 dedup）
const K_VOTES = "votes"; // hash: teamId -> 票數
const K_JUDGES = "judges"; // hash: token  -> JSON(JudgeToken)
const K_BONUS = "bonus"; // hash: id -> JSON(BonusVoter)
const K_SETTINGS = "settings"; // JSON(Settings)

const DEFAULT_SETTINGS: Settings = { votingOpen: false, resultsPublic: false };

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

// ── Teams ─────────────────────────────────────────────────
export async function listTeams(): Promise<Team[]> {
  const kv = await getKv();
  const all = await kv.hGetAllJSON<Team>(K_TEAMS);
  return Object.values(all).sort((a, b) => a.order - b.order);
}

export async function getTeam(id: string): Promise<Team | null> {
  const kv = await getKv();
  return kv.hGetJSON<Team>(K_TEAMS, id);
}

export async function createTeam(input: {
  name: string;
  title: string;
  videoUrl: string;
}): Promise<ActionResult<Team>> {
  const name = input.name.trim();
  const title = input.title.trim();
  const videoUrl = input.videoUrl.trim();
  if (!name) return fail("請填隊名", 400);
  if (!title) return fail("請填作品名（最＿＿的＿＿）", 400);
  if (videoUrl && !isValidDriveUrl(videoUrl))
    return fail("影片連結無法解析為 Google Drive 檔案", 400);

  const kv = await getKv();
  const teams = await listTeams();
  const order = teams.reduce((m, t) => Math.max(m, t.order), 0) + 1;
  const team: Team = {
    id: nanoid(8),
    name,
    title,
    videoUrl,
    order,
    createdAt: Date.now(),
  };
  await kv.hSetJSON(K_TEAMS, team.id, team);
  return ok(team);
}

export async function updateTeam(
  id: string,
  patch: Partial<Pick<Team, "name" | "title" | "videoUrl" | "order">>,
): Promise<ActionResult<Team>> {
  const kv = await getKv();
  const team = await getTeam(id);
  if (!team) return fail("找不到該隊伍", 404);
  if (patch.videoUrl !== undefined && patch.videoUrl && !isValidDriveUrl(patch.videoUrl))
    return fail("影片連結無法解析為 Google Drive 檔案", 400);
  const updated: Team = {
    ...team,
    ...("name" in patch ? { name: patch.name!.trim() } : {}),
    ...("title" in patch ? { title: patch.title!.trim() } : {}),
    ...("videoUrl" in patch ? { videoUrl: patch.videoUrl!.trim() } : {}),
    ...("order" in patch ? { order: patch.order! } : {}),
  };
  await kv.hSetJSON(K_TEAMS, id, updated);
  return ok(updated);
}

export async function deleteTeam(id: string): Promise<ActionResult> {
  const kv = await getKv();
  const team = await getTeam(id);
  if (!team) return fail("找不到該隊伍", 404);
  await kv.hDel(K_TEAMS, id);
  await kv.hDel(K_VOTES, id); // 清掉票數統計；散落在 voter/judge 紀錄裡的參照計分時會被忽略
  return ok(undefined);
}

// ── Voter tokens ──────────────────────────────────────────
export async function createVoterTokens(
  count: number,
  labelPrefix?: string,
): Promise<VoterToken[]> {
  const kv = await getKv();
  const n = Math.max(1, Math.min(1000, Math.floor(count)));
  const existing = (await listVoterTokens()).length;
  const created: VoterToken[] = [];
  for (let i = 0; i < n; i++) {
    const t: VoterToken = {
      token: nanoid(12),
      label: labelPrefix ? `${labelPrefix}-${existing + i + 1}` : "",
      createdAt: Date.now(),
      usedAt: null,
      votes: [],
    };
    await kv.hSetJSON(K_VOTERS, t.token, t);
    created.push(t);
  }
  return created;
}

export async function listVoterTokens(): Promise<VoterToken[]> {
  const kv = await getKv();
  const all = await kv.hGetAllJSON<VoterToken>(K_VOTERS);
  return Object.values(all).sort((a, b) => a.createdAt - b.createdAt);
}

export async function getVoterToken(token: string): Promise<VoterToken | null> {
  const kv = await getKv();
  return kv.hGetJSON<VoterToken>(K_VOTERS, token);
}

/**
 * 刪除（作廢）一張投票券。若已投過票，連同它投的票扣回並釋放 used 記錄，
 * 等於完整撤銷這張票的效果。
 */
export async function deleteVoterToken(token: string): Promise<ActionResult> {
  const kv = await getKv();
  const voter = await getVoterToken(token);
  if (!voter) return fail("找不到該投票券", 404);
  if (voter.usedAt) {
    for (const id of voter.votes) await kv.hIncrBy(K_VOTES, id, -1);
    await kv.hDel(K_VOTER_USED, token);
  }
  await kv.hDel(K_VOTERS, token);
  return ok(undefined);
}

/** 批次清除投票券：scope="unused" 只清未使用；"all" 全部清（含已投的，票數會扣回）。 */
export async function clearVoterTokens(
  scope: "unused" | "all",
): Promise<number> {
  const tokens = await listVoterTokens();
  let removed = 0;
  for (const t of tokens) {
    if (scope === "unused" && t.usedAt) continue;
    const r = await deleteVoterToken(t.token);
    if (r.ok) removed++;
  }
  return removed;
}

/**
 * 投票：驗證 → 原子標記已用 → 累加票數。
 * 規則：投票須開放、token 存在且未用、恰投 votesPerBallot 票、作品互異且存在。
 */
export async function castVote(
  token: string,
  teamIds: string[],
): Promise<ActionResult> {
  const kv = await getKv();

  const settings = await getSettings();
  if (!settings.votingOpen) return fail("投票尚未開放或已結束", 403);

  const voter = await getVoterToken(token);
  if (!voter) return fail("投票連結無效", 404);
  if (voter.usedAt) return fail("這張票已經投過了", 409);

  const unique = [...new Set(teamIds)];
  if (teamIds.length !== config.votesPerBallot)
    return fail(`每人須投 ${config.votesPerBallot} 票`, 400);
  if (unique.length !== config.votesPerBallot)
    return fail("兩票必須投給不同作品", 400);

  const teams = await listTeams();
  const validIds = new Set(teams.map((t) => t.id));
  if (!unique.every((id) => validIds.has(id)))
    return fail("投票對象不存在", 400);

  // 原子搶佔：只有第一個成功寫入的請求能繼續，防同一連結並發重複投票。
  const claimed = await kv.hSetNX(K_VOTER_USED, token, String(Date.now()));
  if (!claimed) return fail("這張票已經投過了", 409);

  for (const id of unique) await kv.hIncrBy(K_VOTES, id, 1);
  const updated: VoterToken = { ...voter, usedAt: Date.now(), votes: unique };
  await kv.hSetJSON(K_VOTERS, token, updated);
  return ok(undefined);
}

/**
 * 共用連結投票（不記名、無 token）：只驗證規則並累加票數。
 * 防同一裝置重複投票由呼叫端用 cookie 處理（軟性）。
 */
export async function castSharedVote(
  teamIds: string[],
): Promise<ActionResult> {
  const kv = await getKv();
  const settings = await getSettings();
  if (!settings.votingOpen) return fail("投票尚未開放或已結束", 403);

  const unique = [...new Set(teamIds)];
  if (teamIds.length !== config.votesPerBallot)
    return fail(`每人須投 ${config.votesPerBallot} 票`, 400);
  if (unique.length !== config.votesPerBallot)
    return fail("兩票必須投給不同作品", 400);

  const teams = await listTeams();
  const validIds = new Set(teams.map((t) => t.id));
  if (!unique.every((id) => validIds.has(id)))
    return fail("投票對象不存在", 400);

  for (const id of unique) await kv.hIncrBy(K_VOTES, id, 1);
  return ok(undefined);
}

// ── Judge tokens ──────────────────────────────────────────
export async function createJudgeToken(name: string): Promise<JudgeToken> {
  const kv = await getKv();
  const t: JudgeToken = {
    token: nanoid(12),
    name: name.trim() || `神秘客 ${(await listJudgeTokens()).length + 1}`,
    createdAt: Date.now(),
    submittedAt: null,
    scores: {},
  };
  await kv.hSetJSON(K_JUDGES, t.token, t);
  return t;
}

export async function listJudgeTokens(): Promise<JudgeToken[]> {
  const kv = await getKv();
  const all = await kv.hGetAllJSON<JudgeToken>(K_JUDGES);
  return Object.values(all).sort((a, b) => a.createdAt - b.createdAt);
}

export async function getJudgeToken(token: string): Promise<JudgeToken | null> {
  const kv = await getKv();
  return kv.hGetJSON<JudgeToken>(K_JUDGES, token);
}

const K_JUDGE_SHARE = "judge_share_token";

/** 神秘客共用評分連結的密鑰（不好猜）；首次呼叫時產生並保存。 */
export async function getJudgeShareToken(): Promise<string> {
  const kv = await getKv();
  let t = await kv.getJSON<string>(K_JUDGE_SHARE);
  if (!t) {
    t = nanoid(12);
    await kv.setJSON(K_JUDGE_SHARE, t);
  }
  return t;
}

/** 刪除一位神秘客（連同其評分，計分時自然不再計入）。 */
export async function deleteJudgeToken(token: string): Promise<ActionResult> {
  const kv = await getKv();
  const judge = await getJudgeToken(token);
  if (!judge) return fail("找不到該神秘客", 404);
  await kv.hDel(K_JUDGES, token);
  return ok(undefined);
}

function validateScores(
  scores: Record<string, Record<string, number>>,
): string | null {
  const max = config.judgeMaxPerCriterion;
  const keys = config.judgeCriteria.map((c) => c.key);
  for (const [, crit] of Object.entries(scores)) {
    for (const k of keys) {
      const v = crit[k];
      if (typeof v !== "number" || !Number.isFinite(v))
        return "分數必須為數字";
      if (v < 0 || v > max) return `每項分數需在 0–${max} 之間`;
    }
  }
  return null;
}

/** 神秘客送出評分（或 admin 代輸入）。允許重送覆蓋。 */
export async function submitJudgeScores(
  token: string,
  scores: Record<string, Record<JudgeCriterionKey, number>>,
): Promise<ActionResult> {
  const kv = await getKv();
  const judge = await getJudgeToken(token);
  if (!judge) return fail("評分連結無效", 404);
  const err = validateScores(scores);
  if (err) return fail(err, 400);
  const updated: JudgeToken = { ...judge, scores, submittedAt: Date.now() };
  await kv.hSetJSON(K_JUDGES, token, updated);
  return ok(undefined);
}

// ── Settings ──────────────────────────────────────────────
export async function getSettings(): Promise<Settings> {
  const kv = await getKv();
  const s = await kv.getJSON<Settings>(K_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...(s ?? {}) };
}

export async function setSettings(
  patch: Partial<Settings>,
): Promise<Settings> {
  const kv = await getKv();
  const merged = { ...(await getSettings()), ...patch };
  await kv.setJSON(K_SETTINGS, merged);
  return merged;
}

// ── Bonus voters（加分同仁：加權票，併入公開投票）─────────────
export async function listBonusVoters(): Promise<BonusVoter[]> {
  const kv = await getKv();
  const all = await kv.hGetAllJSON<BonusVoter>(K_BONUS);
  return Object.values(all).sort((a, b) => a.createdAt - b.createdAt);
}

export async function createBonusVoter(
  name: string,
  budget: number,
): Promise<ActionResult<BonusVoter>> {
  const nm = name.trim();
  if (!nm) return fail("請填加分同仁名稱", 400);
  const b = Math.floor(Number(budget));
  if (!Number.isFinite(b) || b < 1) return fail("票數需為 1 以上的整數", 400);
  const kv = await getKv();
  const bv: BonusVoter = {
    id: nanoid(8),
    name: nm,
    budget: b,
    allocations: {},
    createdAt: Date.now(),
  };
  await kv.hSetJSON(K_BONUS, bv.id, bv);
  return ok(bv);
}

/** 更新某位加分同仁把票分配給哪些隊（總和不得超過其 budget）。 */
export async function setBonusAllocations(
  id: string,
  allocations: Record<string, number>,
): Promise<ActionResult<BonusVoter>> {
  const kv = await getKv();
  const bv = await kv.hGetJSON<BonusVoter>(K_BONUS, id);
  if (!bv) return fail("找不到該加分同仁", 404);
  const clean: Record<string, number> = {};
  let sum = 0;
  for (const [teamId, v] of Object.entries(allocations)) {
    const n = Math.max(0, Math.floor(Number(v) || 0));
    if (n > 0) {
      clean[teamId] = n;
      sum += n;
    }
  }
  if (sum > bv.budget)
    return fail(`分配票數（${sum}）超過上限 ${bv.budget}`, 400);
  const updated: BonusVoter = { ...bv, allocations: clean };
  await kv.hSetJSON(K_BONUS, id, updated);
  return ok(updated);
}

export async function deleteBonusVoter(id: string): Promise<ActionResult> {
  const kv = await getKv();
  const bv = await kv.hGetJSON<BonusVoter>(K_BONUS, id);
  if (!bv) return fail("找不到該加分同仁", 404);
  await kv.hDel(K_BONUS, id);
  return ok(undefined);
}

/** 彙總每隊獲得的加分票（併入公開投票）。 */
export async function bonusVotesByTeam(): Promise<Record<string, number>> {
  const voters = await listBonusVoters();
  const totals: Record<string, number> = {};
  for (const v of voters) {
    for (const [teamId, n] of Object.entries(v.allocations)) {
      totals[teamId] = (totals[teamId] ?? 0) + n;
    }
  }
  return totals;
}

// ── Results ───────────────────────────────────────────────
/** 由所有神秘客紀錄彙總每隊原始總分（上限 JUDGE_MAX_TOTAL）。 */
export async function judgeTotalsByTeam(): Promise<Record<string, number>> {
  const judges = await listJudgeTokens();
  const totals: Record<string, number> = {};
  for (const j of judges) {
    for (const [teamId, crit] of Object.entries(j.scores)) {
      const sum = config.judgeCriteria.reduce(
        (acc, c) => acc + (crit[c.key] ?? 0),
        0,
      );
      totals[teamId] = (totals[teamId] ?? 0) + sum;
    }
  }
  return totals;
}

export async function getStandings(): Promise<Standings> {
  const kv = await getKv();
  const [teams, voteCounts, judgeTotals, bonus] = await Promise.all([
    listTeams(),
    kv.hGetAllNumbers(K_VOTES),
    judgeTotalsByTeam(),
    bonusVotesByTeam(),
  ]);
  // 加分同仁的票併入公開投票（隊伍票數與總有效票數皆納入）。
  const merged: Record<string, number> = { ...voteCounts };
  for (const [teamId, n] of Object.entries(bonus))
    merged[teamId] = (merged[teamId] ?? 0) + n;
  return computeStandings(teams, merged, judgeTotals);
}

export { JUDGE_MAX_TOTAL };

// ── helpers ───────────────────────────────────────────────
function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}
function fail(error: string, status: number): ActionResult<never> {
  return { ok: false, error, status };
}
