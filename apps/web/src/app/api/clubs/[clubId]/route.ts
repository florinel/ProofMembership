import { NextRequest, NextResponse } from "next/server";

import { findClub } from "@/lib/data/store";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await context.params;
  const club = findClub(clubId);

  if (!club) {
    return NextResponse.json({ error: "club_not_found" }, { status: 404 });
  }

  return NextResponse.json(club);
}
