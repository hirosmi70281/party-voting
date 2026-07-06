/**
 * 從各種 Google Drive 貼上格式抽出 FILE_ID：
 *   https://drive.google.com/file/d/<ID>/view?usp=sharing
 *   https://drive.google.com/file/d/<ID>/preview
 *   https://drive.google.com/open?id=<ID>
 *   https://drive.google.com/uc?id=<ID>&export=download
 *   直接貼 <ID> 本身
 */
export function extractDriveId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;

  // /file/d/<ID>/...
  const m1 = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) return m1[1];

  // ?id=<ID> 或 &id=<ID>
  const m2 = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return m2[1];

  // 純 ID（Drive file id 通常 >= 20 字，含英數 _ -）
  if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) return s;

  return null;
}

/** 轉成可放進 <iframe> 播放的 preview 網址；無法解析則回傳 null。 */
export function toEmbedUrl(shareUrl: string): string | null {
  const id = extractDriveId(shareUrl);
  return id ? `https://drive.google.com/file/d/${id}/preview` : null;
}

/** 判斷連結是否可解析成 Drive 影片。 */
export function isValidDriveUrl(shareUrl: string): boolean {
  return extractDriveId(shareUrl) !== null;
}
