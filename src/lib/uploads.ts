import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_UPLOAD_DIR = path.join(process.cwd(), "uploads");
const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

export function isSupportedImageMime(mime: string): boolean {
  return SUPPORTED_IMAGE_MIME_TYPES.has((mime || "").toLowerCase());
}

export function getUploadDir(): string {
  const envDir = process.env.UPLOAD_DIR;
  if (!envDir) return DEFAULT_UPLOAD_DIR;
  return path.isAbsolute(envDir) ? envDir : path.join(process.cwd(), envDir);
}

export function safeJoinUploadPath(...segments: string[]): string {
  const uploadDir = getUploadDir();
  const joined = path.join(uploadDir, ...segments);
  const normalizedUploadDir = path.resolve(uploadDir) + path.sep;
  const normalizedJoined = path.resolve(joined);

  if (!normalizedJoined.startsWith(normalizedUploadDir)) {
    throw new Error("Invalid upload path");
  }

  return normalizedJoined;
}

export function publicUploadUrl(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  let decoded = normalized;

  try {
    decoded = decodeURI(normalized);
  } catch {
    // keep original if it is not valid encoded URI
  }

  const encoded = decoded
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `/api/uploads/${encoded}`;
}

export async function saveUploadedFile(params: {
  file: File;
  productSlug: string;
}): Promise<{ relativePath: string; byteLength: number }> {
  const { file, productSlug } = params;

  if (!isSupportedImageMime(file.type)) {
    throw new Error("Unsupported image format");
  }

  const originalName = file.name || "file";
  const ext =
    path.extname(originalName).toLowerCase() || guessExtFromMime(file.type);
  const safeExt = ext && ext.length <= 10 ? ext : "";

  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = crypto
    .createHash("sha1")
    .update(buffer)
    .digest("hex")
    .slice(0, 12);
  const fileName = `${Date.now()}-${hash}${safeExt}`;

  const relativePath = path.join("products", productSlug, fileName);
  const targetPath = safeJoinUploadPath(relativePath);

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, buffer);

  return { relativePath, byteLength: buffer.byteLength };
}

function guessExtFromMime(mime: string): string {
  const m = (mime || "").toLowerCase();
  if (m === "image/jpeg") return ".jpg";
  if (m === "image/png") return ".png";
  if (m === "image/webp") return ".webp";
  if (m === "image/gif") return ".gif";
  if (m === "image/svg+xml") return ".svg";
  return "";
}
