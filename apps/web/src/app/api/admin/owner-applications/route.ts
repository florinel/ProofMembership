import { NextResponse } from "next/server";

import { listOwnerApplications } from "@/lib/data/store";

export async function GET() {
  return NextResponse.json({
    pending: listOwnerApplications("pending"),
    approved: listOwnerApplications("approved"),
    rejected: listOwnerApplications("rejected"),
  });
}
