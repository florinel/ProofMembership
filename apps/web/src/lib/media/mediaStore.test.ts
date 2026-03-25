import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { saveTemplateImage } from "@/lib/media/mediaStore";

describe("mediaStore provider behavior", () => {
  const originalProvider = process.env.PROOFMEMBERSHIP_MEDIA_PROVIDER;
  const originalUploadUrl = process.env.PROOFMEMBERSHIP_ARWEAVE_UPLOAD_URL;
  const originalApiKey = process.env.PROOFMEMBERSHIP_ARWEAVE_API_KEY;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.PROOFMEMBERSHIP_MEDIA_PROVIDER = "local";
    delete process.env.PROOFMEMBERSHIP_ARWEAVE_UPLOAD_URL;
    delete process.env.PROOFMEMBERSHIP_ARWEAVE_API_KEY;
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    process.env.PROOFMEMBERSHIP_MEDIA_PROVIDER = originalProvider;
    process.env.PROOFMEMBERSHIP_ARWEAVE_UPLOAD_URL = originalUploadUrl;
    process.env.PROOFMEMBERSHIP_ARWEAVE_API_KEY = originalApiKey;
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("rejects non-image files", async () => {
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });

    await expect(saveTemplateImage(file)).rejects.toThrowError("invalid_media_type");
  });

  it("requires upload URL when arweave provider is selected", async () => {
    process.env.PROOFMEMBERSHIP_MEDIA_PROVIDER = "arweave";
    const file = new File([new Uint8Array([1, 2, 3])], "template.png", {
      type: "image/png",
    });

    await expect(saveTemplateImage(file)).rejects.toThrowError("arweave_upload_url_not_configured");
  });

  it("normalizes arweave upload response to permanent URI", async () => {
    process.env.PROOFMEMBERSHIP_MEDIA_PROVIDER = "arweave";
    process.env.PROOFMEMBERSHIP_ARWEAVE_UPLOAD_URL = "https://uploader.example/upload";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "abc123",
        url: "https://arweave.net/abc123",
      }),
    });

    globalThis.fetch = fetchMock as typeof fetch;

    const file = new File([new Uint8Array([137, 80, 78, 71])], "template.png", {
      type: "image/png",
    });

    const result = await saveTemplateImage(file);

    expect(result.storage).toBe("arweave");
    expect(result.mediaId).toBe("abc123");
    expect(result.mediaUri).toBe("https://arweave.net/abc123");
    expect(result.permanentUri).toBe("https://arweave.net/abc123");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
