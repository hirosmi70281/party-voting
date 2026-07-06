import { NextResponse } from "next/server";
import { setBonusAllocationsByToken } from "@/lib/store";

// 加分同仁自助投票：body { token, allocations: { teamId: 票數 } }
export async function POST(req: Request) {
  let body: { token?: string; allocations?: Record<string, number> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  }
  if (typeof body.token !== "string" || !body.token)
    return NextResponse.json({ error: "投票連結無效" }, { status: 404 });
  const result = await setBonusAllocationsByToken(
    body.token,
    body.allocations ?? {},
  );
  if (!result.ok)
    return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
