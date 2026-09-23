import { prisma } from "@/lib/db";
import {
  getCampaign,
  shabbosOfWeek,
  formatShabbosDate,
} from "@/lib/campaign";
import { lastShabbosWeek, nextShabbosWeek, goalTitle } from "@/lib/household";
import { sendEmailToHousehold, sendToHousehold } from "@/lib/messaging";
import { isChildCategory, memberCategory } from "@/lib/categories";
import { raffleEligible } from "@/lib/raffle";

function baseUrl() {
  return (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function firstAdultName(household: {
  familyName: string | null;
  token: string;
  members: Array<{ name: string; gender: string | null; isChild: boolean }>;
}) {
  return (
    household.members.find((member) => !isChildCategory(memberCategory(member)))?.name ??
    household.members[0]?.name ??
    "friend"
  );
}

function raffleWinnerEmailText(
  adultName: string,
  familyName: string,
  members: Array<{ name: string }>,
  week: number,
  campaignWeeks: number
) {
  const firstNames = members
    .map((member) => member.name.trim())
    .filter(Boolean)
    .map((name) => name.split(/\s+/)[0]);
  const memberThankYou = firstNames.length
    ? `Thank you to ${firstNames.join(", ")} for keeping your commitments and helping make this Shabbos Project so special.`
    : "Thank you for keeping your commitments and helping make this Shabbos Project so special.";

  return [
    `Dear ${adultName},`,
    ``,
    `Mazal tov to you and the ${familyName} family! 🎉`,
    memberThankYou,
    `Because of that dedication, your family has won the 📖 $100 Z Berman gift card for week ${week}.`,
    `Someone from the Chicago Shabbos Project will be following up in the next day or 2 with details on how you can receive the card.`,
    ...(week < campaignWeeks
      ? [`➡️ Make sure that your family checks in again next week for a chance to be in next week's raffle.`]
      : []),
  ].join("\n\n");
}

const DAY_MS = 24 * 60 * 60 * 1000;

export type ReminderRunResult = {
  week: number;
  sent: number;
  skipped: number;
  details: string[];
};

/**
 * Run send jobs in parallel batches so a big shul fits inside one
 * serverless invocation instead of timing out partway through the list.
 */
async function inBatches<T>(
  items: T[],
  size: number,
  job: (item: T) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += size) {
    await Promise.allSettled(items.slice(i, i + size).map(job));
  }
}

/**
 * Thursday reminder: tells each household what everyone committed to for the
 * upcoming Shabbos, and nudges anyone who hasn't set a goal yet.
 */
export async function runThursdayReminders(): Promise<ReminderRunResult> {
  const campaign = await getCampaign();
  const week = nextShabbosWeek(campaign);
  if (week > campaign.weeks) {
    return { week, sent: 0, skipped: 0, details: ["Campaign is over — nothing to send."] };
  }
  const shabbosLabel = formatShabbosDate(shabbosOfWeek(campaign, week));

  const households = await prisma.household.findMany({
    include: { members: { include: { goals: { include: { suggestion: true } } } } },
  });

  let sent = 0;
  let skipped = 0;
  const details: string[] = [];

  const alreadySent = new Set(
    (
      await prisma.messageLog.findMany({
        where: { kind: "thursday_reminder", week },
        select: { householdId: true },
      })
    ).map((r) => r.householdId)
  );
  const targets = households.filter((h) => {
    if (h.members.length === 0) return false;
    if (alreadySent.has(h.id)) {
      skipped++;
      return false;
    }
    return true;
  });

  await inBatches(targets, 8, async (h) => {
    const withGoal = h.members
      .map((m) => ({ m, goals: m.goals.filter((g) => g.week === week) }))
      .filter((x) => x.goals.length > 0);
    const withoutGoal = h.members.filter((m) => !m.goals.some((g) => g.week === week));

    // Still-open check-ins from last Shabbos get one more nudge here.
    const prevWeek = week - 1;
    const prevUnchecked =
      prevWeek >= 1 &&
      Date.now() - shabbosOfWeek(campaign, prevWeek).getTime() <= 8 * DAY_MS &&
      h.members.some((m) => m.goals.some((g) => g.week === prevWeek && !g.checkedInAt));

    const link = `${baseUrl()}/c/${h.token}`;
    const lines: string[] = [];
    lines.push(`🕯️ Shabbos is coming — ${shabbosLabel}! Week ${week} of ${campaign.weeks} of the Chicago Shabbos Project.`);
    if (withGoal.length > 0) {
      lines.push("");
      for (const { m, goals } of withGoal) {
        lines.push(`• ${m.name}: ${goals.map((g) => goalTitle(g)).join(" + ")}`);
      }
    }
    if (withoutGoal.length > 0) {
      lines.push("");
      lines.push(
        `${withoutGoal.map((m) => m.name).join(" & ")} ${withoutGoal.length === 1 ? "hasn't" : "haven't"} set commitments yet — tap to choose: ${link}`
      );
    } else {
      lines.push("");
      lines.push(`You've got this! Your page: ${link}`);
    }
    if (prevUnchecked) {
      lines.push("");
      lines.push(
        `P.S. Your family still has check-ins waiting from last Shabbos — it's not too late, they still count: ${link}`
      );
    }

    const channel = await sendToHousehold(
      h,
      { subject: `Shabbos is coming — week ${week} of the Chicago Shabbos Project`, text: lines.join("\n") },
      "thursday_reminder",
      week
    );
    if (channel) {
      sent++;
      details.push(`household ${h.id} via ${channel}`);
    }
  });

  return { week, sent, skipped, details };
}

/**
 * Motzei Shabbos / Sunday reminder: asks households to check in on the week
 * that just ended (and set next week's commitment).
 */
export async function runCheckinReminders(): Promise<ReminderRunResult> {
  const campaign = await getCampaign();
  const week = lastShabbosWeek(campaign);
  if (week < 1) {
    return { week, sent: 0, skipped: 0, details: ["No Shabbos has passed yet."] };
  }

  // Chaser waves: families that haven't checked in hear from us again every
  // ~2 days (Sunday, Tuesday, and the Thursday email's P.S.) until the late
  // window closes. Each wave dedupes independently via its own log kind.
  const daysSince = Math.floor(
    (Date.now() - shabbosOfWeek(campaign, week).getTime()) / DAY_MS
  );
  if (daysSince > 8) {
    return { week, sent: 0, skipped: 0, details: ["Check-in window has closed."] };
  }
  const wave = daysSince <= 2 ? 1 : daysSince <= 4 ? 2 : 3;
  const kind = wave === 1 ? "checkin_reminder" : `checkin_reminder${wave}`;

  const households = await prisma.household.findMany({
    include: { members: { include: { goals: true } } },
  });

  let sent = 0;
  let skipped = 0;
  const details: string[] = [`wave ${wave} (day ${daysSince} after Shabbos)`];

  const alreadySent = new Set(
    (
      await prisma.messageLog.findMany({
        where: { kind, week },
        select: { householdId: true },
      })
    ).map((r) => r.householdId)
  );
  const targets = households.filter((h) => {
    const pending = h.members.some((m) =>
      m.goals.some((g) => g.week === week && !g.checkedInAt)
    );
    if (!pending) return false;
    if (alreadySent.has(h.id)) {
      skipped++;
      return false;
    }
    return true;
  });

  await inBatches(targets, 8, async (h) => {
    const pending = h.members.filter((m) =>
      m.goals.some((g) => g.week === week && !g.checkedInAt)
    );
    const link = `${baseUrl()}/c/${h.token}`;
    const names = pending.map((m) => m.name).join(" & ");
    const isLastWeek = week >= campaign.weeks;
    const text =
      wave === 1
        ? [
            `✨ Gut voch! How did week ${week} go?`,
            `Check in for ${names} — every check-in grows your streak and the whole community's numbers.`,
            isLastWeek ? "" : `Your commitment carries into next Shabbos too — keep it going!`,
            link,
          ]
            .filter(Boolean)
            .join("\n")
        : [
            `👋 Quick nudge — ${names} ${pending.length === 1 ? "hasn't" : "haven't"} checked in yet for Shabbos week ${week}.`,
            `It takes 10 seconds, and late check-ins still count toward the community-wide totals:`,
            link,
          ].join("\n");
    const subject =
      wave === 1
        ? `How did Shabbos go? Check in — week ${week}`
        : `Still time to check in — week ${week} of the Chicago Shabbos Project`;

    const channel = await sendToHousehold(h, { subject, text }, kind, week);
    if (channel) {
      sent++;
      details.push(`household ${h.id} via ${channel}`);
    }
  });

  return { week, sent, skipped, details };
}

/**
 * One-off: nudge everyone who hasn't checked in yet for the most recent
 * Shabbos, with a custom deadline message (e.g. "raffle draws tomorrow at
 * 5pm"). Dedupes per household/week under its own log kind, so pressing
 * the admin button twice never double-sends.
 */
export async function runRaffleDeadlineReminder(
  deadlineText: string
): Promise<ReminderRunResult> {
  const campaign = await getCampaign();
  const week = lastShabbosWeek(campaign);
  if (week < 1) {
    return { week, sent: 0, skipped: 0, details: ["No Shabbos has passed yet."] };
  }

  const kind = `raffle_deadline_reminder`;
  const households = await prisma.household.findMany({
    include: { members: { include: { goals: true } } },
  });

  let sent = 0;
  let skipped = 0;
  const details: string[] = [];

  const alreadySent = new Set(
    (
      await prisma.messageLog.findMany({
        where: { kind, week },
        select: { householdId: true },
      })
    ).map((r) => r.householdId)
  );
  const targets = households.filter((h) => {
    const pending = h.members.some((m) =>
      m.goals.some((g) => g.week === week && !g.checkedInAt)
    );
    if (!pending) return false;
    if (alreadySent.has(h.id)) {
      skipped++;
      return false;
    }
    return true;
  });

  await inBatches(targets, 8, async (h) => {
    const pending = h.members.filter((m) =>
      m.goals.some((g) => g.week === week && !g.checkedInAt)
    );
    const link = `${baseUrl()}/c/${h.token}`;
    const names = pending.map((m) => m.name).join(" & ");
    const text = [
      `Don't forget to check in!`,
      `${names} ${pending.length === 1 ? "hasn't" : "haven't"} checked in yet for Shabbos week ${week}.`,
      deadlineText,
      ``,
      `Check in here — it takes 10 seconds: ${link}`,
    ].join("\n");

    const channel = await sendToHousehold(
      h,
      { subject: `Don't forget to check in — raffle deadline`, text },
      kind,
      week
    );
    if (channel) {
      sent++;
      details.push(`household ${h.id} via ${channel}`);
    }
  });

  return { week, sent, skipped, details };
}

export async function runRaffleWinnerAutomation(week: number) {
  const campaign = await getCampaign();
  const draw = await prisma.raffleDraw.findUnique({ where: { week } });

  if (!draw) {
    const eligible = await raffleEligible(week);
    if (eligible.length === 0) {
      return { week, drew: false, emailSent: false };
    }
    const winner = eligible[Math.floor(Math.random() * eligible.length)];
    await prisma.raffleDraw.upsert({
      where: { week },
      update: {
        householdId: winner.id,
        familyName: winner.familyName ?? winner.token,
        drawnAt: new Date(),
      },
      create: {
        week,
        householdId: winner.id,
        familyName: winner.familyName ?? winner.token,
      },
    });
  }

  const finalDraw = await prisma.raffleDraw.findUnique({ where: { week } });
  if (!finalDraw) {
    return { week, drew: false, emailSent: false };
  }

  const alreadySent = await prisma.messageLog.findFirst({
    where: { householdId: finalDraw.householdId, kind: "raffle_winner_email", week },
  });
  if (alreadySent) {
    return { week, drew: true, emailSent: true };
  }

  const household = await prisma.household.findUnique({
    where: { id: finalDraw.householdId },
    include: { members: true },
  });
  if (!household) {
    return { week, drew: true, emailSent: false };
  }

  const adultName = firstAdultName(household);
  const familyName = household.familyName ?? household.token;
  const text = raffleWinnerEmailText(adultName, familyName, household.members, week, campaign.weeks);

  await sendEmailToHousehold(
    household,
    {
      subject: `Congratulations, ${adultName} and the ${familyName} family!`,
      text,
    },
    "raffle_winner_email",
    week,
    process.env.EMAIL_TEST_TO
  );

  return { week, drew: true, emailSent: true };
}

export async function runScheduledTuesdayCheckinReminder(): Promise<ReminderRunResult> {
  const defaultText =
    "The raffle for the $100 Z Berman Chicago gift card is TODAY at 5pm — you must be checked in to qualify!";
  return runRaffleDeadlineReminder(defaultText);
}

export async function runScheduledTuesdayRaffleDraw(): Promise<ReminderRunResult> {
  const campaign = await getCampaign();
  const week = lastShabbosWeek(campaign);
  if (week < 1) {
    return { week, sent: 0, skipped: 0, details: ["No Shabbos has passed yet."] };
  }

  const result = await runRaffleWinnerAutomation(week);
  const sent = result.emailSent ? 1 : 0;
  const skipped = result.emailSent ? 0 : 1;
  return {
    week,
    sent,
    skipped,
    details: [
      result.drew ? `raffle winner drawn for week ${week}` : `no eligible families for week ${week}`,
      result.emailSent ? `winner email sent for week ${week}` : `winner email skipped for week ${week}`,
    ],
  };
}
