import type {
  Team,
  VoterToken,
  JudgeToken,
  BonusVoter,
  Settings,
  Standings,
} from "@/lib/types";

export interface DashboardData {
  teams: Team[];
  voterTokens: VoterToken[];
  judgeTokens: JudgeToken[];
  bonusVoters: BonusVoter[];
  settings: Settings;
  standings: Standings;
  baseUrl: string;
  stats: {
    teamCount: number;
    voterTotal: number;
    voterUsed: number;
    judgeCount: number;
    judgeSubmitted: number;
  };
}

async function parse(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `錯誤 ${res.status}`);
  return data;
}

export const adminApi = {
  async login(secret: string) {
    return parse(
      await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      }),
    );
  },
  async logout() {
    await fetch("/api/admin/session", { method: "DELETE" });
  },
  async getData(): Promise<DashboardData> {
    const res = await fetch("/api/admin/data", { cache: "no-store" });
    return parse(res);
  },
  async createTeam(input: { name: string; title: string; videoUrl: string }) {
    return parse(
      await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    );
  },
  async updateTeam(id: string, patch: Partial<Team>) {
    return parse(
      await fetch(`/api/admin/teams/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }),
    );
  },
  async deleteTeam(id: string) {
    return parse(await fetch(`/api/admin/teams/${id}`, { method: "DELETE" }));
  },
  async createVoterTokens(count: number, labelPrefix?: string) {
    return parse(
      await fetch("/api/admin/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "voter", count, labelPrefix }),
      }),
    );
  },
  async createJudge(name: string) {
    return parse(
      await fetch("/api/admin/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "judge", name }),
      }),
    );
  },
  async deleteVoterToken(token: string) {
    return parse(
      await fetch("/api/admin/tokens", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "voter", token }),
      }),
    );
  },
  async clearVoterTokens(scope: "unused" | "all") {
    return parse(
      await fetch("/api/admin/tokens", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "voter", scope }),
      }),
    );
  },
  async deleteJudge(token: string) {
    return parse(
      await fetch("/api/admin/tokens", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "judge", token }),
      }),
    );
  },
  async setJudgeScores(
    token: string,
    scores: Record<string, Record<string, number>>,
  ) {
    return parse(
      await fetch("/api/admin/judge-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, scores }),
      }),
    );
  },
  async setSettings(patch: Partial<Settings>) {
    return parse(
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }),
    );
  },
  async createBonus(name: string, budget: number) {
    return parse(
      await fetch("/api/admin/bonus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, budget }),
      }),
    );
  },
  async setBonusAllocations(id: string, allocations: Record<string, number>) {
    return parse(
      await fetch("/api/admin/bonus", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, allocations }),
      }),
    );
  },
  async deleteBonus(id: string) {
    return parse(
      await fetch("/api/admin/bonus", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }),
    );
  },
};
