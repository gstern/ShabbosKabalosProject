import { NextRequest, NextResponse } from "next/server";
import {
  runScheduledTuesdayCheckinReminder,
  runScheduledTuesdayRaffleDraw,
} from "@/lib/reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = req.headers.get("authorization");
  const key = req.nextUrl.searchParams.get("key");
  return header === `Bearer ${secret}` || key === secret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const phase = req.nextUrl.searchParams.get("phase");
  const result =
    phase === "draw"
      ? await runScheduledTuesdayRaffleDraw()
      : await runScheduledTuesdayCheckinReminder();

  return NextResponse.json(result);
}

export const POST = GET;
