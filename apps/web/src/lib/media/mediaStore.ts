import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

type StoredMedia = {
  filePath: string;
  mimeType: string;
};

type SaveMediaResult = {
  mediaId: string;
  mediaUri: string;
  storage: "local" | "arweave";
  permanentUri?: string;
};

type MediaStorageProvider = {
  saveTemplateImage(file: File): Promise<SaveMediaResult>;
};

type ArweaveUploadResponse = {
  id?: string;
  mediaId?: string;
  url?: string;
  mediaUri?: string;
  permanentUri?: string;
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

const MEDIA_DIR = path.join(resolveRepoRoot(), ".proofmembership", "media");

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

function validateImageFile(file: File): void {
  // Keep validation conservative because uploaded images are later rendered
  // directly in app surfaces and metadata previews.
  if (!file.type.startsWith("image/")) {
    throw new Error("invalid_media_type");
  }

  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("media_too_large");
  }
}

const localMediaStorageProvider: MediaStorageProvider = {
  async saveTemplateImage(file: File): Promise<SaveMediaResult> {
    ensureMediaDir();

    const mediaId = `tpl-${crypto.randomBytes(8).toString("hex")}`;
    const ext = mapExt(file.type);
    const fileName = `${mediaId}.${ext}`;
    const fullPath = path.join(MEDIA_DIR, fileName);
    const metaPath = path.join(MEDIA_DIR, `${mediaId}.json`);

    const bytes = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(fullPath, bytes);
    // Sidecar metadata keeps read-time lookup cheap without scanning files.
    fs.writeFileSync(
      metaPath,
      JSON.stringify({ fileName, mimeType: file.type }, null, 2),
      "utf8"
    );

    return {
      mediaId,
      mediaUri: `/api/media/${mediaId}`,
      storage: "local",
    };
  },
};

const arweaveMediaStorageProvider: MediaStorageProvider = {
  async saveTemplateImage(file: File): Promise<SaveMediaResult> {
    const uploadUrl = process.env.PROOFMEMBERSHIP_ARWEAVE_UPLOAD_URL;
    if (!uploadUrl) {
      throw new Error("arweave_upload_url_not_configured");
    }

    const form = new FormData();
    form.set("file", file, file.name || `template.${mapExt(file.type)}`);

    const headers: Record<string, string> = {};
    const apiKey = process.env.PROOFMEMBERSHIP_ARWEAVE_API_KEY;
    if (apiKey) {
      headers.authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers,
      body: form,
      cache: "no-store",
    });

    let parsed: ArweaveUploadResponse | null = null;
    try {
      parsed = (await response.json()) as ArweaveUploadResponse;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      throw new Error("arweave_upload_failed");
    }

    // Accept multiple response field names so integrations can use different
    // uploader gateways without forcing one rigid response contract.
    const permanentUri = String(parsed?.permanentUri ?? parsed?.url ?? parsed?.mediaUri ?? "").trim();
    if (!permanentUri) {
      throw new Error("arweave_upload_missing_url");
    }

    const mediaId = String(parsed?.mediaId ?? parsed?.id ?? `ar-${crypto.randomBytes(8).toString("hex")}`);

    return {
      mediaId,
      mediaUri: permanentUri,
      storage: "arweave",
      permanentUri,
    };
  },
};

function resolveMediaStorageProvider(): MediaStorageProvider {
  // Provider switch is runtime-configurable to keep local dev simple and
  // production migration to permanent storage incremental.
  const provider = (process.env.PROOFMEMBERSHIP_MEDIA_PROVIDER ?? "local").toLowerCase();
  if (provider === "arweave") {
    return arweaveMediaStorageProvider;
  }

  return localMediaStorageProvider;
}

export async function saveTemplateImage(file: File): Promise<SaveMediaResult> {
  validateImageFile(file);
  const provider = resolveMediaStorageProvider();
  return provider.saveTemplateImage(file);
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
