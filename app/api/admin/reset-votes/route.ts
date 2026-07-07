import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { clearAllVotes } from "@/lib/store";

// 清空所有投票票數（公開票歸零、投票券重置、加分票分配清空；神秘客評分不動）
export async function POST(req: Request) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  const { clearedVotes } = await clearAllVotes();
  return NextResponse.json({ ok: true, clearedVotes });
}
