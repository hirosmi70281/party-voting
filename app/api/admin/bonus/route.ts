import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import {
  createBonusVoter,
  setBonusAllocations,
  deleteBonusVoter,
} from "@/lib/store";

// 新增加分同仁
export async function POST(req: Request) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  let body: { name?: string; budget?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  }
  const r = await createBonusVoter(body.name ?? "", Number(body.budget));
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true, bonus: r.data });
}

// 更新某位加分同仁的分票
export async function PATCH(req: Request) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  let body: { id?: string; allocations?: Record<string, number> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  const r = await setBonusAllocations(body.id, body.allocations ?? {});
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true, bonus: r.data });
}

// 刪除加分同仁
export async function DELETE(req: Request) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  const r = await deleteBonusVoter(body.id);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true });
}
