import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { setSettings } from "@/lib/store";

export async function POST(req: Request) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  let body: { votingOpen?: boolean; resultsPublic?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  }
  const patch: { votingOpen?: boolean; resultsPublic?: boolean } = {};
  if (typeof body.votingOpen === "boolean") patch.votingOpen = body.votingOpen;
  if (typeof body.resultsPublic === "boolean")
    patch.resultsPublic = body.resultsPublic;
  const settings = await setSettings(patch);
  return NextResponse.json({ ok: true, settings });
}
