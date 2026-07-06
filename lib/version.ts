// 網頁底部顯示的版本資訊，方便對照是哪一版部署。
// BUILD_REF 由 next.config.ts 從 Vercel 的 git commit sha 注入（7 碼）。
export const APP_VERSION = "v1.0";
export const BUILD_REF = process.env.NEXT_PUBLIC_BUILD_REF || "local";
export const VERSION_LABEL = `${APP_VERSION} · ${BUILD_REF}`;
