import { prisma } from "@/lib/db";
import { getCampaign } from "@/lib/campaign";

export type HighlightStat = { label: string; value: number };

export type CampaignStats = {
  households: number;
  members: number;
  kids: number;
  checkins: number;
  goalsThisWeek: number;
  pledgeTotal: number;
  charityName: string;
  highlights: HighlightStat[];
};

export async function getCampaignStats(activeWeek: number): Promise<CampaignStats> {
  const campaign = await getCampaign();

  const [households, members, kids, checkins, goalsThisWeek, doneGoals] =
    await Promise.all([
      prisma.household.count(),
      prisma.member.count(),
      prisma.member.count({ where: { isChild: true } }),
      prisma.goal.count({ where: { checkedInAt: { not: null } } }),
      prisma.goal.count({ where: { week: activeWeek } }),
      prisma.goal.findMany({
        where: { checkedInAt: { not: null }, suggestionId: { not: null } },
        include: { suggestion: true },
      }),
    ]);

  // Roll completed goals up by their suggestion's unit for the highlight reel.
  const byUnit = new Map<string, number>();
  for (const g of doneGoals) {
    if (!g.suggestion) continue;
    const { unitLabel, unitValue } = g.suggestion;
    byUnit.set(unitLabel, (byUnit.get(unitLabel) ?? 0) + unitValue);
  }
  const highlights = [...byUnit.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const pledgeTotal = households * campaign.pledgePerSignup;

  return {
    households,
    members,
    kids,
    checkins,
    goalsThisWeek,
    pledgeTotal,
    charityName: campaign.charityName,
    highlights,
  };
}
