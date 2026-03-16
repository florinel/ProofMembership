import { NextRequest, NextResponse } from "next/server";

import { listCampaignsByClub } from "@/lib/data/store";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await context.params;
  return NextResponse.json(listCampaignsByClub(clubId));
}
