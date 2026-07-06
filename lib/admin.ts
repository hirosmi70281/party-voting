import { cookies } from "next/headers";
import { config } from "./config";

export const ADMIN_COOKIE = "party_admin";

/**
 * 檢查請求是否具備 admin 權限。接受三種來源：
 *   - Authorization: Bearer <ADMIN_SECRET>
 *   - ?token=<ADMIN_SECRET>（一次性瀏覽器點擊）
 *   - cookie party_admin=<ADMIN_SECRET>（後台登入後）
 *
 * ADMIN_SECRET 未設定時一律 false（fail-closed）。
 */
export function isAdminRequest(req: Request): boolean {
  if (!config.adminSecret) return false;
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const queryToken = new URL(req.url).searchParams.get("token");
  const cookie = req.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${ADMIN_COOKIE}=`))
    ?.slice(ADMIN_COOKIE.length + 1);
  const presented = bearer ?? queryToken ?? (cookie && decodeURIComponent(cookie));
  return !!presented && presented === config.adminSecret;
}

/** Server Component 用：從 cookie 判斷是否已登入 admin。 */
export async function isAdminCookie(): Promise<boolean> {
  if (!config.adminSecret) return false;
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value === config.adminSecret;
}

/** 驗證一組密鑰是否正確（登入用）。 */
export function checkAdminSecret(secret: string): boolean {
  return !!config.adminSecret && secret === config.adminSecret;
}
