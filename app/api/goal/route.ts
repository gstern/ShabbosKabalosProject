import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCampaign } from "@/lib/campaign";
import { nextShabbosWeek } from "@/lib/household";

/**
 * ADD commitments to a member. Commitments are for keeps: this endpoint only
 * appends — nothing is ever removed or replaced. New commitments apply to
 * every remaining week of the campaign.
 */
export async function POST(req: NextRequest) {
  let body: {
    token?: unknown;
    memberId?: unknown;
    suggestionIds?: unknown;
    customTitle?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  const memberId = typeof body.memberId === "string" ? body.memberId : "";
  if (!token || !memberId) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { household: true, goals: true },
  });
  if (!member || member.household.token !== token) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const validIds = new Set(
    (await prisma.suggestion.findMany({ where: { active: true }, select: { id: true } })).map(
      (s) => s.id
    )
  );
  const suggestionIds = (Array.isArray(body.suggestionIds) ? body.suggestionIds : [])
    .filter((id): id is string => typeof id === "string" && validIds.has(id))
    .slice(0, 6);
  const customTitle =
    typeof body.customTitle === "string" && body.customTitle.trim()
      ? body.customTitle.trim().slice(0, 120)
      : null;
  if (suggestionIds.length === 0 && !customTitle) {
    return NextResponse.json({ error: "Pick at least one commitment to add." }, { status: 400 });
  }

  const campaign = await getCampaign();
  const fromWeek = nextShabbosWeek(campaign);
  if (fromWeek > campaign.weeks) {
    return NextResponse.json(
      { error: "The campaign has wrapped up — commitments can no longer be added." },
      { status: 400 }
    );
  }

  const existing = new Set(
    member.goals
      .filter((g) => g.suggestionId)
      .map((g) => `${g.week}:${g.suggestionId}`)
  );
  const existingCustom = new Set(
    member.goals
      .filter((g) => !g.suggestionId && g.customTitle)
      .map((g) => `${g.week}:${g.customTitle!.trim().toLowerCase()}`)
  );
  let added = 0;
  for (let w = fromWeek; w <= campaign.weeks; w++) {
    for (const suggestionId of suggestionIds) {
      if (existing.has(`${w}:${suggestionId}`)) continue;
      await prisma.goal.create({ data: { memberId, week: w, suggestionId } });
      added++;
    }
    if (customTitle && !existingCustom.has(`${w}:${customTitle.toLowerCase()}`)) {
      await prisma.goal.create({ data: { memberId, week: w, customTitle } });
      added++;
    }
  }

  return NextResponse.json({ ok: true, added });
}
