import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export async function readLogo(reference: string | null): Promise<Buffer | undefined> {
  if (!reference) return undefined;
  if (!/^[A-Za-z][A-Za-z0-9+.-]*:/.test(reference)) {
    if (reference.startsWith("//") || reference.includes("\\")) throw new Error("Invalid logo asset.");
    const root = await realpath(path.join(process.cwd(), "public"));
    const target = await realpath(path.join(process.cwd(), "public", reference.replace(/^\/+/, "")));
    if (!target.startsWith(`${root}${path.sep}`) || (await stat(target)).size > MAX_IMAGE_BYTES) throw new Error("Invalid logo asset.");
    return readFile(target);
  }
  const url = new URL(reference);
  const allowed = (process.env.PDF_ASSET_ORIGINS ?? "").split(",").map(value => value.trim());
  if (url.protocol !== "https:" || url.username || url.password || !allowed.includes(url.origin)) throw new Error("Logo origin is not configured.");
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(5000) });
  if (!response.ok || !response.body) throw new Error("Logo unavailable.");
  const chunks: Uint8Array[] = [];
  const reader = response.body.getReader();
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_IMAGE_BYTES) throw new Error("Logo exceeds size limit.");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks);
}
