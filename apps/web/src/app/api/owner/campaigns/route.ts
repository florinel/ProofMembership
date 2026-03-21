import { NextRequest, NextResponse } from "next/server";

import type { MintMode } from "@solnft/types";

import { createCampaign } from "@/lib/data/store";

function parseMintMode(value: string): MintMode | null {
  if (value === "on_purchase" || value === "live_event") {
    return value;
  }
  return null;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    clubId?: string;
    ownerWallet?: string;
    name?: string;
    priceAtomic?: string;
    templateImageUri?: string;
    mintMode?: string;
    mintStartsAtUnix?: number | null;
    maxSupply?: number | null;
    expiresAtUnix?: number | null;
    campaignFeeBps?: number;
  };

  if (body.campaignFeeBps !== undefined) {
    return NextResponse.json({ error: "owner_cannot_set_campaign_fee_bps" }, { status: 400 });
  }

  const mintMode = parseMintMode(String(body.mintMode ?? "on_purchase"));
  if (!mintMode) {
    return NextResponse.json({ error: "invalid_mint_mode" }, { status: 400 });
  }

  try {
    const campaign = createCampaign({
      clubId: String(body.clubId ?? "").trim(),
      ownerWallet: String(body.ownerWallet ?? "").trim(),
      name: String(body.name ?? "").trim(),
      priceAtomic: String(body.priceAtomic ?? "").trim(),
      templateImageUri: String(body.templateImageUri ?? "").trim(),
      mintMode,
      mintStartsAtUnix: body.mintStartsAtUnix ?? null,
      maxSupply: body.maxSupply ?? null,
      expiresAtUnix: body.expiresAtUnix ?? null,
    });

    return NextResponse.json({ ok: true, campaign }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create_campaign_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
