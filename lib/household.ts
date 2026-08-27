import { prisma } from "@/lib/db";
import {
  CampaignInfo,
  shabbosOfWeek,
  checkinDeadline,
  formatShabbosDate,
} from "@/lib/campaign";
import { memberCategory, isChildCategory } from "@/lib/categories";
import type { MemberGoalView } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function goalTitle(goal: {
  customTitle: string | null;
  suggestion: { title: string } | null;
}): string {
  return goal.suggestion?.title ?? goal.customTitle ?? "your commitment";
}

/**
 * The latest campaign week whose Shabbos has already arrived (Saturday counts,
 * so Motzei Shabbos check-ins target the right week). 0 if none yet.
 */
export function lastShabbosWeek(campaign: CampaignInfo, now = new Date()): number {
  let last = 0;
  for (let w = 1; w <= campaign.weeks; w++) {
    if (shabbosOfWeek(campaign, w).getTime() <= now.getTime()) last = w;
  }
  return last;
}

/** The week whose Shabbos is next ahead of us (weeks + 1 if campaign is over). */
export function nextShabbosWeek(campaign: CampaignInfo, now = new Date()): number {
  for (let w = 1; w <= campaign.weeks; w++) {
    if (shabbosOfWeek(campaign, w).getTime() > now.getTime()) return w;
  }
  return campaign.weeks + 1;
}

function onTime(campaign: CampaignInfo, week: number, checkedInAt: Date | null): boolean {
  if (!checkedInAt) return false;
  return checkedInAt.getTime() <= checkinDeadline(campaign, week).getTime();
}

export async function getHouseholdView(token: string, campaign: CampaignInfo) {
  const household = await prisma.household.findUnique({
    where: { token },
    include: {
      members: {
        include: { goals: { include: { suggestion: true } } },
        orderBy: { name: "asc" },
      },
    },
  });
  if (!household) return null;

  const now = new Date();
  const lastWeek = lastShabbosWeek(campaign, now);
  const nextWeek = nextShabbosWeek(campaign, now);

  const members: MemberGoalView[] = household.members.map((m) => {
    const byWeek = new Map<number, typeof m.goals>();
    for (const g of m.goals) {
      const arr = byWeek.get(g.week) ?? [];
      arr.push(g);
      byWeek.set(g.week, arr);
    }
    const category = memberCategory(m);

    // Week status helper
    const status = (w: number): "done" | "late" | "missed" | "set" | "none" => {
      const goals = byWeek.get(w) ?? [];
      if (goals.length === 0) return "none";
      const allChecked = goals.every((g) => g.checkedInAt);
      if (allChecked) {
        return goals.every((g) => onTime(campaign, w, g.checkedInAt)) ? "done" : "late";
      }
      if (w > lastWeek) return "set";
      // A past week stays "open" (not missed) while late check-ins are
      // still being accepted — same grace as the pending card.
      const age = now.getTime() - shabbosOfWeek(campaign, w).getTime();
      return age <= 8 * DAY_MS ? "set" : "missed";
    };

    // Pending: most recent past week with any unchecked goal, ~8 day grace.
    let pending: MemberGoalView["pending"] = null;
    for (let w = lastWeek; w >= 1; w--) {
      const goals = byWeek.get(w) ?? [];
      if (goals.length === 0) continue;
      const shabbos = shabbosOfWeek(campaign, w);
      const age = now.getTime() - shabbos.getTime();
      if (goals.some((g) => !g.checkedInAt) && age <= 8 * DAY_MS) {
        pending = {
          week: w,
          shabbosLabel: formatShabbosDate(shabbos),
          late: now.getTime() > checkinDeadline(campaign, w).getTime(),
          items: goals.map((g) => ({
            goalId: g.id,
            title: goalTitle(g),
            done: !!g.checkedInAt,
          })),
        };
      }
      break; // only the most recent past week matters
    }

    // Upcoming + current commitment set (from the latest week with goals)
    const upcomingGoals = nextWeek <= campaign.weeks ? (byWeek.get(nextWeek) ?? []) : [];
    const latestWeekWithGoals = Math.max(0, ...[...byWeek.keys()]);
    const currentGoals = byWeek.get(latestWeekWithGoals) ?? [];
    const commitments = (upcomingGoals.length ? upcomingGoals : currentGoals).map(goalTitle);

    const history: MemberGoalView["history"] = [];
    for (let w = 1; w <= campaign.weeks; w++) history.push(status(w));

    // Personal streak: consecutive fully on-time weeks from the most recent
    // closed week; a still-open pending week doesn't break it.
    let streak = 0;
    for (let w = lastWeek; w >= 1; w--) {
      const s = status(w);
      if (s === "done") {
        streak++;
      } else if (w === lastWeek && now.getTime() <= checkinDeadline(campaign, w).getTime()) {
        continue;
      } else {
        break;
      }
    }

    return {
      memberId: m.id,
      name: m.name,
      category,
      isChild: isChildCategory(category),
      streak,
      commitments,
      currentSuggestionIds: (upcomingGoals.length ? upcomingGoals : currentGoals)
        .map((g) => g.suggestionId)
        .filter((id): id is string => !!id),
      currentCustomTitle:
        (upcomingGoals.length ? upcomingGoals : currentGoals).find((g) => !g.suggestionId)
          ?.customTitle ?? null,
      pending,
      upcoming:
        upcomingGoals.length > 0
          ? {
              week: nextWeek,
              shabbosLabel: formatShabbosDate(shabbosOfWeek(campaign, nextWeek)),
              titles: upcomingGoals.map(goalTitle),
            }
          : null,
      canAdjust: nextWeek <= campaign.weeks,
      history,
    };
  });

  // Family streak: consecutive weeks (ending at the most recent closed week)
  // in which at least one family member checked in on time.
  let streak = 0;
  for (let w = lastWeek; w >= 1; w--) {
    const anyDone = household.members.some((m) =>
      m.goals.some((g) => g.week === w && onTime(campaign, w, g.checkedInAt))
    );
    if (anyDone) {
      streak++;
    } else if (w === lastWeek && now.getTime() <= checkinDeadline(campaign, w).getTime()) {
      continue;
    } else {
      break;
    }
  }

  return {
    id: household.id,
    token: household.token,
    familyName: household.familyName,
    phone: household.phone,
    email: household.email,
    streak,
    members,
  };
}

/** Family streak from raw member goal rows (for the public families wall). */
export function familyStreakFromGoals(
  campaign: CampaignInfo,
  members: { goals: { week: number; checkedInAt: Date | null }[] }[],
  now = new Date()
): number {
  const lastWeek = lastShabbosWeek(campaign, now);
  let streak = 0;
  for (let w = lastWeek; w >= 1; w--) {
    const anyDone = members.some((m) =>
      m.goals.some((g) => g.week === w && onTimeCheck(campaign, w, g.checkedInAt))
    );
    if (anyDone) {
      streak++;
    } else if (w === lastWeek && now.getTime() <= checkinDeadline(campaign, w).getTime()) {
      continue;
    } else {
      break;
    }
  }
  return streak;
}

function onTimeCheck(campaign: CampaignInfo, week: number, checkedInAt: Date | null): boolean {
  if (!checkedInAt) return false;
  return checkedInAt.getTime() <= checkinDeadline(campaign, week).getTime();
}
