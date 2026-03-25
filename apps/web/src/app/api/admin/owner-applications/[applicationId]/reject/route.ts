import { NextRequest, NextResponse } from "next/server";

import { rejectOwnerApplication } from "@/lib/data/store";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ applicationId: string }> }
) {
  const params = await context.params;
  const applicationId = params.applicationId;
  const body = (await request.json()) as {
    reviewNote?: string;
  };

  try {
    const application = rejectOwnerApplication({
      applicationId,
      reviewNote: String(body.reviewNote ?? ""),
    });

    return NextResponse.json({ ok: true, application });
  } catch (error) {
    const message = error instanceof Error ? error.message : "reject_owner_application_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
