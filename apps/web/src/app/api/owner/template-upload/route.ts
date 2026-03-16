import { NextRequest, NextResponse } from "next/server";

import { saveTemplateImage } from "@/lib/media/mediaStore";

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file_required" }, { status: 400 });
    }

    const media = await saveTemplateImage(file);
    return NextResponse.json({ ok: true, ...media }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "template_upload_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
