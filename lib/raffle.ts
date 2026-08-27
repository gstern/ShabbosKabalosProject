import { prisma } from "@/lib/db";

export type EligibleFamily = {
  id: string;
  familyName: string | null;
  token: string;
  people: number;
};

/**
 * Families eligible for a week's pizza raffle: every member who has
 * commitments for that week has checked in on ALL of them (late check-ins
 * count — the raffle rewards doing it and reporting, not the streak window).
 * Members who joined after that week (no goals for it) don't block the family.
 */
export async function raffleEligible(week: number): Promise<EligibleFamily[]> {
  const households = await prisma.household.findMany({
    include: { members: { include: { goals: { where: { week } } } } },
    orderBy: { familyName: "asc" },
  });
  return households
    .filter((h) => {
      const withGoals = h.members.filter((m) => m.goals.length > 0);
      if (withGoals.length === 0) return false;
      return withGoals.every((m) => m.goals.every((g) => g.checkedInAt));
    })
    .map((h) => ({
      id: h.id,
      familyName: h.familyName,
      token: h.token,
      people: h.members.length,
    }));
}

/**
 * All raffle draws so far, oldest week first. Returns [] if the RaffleDraw
 * table hasn't been created in the database yet (deploy/raffle.sql), so the
 * public pages never break on a missing table.
 */
export async function raffleDraws() {
  try {
    return await prisma.raffleDraw.findMany({ orderBy: { week: "asc" } });
  } catch {
    return [];
  }
}
