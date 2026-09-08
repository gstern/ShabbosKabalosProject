import { prisma } from "@/lib/db";
import { CampaignInfo, activeWeek, shabbosOfWeek, formatShabbosDate } from "@/lib/campaign";
import { memberCategory, isChildCategory } from "@/lib/categories";
import { sendToHousehold } from "@/lib/messaging";

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Send a household its welcome message (family link + the commitments they
 * chose). Deduped on the MessageLog, so calling it twice is harmless.
 * `week` is the campaign week the family's commitments start; when omitted
 * it's their earliest week with goals (or the current week).
 */
export async function sendWelcome(
  householdId: string,
  campaign: CampaignInfo,
  week?: number
): Promise<boolean> {
  const household = await prisma.household.findUnique({
    where: { id: householdId },
    include: { members: { include: { goals: { include: { suggestion: true } } } } },
  });
  if (!household) return false;

  const welcomed = await prisma.messageLog.findFirst({
    where: { householdId: household.id, kind: "welcome" },
  });
  if (welcomed) return false;

  const goalWeeks = household.members.flatMap((m) => m.goals.map((g) => g.week));
  const startWeek = week ?? (goalWeeks.length ? Math.min(...goalWeeks) : activeWeek(campaign));

  const base = baseUrl();
  const link = `${base}/c/${household.token}`;
  const lines = household.members
    .map((m) => ({ name: m.name, goals: m.goals.filter((g) => g.week === startWeek) }))
    .filter((m) => m.goals.length)
    .map(
      (m) =>
        `• ${m.name}: ${m.goals
          .map((g) => g.suggestion?.title ?? g.customTitle)
          .filter(Boolean)
          .join(" + ")}`
    );
  const hasChildren = household.members.some((m) => isChildCategory(memberCategory(m)));
  const familyName = household.familyName ?? household.token;

  const text = [
    `Welcome to the Chicago Shabbos Project! 🕯️`,
    ``,
    `The ${familyName} family has taken on their commitments for the four Shabbosos of the campaign — starting Shabbos ${formatShabbosDate(shabbosOfWeek(campaign, startWeek))}, through Shabbos Shuva:`,
    ...lines,
    ``,
    `Your family page — there's no password, this link IS your login:`,
    link,
    ``,
    `Lost the link? Tap "Sign in" at ${base.replace(/^https?:\/\//, "")} and enter this email address — that's it.`,
    ``,
    `We'll remind you before each Shabbos, and after Shabbos to check in.`,
    ...(hasChildren
      ? [``, `P.S. For the children: the Shabbos Helpers Guide, full of jobs worth owning — ${base}/shabbos-helpers-guide.pdf`]
      : []),
  ].join("\n");

  const channel = await sendToHousehold(
    household,
    { subject: `Your family page — The Chicago Shabbos Project`, text },
    "welcome",
    startWeek
  );
  return channel !== null;
}

/**
 * Households with people that never got a welcome message — the ones a
 * cut-off send (see the signup route) would have missed.
 */
export async function householdsMissingWelcome() {
  const households = await prisma.household.findMany({
    where: { members: { some: {} } },
    select: { id: true, familyName: true, token: true, email: true, phone: true },
    orderBy: { createdAt: "asc" },
  });
  const welcomed = new Set(
    (
      await prisma.messageLog.findMany({
        where: { kind: "welcome" },
        select: { householdId: true },
      })
    ).map((l) => l.householdId)
  );
  return households.filter((h) => !welcomed.has(h.id));
}
