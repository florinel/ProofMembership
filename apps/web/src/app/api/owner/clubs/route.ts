import { NextRequest, NextResponse } from "next/server";

import { createClub } from "@/lib/data/store";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    slug?: string;
    ownerWallet?: string;
    metadataUri?: string;
    feePaid?: number;
  };

  const slug = String(body.slug ?? "").trim();
  const ownerWallet = String(body.ownerWallet ?? "").trim();
  const metadataUri = String(body.metadataUri ?? "").trim();
  const feePaid = Number(body.feePaid ?? 0);

  if (!slug || !ownerWallet || !metadataUri) {
    return NextResponse.json({ error: "missing_required_fields" }, { status: 400 });
  }

  try {
    const club = createClub({
      slug,
      ownerWallet,
      metadataUri,
      feePaid,
    });

    return NextResponse.json({ ok: true, club }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create_owner_club_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
