import { NextRequest, NextResponse } from "next/server";

import { approveOwnerApplication } from "@/lib/data/store";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ applicationId: string }> }
) {
  const params = await context.params;
  const applicationId = params.applicationId;

  try {
    const application = approveOwnerApplication({
      applicationId,
    });

    return NextResponse.json({ ok: true, application });
  } catch (error) {
    const message = error instanceof Error ? error.message : "approve_owner_application_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
