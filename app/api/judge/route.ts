import { NextResponse } from "next/server";
import { submitJudgeScores } from "@/lib/store";
import type { JudgeCriterionKey } from "@/lib/config";

export async function POST(req: Request) {
  let body: { token?: string; scores?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  }
  const token = typeof body.token === "string" ? body.token : "";
  if (!token) return NextResponse.json({ error: "缺少評分連結" }, { status: 400 });
  if (typeof body.scores !== "object" || body.scores === null)
    return NextResponse.json({ error: "缺少評分資料" }, { status: 400 });

  const scores = body.scores as Record<string, Record<JudgeCriterionKey, number>>;
  const result = await submitJudgeScores(token, scores);
  if (!result.ok)
    return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
