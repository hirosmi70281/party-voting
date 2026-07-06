import { headers } from "next/headers";
import { config } from "./config";

/**
 * 解析對外 base URL（產生 QR / 投票連結用）。
 * 1. NEXT_PUBLIC_BASE_URL 有設就用它（production）。
 * 2. 否則從 request header 推導 — localhost 與區網（192.168.x.y）皆可。
 */
export async function resolveBaseUrl(): Promise<string> {
  if (config.baseUrl) return config.baseUrl.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "http://localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
