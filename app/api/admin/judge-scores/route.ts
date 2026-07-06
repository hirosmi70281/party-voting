import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { submitJudgeScores } from "@/lib/store";
import type { JudgeCriterionKey } from "@/lib/config";

// admin 代神秘客輸入分數
export async function POST(req: Request) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  let body: { token?: string; scores?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  }
  if (!body.token || typeof body.scores !== "object" || body.scores === null)
    return NextResponse.json({ error: "缺少資料" }, { status: 400 });
  const result = await submitJudgeScores(
    body.token,
    body.scores as Record<string, Record<JudgeCriterionKey, number>>,
  );
  if (!result.ok)
    return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
