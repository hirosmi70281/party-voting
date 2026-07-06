import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { createTeam } from "@/lib/store";

export async function POST(req: Request) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  let body: { name?: string; title?: string; videoUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  }
  const result = await createTeam({
    name: body.name ?? "",
    title: body.title ?? "",
    videoUrl: body.videoUrl ?? "",
  });
  if (!result.ok)
    return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, team: result.data });
}
