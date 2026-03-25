import { NextRequest, NextResponse } from "next/server";

import { findAssetById } from "@/lib/data/store";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await context.params;
  const asset = findAssetById(assetId);

  if (!asset) {
    return NextResponse.json({ error: "asset_not_found" }, { status: 404 });
  }

  return NextResponse.json(asset.metadata);
}
