import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { addJudgeSubmission, clearJudgeSubmissions } from "@/lib/store";
import type { JudgeCriterionKey } from "@/lib/config";

// admin 代神秘客輸入一份評分
export async function POST(req: Request) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  let body: { scores?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  }
  if (typeof body.scores !== "object" || body.scores === null)
    return NextResponse.json({ error: "缺少評分資料" }, { status: 400 });
  const result = await addJudgeSubmission(
    body.scores as Record<string, Record<JudgeCriterionKey, number>>,
    "admin",
  );
  if (!result.ok)
    return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, count: result.data.count });
}

// 清除所有神秘客評分（重來）
export async function DELETE(req: Request) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  await clearJudgeSubmissions();
  return NextResponse.json({ ok: true });
}
