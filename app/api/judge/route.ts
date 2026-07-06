import { NextResponse } from "next/server";
import { addJudgeSubmission, getJudgeShareToken } from "@/lib/store";
import type { JudgeCriterionKey } from "@/lib/config";

// 神秘客不記名共用連結送出評分：body { token: shareToken, scores }
export async function POST(req: Request) {
  let body: { token?: string; scores?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  }
  const shareToken = await getJudgeShareToken();
  if (typeof body.token !== "string" || body.token !== shareToken)
    return NextResponse.json({ error: "評分連結無效" }, { status: 404 });
  if (typeof body.scores !== "object" || body.scores === null)
    return NextResponse.json({ error: "缺少評分資料" }, { status: 400 });

  const scores = body.scores as Record<string, Record<JudgeCriterionKey, number>>;
  const result = await addJudgeSubmission(scores, "link");
  if (!result.ok)
    return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, count: result.data.count });
}
