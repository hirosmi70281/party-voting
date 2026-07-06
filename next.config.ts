import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Google Drive iframe 內嵌播放影片；不需額外 image domains
  env: {
    // 網頁底部版本標記：用 Vercel 的 git commit sha 前 7 碼（本機為 local）。
    NEXT_PUBLIC_BUILD_REF:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
  },
};

export default nextConfig;
