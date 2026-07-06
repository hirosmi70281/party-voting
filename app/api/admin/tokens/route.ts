import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { createVoterTokens, createJudgeToken } from "@/lib/store";

export async function POST(req: Request) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  let body: {
    kind?: "voter" | "judge";
    count?: number;
    labelPrefix?: string;
    name?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  }

  if (body.kind === "judge") {
    const judge = await createJudgeToken(body.name ?? "");
    return NextResponse.json({ ok: true, judge });
  }

  const count = Number(body.count ?? 0);
  if (!count || count < 1)
    return NextResponse.json({ error: "請輸入要產生的張數" }, { status: 400 });
  const tokens = await createVoterTokens(count, body.labelPrefix);
  return NextResponse.json({ ok: true, tokens });
}
