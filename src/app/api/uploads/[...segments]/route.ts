import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";

import { safeJoinUploadPath } from "@/lib/uploads";

export const runtime = "nodejs";
const basenamePathCache = new Map<string, string>();

type RouteParams = {
  segments?: string[];
};

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { segments: paramsSegments = [] } = await context.params;
  const encodedSegments = getEncodedSegmentsFromRequestPath(request);
  const decodedSegments = encodedSegments.map((segment) => decodeSafe(segment));

  const candidateSegmentSets = uniqueSegmentSets([
    paramsSegments,
    encodedSegments,
    decodedSegments,
  ]).filter((segments) => segments.length > 0);

  if (!candidateSegmentSets.length) {
    return new Response("Not Found", { status: 404 });
  }

  for (const segments of candidateSegmentSets) {
    let filePath = "";
    try {
      filePath = safeJoinUploadPath(...segments);
    } catch {
      continue;
    }

    const response = await tryReadAsResponse(filePath);
    if (response) {
      return response;
    }
  }

  const fallbackFileNames = uniqueStrings(
    candidateSegmentSets
      .map((segments) => segments[segments.length - 1] ?? "")
      .filter(Boolean)
      .flatMap((name) => [name, decodeSafe(name)]),
  );

  for (const fileName of fallbackFileNames) {
    const foundPath = await findFileByBasenameUnderProducts(fileName);
    if (!foundPath) continue;

    const response = await tryReadAsResponse(foundPath);
    if (response) {
      return response;
    }
  }

  return new Response("Not Found", { status: 404 });
}

function getContentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".avif") return "image/avif";

  return "application/octet-stream";
}

async function tryReadAsResponse(filePath: string) {
  try {
    const fileBuffer = await fs.readFile(filePath);

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": getContentType(filePath),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return null;
  }
}

async function findFileByBasenameUnderProducts(fileName: string) {
  const cached = basenamePathCache.get(fileName);
  if (cached) {
    try {
      await fs.access(cached);
      return cached;
    } catch {
      basenamePathCache.delete(fileName);
    }
  }

  let productsDir = "";
  try {
    productsDir = safeJoinUploadPath("products");
  } catch {
    return null;
  }

  let entries: Dirent[];
  try {
    entries = await fs.readdir(productsDir, { withFileTypes: true });
  } catch {
    return null;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    let candidatePath = "";
    try {
      candidatePath = safeJoinUploadPath("products", entry.name, fileName);
    } catch {
      continue;
    }

    try {
      await fs.access(candidatePath);
      basenamePathCache.set(fileName, candidatePath);
      return candidatePath;
    } catch {
      // continue searching
    }
  }

  return null;
}

function getEncodedSegmentsFromRequestPath(request: Request) {
  const pathname = new URL(request.url).pathname;
  const marker = "/api/uploads/";
  const markerIndex = pathname.indexOf(marker);
  if (markerIndex === -1) return [];

  const tail = pathname.slice(markerIndex + marker.length);
  return tail.split("/").filter(Boolean);
}

function decodeSafe(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function uniqueSegmentSets(segmentSets: string[][]) {
  const seen = new Set<string>();
  const output: string[][] = [];

  for (const segments of segmentSets) {
    const key = segments.join("\u0000");
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(segments);
  }

  return output;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}
