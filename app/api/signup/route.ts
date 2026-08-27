import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getCampaign,
  activeWeek,
  shabbosOfWeek,
  formatShabbosDate,
  checkinDeadline,
} from "@/lib/campaign";
import { lastShabbosWeek } from "@/lib/household";
import { normalizePhone, normalizeEmail } from "@/lib/contact";
import { isCategory, isChildCategory } from "@/lib/categories";
import { sendToHousehold } from "@/lib/messaging";

type MemberInput = {
  name?: unknown;
  category?: unknown;
  suggestionIds?: unknown;
  customTitle?: unknown;
};

export async function POST(req: NextRequest) {
  let body: {
    familyName?: unknown;
    phone?: unknown;
    email?: unknown;
    emails?: unknown;
    members?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const familyName =
    typeof body.familyName === "string" ? body.familyName.trim().slice(0, 60) : "";
  if (!familyName) {
    return NextResponse.json(
      { error: "Please provide your family (last) name." },
      { status: 400 }
    );
  }

  const rawEmails = Array.isArray(body.emails)
    ? (body.emails as unknown[]).filter((e): e is string => typeof e === "string")
    : typeof body.email === "string"
      ? [body.email]
      : [];
  const emails: string[] = [];
  for (const raw of rawEmails.slice(0, 3)) {
    if (!raw.trim()) continue;
    const normalized = normalizeEmail(raw);
    if (!normalized) {
      return NextResponse.json(
        { error: `"${raw.trim()}" doesn't look like a valid email — please double-check it.` },
        { status: 400 }
      );
    }
    if (!emails.includes(normalized)) emails.push(normalized);
  }
  const email = emails[0] ?? null;
  if (!email) {
    return NextResponse.json(
      { error: "Please provide a valid email — that's where your weekly reminders go." },
      { status: 400 }
    );
  }

  const rawPhone = typeof body.phone === "string" ? body.phone.trim() : "";
  const phone = rawPhone ? normalizePhone(rawPhone) : null;
  if (rawPhone && !phone) {
    return NextResponse.json(
      { error: "That phone number doesn't look right — please double-check it." },
      { status: 400 }
    );
  }

  const members = Array.isArray(body.members) ? (body.members as MemberInput[]) : [];
  if (members.length === 0 || members.length > 15) {
    return NextResponse.json({ error: "Please add at least one person." }, { status: 400 });
  }

  const campaign = await getCampaign();
  // Families joining off the Motzei Shabbos/Sunday blast still get the
  // just-passed Shabbos while its check-in window is open (through Monday
  // night) — otherwise their page has nothing to check in for.
  const nowWeek = activeWeek(campaign);
  const lastWeek = lastShabbosWeek(campaign);
  const week =
    lastWeek >= 1 &&
    lastWeek < nowWeek &&
    Date.now() <= checkinDeadline(campaign, lastWeek).getTime()
      ? lastWeek
      : nowWeek;

  const validSuggestionIds = new Set(
    (await prisma.suggestion.findMany({ where: { active: true }, select: { id: true } })).map(
      (s) => s.id
    )
  );

  const cleanMembers: {
    name: string;
    category: "man" | "woman" | "boy" | "girl";
    suggestionIds: string[];
    customTitle: string | null;
  }[] = [];
  for (const m of members) {
    const name = typeof m.name === "string" ? m.name.trim().slice(0, 60) : "";
    if (!name) {
      return NextResponse.json({ error: "Every person needs a first name." }, { status: 400 });
    }
    if (!isCategory(m.category)) {
      return NextResponse.json(
        { error: `Choose adult or child for ${name}.` },
        { status: 400 }
      );
    }
    const suggestionIds = (Array.isArray(m.suggestionIds) ? m.suggestionIds : [])
      .filter((id): id is string => typeof id === "string" && validSuggestionIds.has(id))
      .slice(0, 6);
    const customTitle =
      typeof m.customTitle === "string" && m.customTitle.trim()
        ? m.customTitle.trim().slice(0, 120)
        : null;
    if (suggestionIds.length === 0 && !customTitle) {
      return NextResponse.json(
        { error: `Pick at least one commitment for ${name}.` },
        { status: 400 }
      );
    }
    cleanMembers.push({ name, category: m.category, suggestionIds, customTitle });
  }

  // Reuse an existing household for the same contact so families can add
  // people later without splitting their check-in link.
  const existing = await prisma.household.findFirst({
    where: {
      OR: [
        ...emails.flatMap((e) => [{ email: e }, { email2: e }, { email3: e }]),
        ...(phone ? [{ phone }] : []),
      ],
    },
  });

  // Friendly personal link: /c/theirname, with a number appended for
  // duplicate family names (gofman, gofman2, ...).
  async function slugToken(name: string): Promise<string> {
    const base = name.toLowerCase().replace(/[^a-z0-9]/g, "") || "family";
    for (let n = 1; n < 100; n++) {
      const candidate = n === 1 ? base : `${base}${n}`;
      const taken = await prisma.household.findUnique({ where: { token: candidate } });
      if (!taken) return candidate;
    }
    return `${base}${Date.now()}`;
  }

  async function createHousehold() {
    // Retry on the rare launch-night race where two same-named families
    // submit simultaneously and collide on the slug.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await prisma.household.create({
          data: {
            token: await slugToken(familyName),
            familyName,
            phone,
            email,
            email2: emails[1] ?? null,
            email3: emails[2] ?? null,
          },
        });
      } catch (e) {
        if (attempt === 2) throw e;
      }
    }
    throw new Error("unreachable");
  }

  const household = existing ?? (await createHousehold());

  if (existing) {
    // Fill in any newly provided contact details without overwriting old ones.
    const known = new Set(
      [existing.email, existing.email2, existing.email3].filter(Boolean)
    );
    const fresh = emails.filter((e) => !known.has(e));
    await prisma.household.update({
      where: { id: existing.id },
      data: {
        familyName: existing.familyName ?? familyName,
        phone: existing.phone ?? phone,
        email: existing.email ?? fresh.shift() ?? null,
        email2: existing.email2 ?? fresh.shift() ?? null,
        email3: existing.email3 ?? fresh.shift() ?? null,
      },
    });
  }

  // One commitment set, held for the whole campaign: a goal row per
  // commitment for the current week and every remaining week.
  for (const m of cleanMembers) {
    const member = await prisma.member.create({
      data: {
        householdId: household.id,
        name: m.name,
        gender: m.category,
        isChild: isChildCategory(m.category),
      },
    });
    for (let w = week; w <= campaign.weeks; w++) {
      for (const suggestionId of m.suggestionIds) {
        await prisma.goal.create({ data: { memberId: member.id, week: w, suggestionId } });
      }
      if (m.customTitle) {
        await prisma.goal.create({
          data: { memberId: member.id, week: w, customTitle: m.customTitle },
        });
      }
    }
  }

  // Welcome email with the family's permanent link (first signup only).
  const welcomed = await prisma.messageLog.findFirst({
    where: { householdId: household.id, kind: "welcome" },
  });
  if (!welcomed) {
    const base = (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const link = `${base}/c/${household.token}`;
    const memberGoals = await prisma.member.findMany({
      where: { householdId: household.id },
      include: { goals: { where: { week }, include: { suggestion: true } } },
    });
    const lines = memberGoals
      .filter((m) => m.goals.length)
      .map(
        (m) =>
          `• ${m.name}: ${m.goals
            .map((g) => g.suggestion?.title ?? g.customTitle)
            .filter(Boolean)
            .join(" + ")}`
      );
    const text = [
      `Welcome to the Elul Shabbos Project! 🕯️`,
      ``,
      `The ${familyName} family has taken on their commitments for the four Shabbosos of the campaign — starting Shabbos ${formatShabbosDate(shabbosOfWeek(campaign, week))}, through Shabbos Shuva:`,
      ...lines,
      ``,
      `Your family page — there's no password, this link IS your login:`,
      link,
      ``,
      `Lost the link? Tap "Sign in" at ${base.replace(/^https?:\/\//, "")} and enter this email address — that's it.`,
      ``,
      `We'll remind you before each Shabbos, and after Shabbos to check in. Your family's signup sent $${campaign.pledgePerSignup} to ${campaign.charityName}.`,
      ...(cleanMembers.some((m) => m.category === "boy" || m.category === "girl")
        ? [``, `P.S. For the children: the Shabbos Helpers Guide, full of jobs worth owning — ${base}/shabbos-helpers-guide.pdf`]
        : []),
    ].join("\n");
    sendToHousehold(
      household,
      { subject: `Your family page — The Elul Shabbos Project`, text },
      "welcome",
      week
    ).catch(() => {});
  }

  return NextResponse.json({ token: household.token });
}
