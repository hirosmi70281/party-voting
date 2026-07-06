"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrImg({ url, size = 128 }: { url: string; size?: number }) {
  const [src, setSrc] = useState<string>("");
  useEffect(() => {
    QRCode.toDataURL(url, { width: size, margin: 1 })
      .then(setSrc)
      .catch(() => setSrc(""));
  }, [url, size]);
  if (!src)
    return (
      <div
        style={{ width: size, height: size }}
        className="animate-pulse rounded bg-neutral-200 dark:bg-neutral-700"
      />
    );
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} width={size} height={size} alt="QR" className="rounded" />;
}

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* ignore */
        }
      }}
      className="truncate rounded bg-neutral-100 px-2 py-1 text-left font-mono text-xs hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
      title={url}
    >
      {copied ? "✓ 已複製" : url}
    </button>
  );
}
