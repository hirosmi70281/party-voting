import { NextResponse } from "next/server";
import { castVote, castSharedVote, getSettings } from "@/lib/store";
import { BALLOT_COOKIE } from "@/lib/config";

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

  // 具名 token（一人一券）流程
  if (token) {
    const result = await castVote(token, teamIds);
    if (!result.ok)
      return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true });
  }

  // 共用連結（不記名）流程：以 cookie 軟性防同一裝置重複投票。
  // 測試模式下跳過此限制（同一裝置可重複投），方便測試。
  const settings = await getSettings();
  if (!settings.testMode) {
    const already = req.headers
      .get("cookie")
      ?.split(";")
      .some((c) => c.trim().startsWith(`${BALLOT_COOKIE}=`));
    if (already)
      return NextResponse.json(
        { error: "這台裝置已經投過票了，感謝參與！" },
        { status: 409 },
      );
  }

  const result = await castSharedVote(teamIds);
  if (!result.ok)
    return NextResponse.json({ error: result.error }, { status: result.status });

  const res = NextResponse.json({ ok: true });
  if (!settings.testMode) {
    res.cookies.set(BALLOT_COOKIE, String(Date.now()), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 天（活動期間）
    });
  }
  return res;
}
