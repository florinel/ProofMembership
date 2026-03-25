import { NextRequest, NextResponse } from "next/server";

import { submitOwnerApplication } from "@/lib/data/store";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    wallet?: string;
    description?: string;
  };

  const wallet = String(body.wallet ?? "").trim();
  const description = String(body.description ?? "").trim();

  if (!wallet || !description) {
    return NextResponse.json({ error: "missing_required_fields" }, { status: 400 });
  }

  try {
    const application = submitOwnerApplication({ wallet, description });
    return NextResponse.json({ ok: true, application }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "submit_owner_application_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
