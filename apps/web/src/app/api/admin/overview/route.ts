import { NextResponse } from "next/server";

import { getAdminOverview } from "@/lib/data/store";

export async function GET() {
  return NextResponse.json(getAdminOverview());
}
