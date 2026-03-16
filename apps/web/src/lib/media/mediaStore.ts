import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

type StoredMedia = {
  filePath: string;
  mimeType: string;
};

function resolveRepoRoot(): string {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, "pnpm-workspace.yaml"))) {
    return cwd;
  }

  const twoUp = path.resolve(cwd, "..", "..");
  if (fs.existsSync(path.join(twoUp, "pnpm-workspace.yaml"))) {
    return twoUp;
  }

  return cwd;
}

const MEDIA_DIR = path.join(resolveRepoRoot(), ".solnft", "media");

function ensureMediaDir(): void {
  if (!fs.existsSync(MEDIA_DIR)) {
    fs.mkdirSync(MEDIA_DIR, { recursive: true });
  }
}

function mapExt(mimeType: string): string {
  if (mimeType === "image/jpeg") {
    return "jpg";
  }
  if (mimeType === "image/webp") {
    return "webp";
  }
  return "png";
}

export async function saveTemplateImage(file: File): Promise<{ mediaId: string; mediaUri: string }> {
  if (!file.type.startsWith("image/")) {
    throw new Error("invalid_media_type");
  }

  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("media_too_large");
  }

  ensureMediaDir();

  const mediaId = `tpl-${crypto.randomBytes(8).toString("hex")}`;
  const ext = mapExt(file.type);
  const fileName = `${mediaId}.${ext}`;
  const fullPath = path.join(MEDIA_DIR, fileName);
  const metaPath = path.join(MEDIA_DIR, `${mediaId}.json`);

  const bytes = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(fullPath, bytes);
  fs.writeFileSync(
    metaPath,
    JSON.stringify({ fileName, mimeType: file.type }, null, 2),
    "utf8"
  );

  return {
    mediaId,
    mediaUri: `/api/media/${mediaId}`,
  };
}

export function readTemplateImage(mediaId: string): StoredMedia | null {
  ensureMediaDir();
  const metaPath = path.join(MEDIA_DIR, `${mediaId}.json`);
  if (!fs.existsSync(metaPath)) {
    return null;
  }

  const meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as {
    fileName: string;
    mimeType: string;
  };

  const filePath = path.join(MEDIA_DIR, meta.fileName);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return {
    filePath,
    mimeType: meta.mimeType,
  };
}
