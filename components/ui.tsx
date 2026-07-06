import { toEmbedUrl } from "@/lib/drive";
import { VERSION_LABEL } from "@/lib/version";

export function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8 sm:py-12">
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && (
          <p className="mt-2 text-sm text-neutral-500">{subtitle}</p>
        )}
      </header>
      <div className="flex-1">{children}</div>
      <VersionFooter />
    </main>
  );
}

/** 網頁底部版本標記，方便對照部署版本。 */
export function VersionFooter() {
  return (
    <footer className="mt-10 pt-4 text-center text-[10px] text-neutral-400">
      {VERSION_LABEL}
    </footer>
  );
}

const toneStyles = {
  info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100",
  success:
    "border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100",
  warn: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100",
  error:
    "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100",
};

export function Notice({
  tone = "info",
  title,
  children,
}: {
  tone?: keyof typeof toneStyles;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border p-4 text-sm ${toneStyles[tone]}`}>
      {title && <p className="mb-1 font-semibold">{title}</p>}
      <div>{children}</div>
    </div>
  );
}

/** Google Drive 影片內嵌播放器（16:9）。 */
export function DriveVideo({ url }: { url: string }) {
  const embed = toEmbedUrl(url);
  if (!embed) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg bg-neutral-100 text-xs text-neutral-400 dark:bg-neutral-800">
        （影片連結無法解析）
      </div>
    );
  }
  return (
    <div className="aspect-video overflow-hidden rounded-lg bg-black">
      <iframe
        src={embed}
        className="h-full w-full"
        allow="autoplay"
        allowFullScreen
      />
    </div>
  );
}
