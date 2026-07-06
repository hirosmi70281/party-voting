import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import {
  createVoterTokens,
  createJudgeToken,
  deleteVoterToken,
  deleteJudgeToken,
  clearVoterTokens,
} from "@/lib/store";

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

// 刪除／作廢 token。voter：{kind:'voter', token} 刪單張；{kind:'voter', scope:'unused'|'all'} 批次清。
// judge：{kind:'judge', token} 刪一位神秘客。
export async function DELETE(req: Request) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  let body: {
    kind?: "voter" | "judge";
    token?: string;
    scope?: "unused" | "all";
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  }

  if (body.kind === "judge") {
    if (!body.token)
      return NextResponse.json({ error: "缺少 token" }, { status: 400 });
    const r = await deleteJudgeToken(body.token);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    return NextResponse.json({ ok: true });
  }

  if (body.scope) {
    const removed = await clearVoterTokens(body.scope);
    return NextResponse.json({ ok: true, removed });
  }
  if (!body.token)
    return NextResponse.json({ error: "缺少 token" }, { status: 400 });
  const r = await deleteVoterToken(body.token);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true });
}
