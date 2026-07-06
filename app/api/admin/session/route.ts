import { NextResponse } from "next/server";
import { checkAdminSecret, ADMIN_COOKIE } from "@/lib/admin";
import { config } from "@/lib/config";

export async function POST(req: Request) {
  let body: { secret?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  }
  if (!config.adminSecret)
    return NextResponse.json(
      { error: "後台尚未設定 ADMIN_SECRET" },
      { status: 503 },
    );
  if (!checkAdminSecret(body.secret ?? ""))
    return NextResponse.json({ error: "密鑰錯誤" }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, config.adminSecret, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 小時
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
