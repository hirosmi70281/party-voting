import { NextResponse } from "next/server";
import { castVote } from "@/lib/store";

export async function POST(req: Request) {
  let body: { token?: string; teamIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  }
  const token = typeof body.token === "string" ? body.token : "";
  const teamIds = Array.isArray(body.teamIds)
    ? body.teamIds.filter((x): x is string => typeof x === "string")
    : [];
  if (!token) return NextResponse.json({ error: "缺少投票連結" }, { status: 400 });

  const result = await castVote(token, teamIds);
  if (!result.ok)
    return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
