"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { isAdmin, grantAdmin, revokeAdmin } from "@/lib/adminAuth";
import {
  runThursdayReminders,
  runCheckinReminders,
  runRaffleDeadlineReminder,
  runRaffleWinnerAutomation,
} from "@/lib/reminders";
import { raffleEligible } from "@/lib/raffle";
import { getCampaign } from "@/lib/campaign";
import { sendWelcome, householdsMissingWelcome } from "@/lib/welcome";
import { sendEmail, sendEmailToHousehold } from "@/lib/messaging";
import { isChildCategory, memberCategory } from "@/lib/categories";

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  await grantAdmin(password);
  revalidatePath("/admin");
}

export async function logoutAction() {
  await revokeAdmin();
  revalidatePath("/admin");
}

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Not authorized");
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

export async function saveCampaignAction(formData: FormData) {
  await requireAdmin();
  const startDateStr = String(formData.get("startDate") ?? "");
  const deadlineStr = String(formData.get("signupDeadline") ?? "");
  await prisma.campaign.update({
    where: { id: "campaign" },
    data: {
      name: String(formData.get("name") ?? "The Shabbos Project").slice(0, 100),
      weeks: Math.max(1, Math.min(12, Number(formData.get("weeks")) || 4)),
      // Dates entered in LA time (campaign is LA-based; August offset is -07:00)
      startDate: startDateStr ? new Date(`${startDateStr}T00:00:00-07:00`) : undefined,
      signupDeadline: deadlineStr ? new Date(`${deadlineStr}T19:00:00-07:00`) : null,
      pledgePerSignup: Math.max(0, Number(formData.get("pledgePerSignup")) || 0),
      pledgePerCheckin: Math.max(0, Number(formData.get("pledgePerCheckin")) || 0),
      charityName: String(formData.get("charityName") ?? "Tomchei Shabbos").slice(0, 100),
    },
  });
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function saveSuggestionAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const pickedCategories = ["adult", "child"].filter(
    (c) => formData.get(`cat_${c}`) === "on"
  );
  const data = {
    title: String(formData.get("title") ?? "").trim().slice(0, 120),
    detail: String(formData.get("detail") ?? "").trim().slice(0, 300) || null,
    unitLabel: String(formData.get("unitLabel") ?? "").trim().slice(0, 80),
    unitValue: Math.max(1, Number(formData.get("unitValue")) || 1),
    categories: pickedCategories.length === 1 ? pickedCategories[0] : "both",
    active: formData.get("active") === "on",
    sortOrder: Number(formData.get("sortOrder")) || 0,
  };
  if (!data.title || !data.unitLabel) throw new Error("Title and unit label are required");
  if (id) {
    await prisma.suggestion.update({ where: { id }, data });
  } else {
    await prisma.suggestion.create({ data });
  }
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/signup");
}

export async function deleteSuggestionAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const used = await prisma.goal.count({ where: { suggestionId: id } });
  if (used > 0) {
    // Keep history intact — just hide it from pickers.
    await prisma.suggestion.update({ where: { id }, data: { active: false } });
  } else {
    await prisma.suggestion.delete({ where: { id } });
  }
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function sendThursdayAction() {
  await requireAdmin();
  await runThursdayReminders();
  revalidatePath("/admin");
}

export async function sendCheckinAction() {
  await requireAdmin();
  await runCheckinReminders();
  revalidatePath("/admin");
}

/**
 * Welcome message to every family that never got one (a signup whose send
 * was cut off). Deduped on MessageLog, so it only reaches the missed ones.
 */
export async function sendMissingWelcomesAction() {
  await requireAdmin();
  const campaign = await getCampaign();
  const missing = await householdsMissingWelcome();
  let sent = 0;
  for (const h of missing) {
    try {
      if (await sendWelcome(h.id, campaign)) sent++;
    } catch (e) {
      console.error(`[message:welcome] resend failed for household ${h.id}:`, e);
    }
  }
  console.log(`[message:welcome] resend: ${sent} sent of ${missing.length} missing`);
  revalidatePath("/admin");
}

export async function sendRaffleDeadlineAction(formData: FormData) {
  await requireAdmin();
  const deadlineText = String(formData.get("deadlineText") ?? "").trim().slice(0, 300);
  if (!deadlineText) return;
  await runRaffleDeadlineReminder(deadlineText);
  revalidatePath("/admin");
}

export async function deleteHouseholdAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  // Cascades to members and goals; message log rows are cleaned up explicitly.
  await prisma.messageLog.deleteMany({ where: { householdId: id } });
  await prisma.household.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/families");
}

export async function deleteMemberAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const member = await prisma.member.findUnique({
    where: { id },
    include: { household: { include: { members: true } } },
  });
  if (!member) return;
  await prisma.member.delete({ where: { id } });
  // If that was the household's last member, remove the empty household too.
  if (member.household.members.length <= 1) {
    await prisma.messageLog.deleteMany({ where: { householdId: member.householdId } });
    await prisma.household.delete({ where: { id: member.householdId } }).catch(() => {});
  }
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/families");
}

export async function drawRaffleAction(formData: FormData) {
  await requireAdmin();
  const week = Number(formData.get("week"));
  if (!Number.isInteger(week) || week < 1 || week > 12) return;
  const eligible = await raffleEligible(week);
  if (eligible.length === 0) return;
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
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function sendRaffleWinnerEmailAction(formData: FormData) {
  await requireAdmin();
  const week = Number(formData.get("week"));
  if (!Number.isInteger(week) || week < 1 || week > 12) return;

  await runRaffleWinnerAutomation(week);
  revalidatePath("/admin");
}

export async function sendTestRaffleWinnerEmailAction(formData: FormData) {
  await requireAdmin();
  const week = Number(formData.get("week"));
  if (!Number.isInteger(week) || week < 1 || week > 12) return;

  const campaign = await getCampaign();
  const testRecipient = process.env.EMAIL_TEST_TO;
  if (!testRecipient) throw new Error("EMAIL_TEST_TO is not configured");

  const draw = await prisma.raffleDraw.findUnique({ where: { week } });
  let adultName = "friend";
  let familyName = `Family ${week}`;
  let household:
    | ({ familyName: string | null; token: string; members: Array<{ name: string; gender: string | null; isChild: boolean }> })
    | null = null;
  if (draw) {
    household = await prisma.household.findUnique({
      where: { id: draw.householdId },
      include: { members: true },
    });
    if (household) {
      adultName = firstAdultName(household);
      familyName = draw.familyName;
    }
  } else {
    const eligible = await raffleEligible(week);
    if (eligible.length === 0) return;
    const family = eligible[Math.floor(Math.random() * eligible.length)];
    familyName = family.familyName ?? family.token;
    household = await prisma.household.findUnique({
      where: { id: family.id },
      include: { members: true },
    });
    adultName = household ? firstAdultName(household) : "friend";
  }
  const text = raffleWinnerEmailText(
    adultName,
    familyName,
    household?.members ?? [],
    week,
    campaign.weeks
  );

  await sendEmail(
    [testRecipient],
    { subject: `Test winner email — week ${week}`, text }
  );
}

export async function mergeHouseholdsAction(formData: FormData) {
  await requireAdmin();
  const keepId = String(formData.get("keepId") ?? "");
  const absorbId = String(formData.get("absorbId") ?? "");
  if (!keepId || !absorbId || keepId === absorbId) return;

  const [keep, absorb] = await Promise.all([
    prisma.household.findUnique({ where: { id: keepId } }),
    prisma.household.findUnique({ where: { id: absorbId } }),
  ]);
  if (!keep || !absorb) return;

  // Move people (and with them, all goals/check-ins) to the kept family.
  await prisma.member.updateMany({
    where: { householdId: absorbId },
    data: { householdId: keepId },
  });
  await prisma.messageLog.updateMany({
    where: { householdId: absorbId },
    data: { householdId: keepId },
  });

  // Combine contact details: fill the kept family's empty slots.
  const knownEmails = new Set(
    [keep.email, keep.email2, keep.email3].filter(Boolean) as string[]
  );
  const incoming = [absorb.email, absorb.email2, absorb.email3].filter(
    (e): e is string => !!e && !knownEmails.has(e)
  );
  await prisma.household.update({
    where: { id: keepId },
    data: {
      phone: keep.phone ?? absorb.phone,
      email: keep.email ?? incoming.shift() ?? null,
      email2: keep.email2 ?? incoming.shift() ?? null,
      email3: keep.email3 ?? incoming.shift() ?? null,
      familyName: keep.familyName ?? absorb.familyName,
    },
  });

  await prisma.household.delete({ where: { id: absorbId } });
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/families");
}
