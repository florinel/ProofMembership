import * as fs from "node:fs";

import { NextRequest, NextResponse } from "next/server";

import { readTemplateImage } from "@/lib/media/mediaStore";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await context.params;
  const media = readTemplateImage(mediaId);

  if (!media) {
    return NextResponse.json({ error: "media_not_found" }, { status: 404 });
  }

  const bytes = fs.readFileSync(media.filePath);
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "content-type": media.mimeType,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
