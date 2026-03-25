import { NextRequest, NextResponse } from "next/server";

import { listMembershipsByWallet } from "@/lib/data/store";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ wallet: string }> }
) {
  const { wallet } = await context.params;
  return NextResponse.json(listMembershipsByWallet(wallet));
}
