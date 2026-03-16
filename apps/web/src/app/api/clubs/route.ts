import { NextResponse } from "next/server";

import { listClubs } from "@/lib/data/store";

export async function GET() {
  return NextResponse.json(listClubs());
}
