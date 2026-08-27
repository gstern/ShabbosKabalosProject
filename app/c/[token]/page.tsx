import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCampaign } from "@/lib/campaign";
import { getHouseholdView } from "@/lib/household";
import CheckinClient from "./CheckinClient";

export const dynamic = "force-dynamic";

export default async function HouseholdPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const campaign = await getCampaign();
  const view =
    (await getHouseholdView(token, campaign)) ??
    (await getHouseholdView(decodeURIComponent(token).toLowerCase(), campaign));
  if (!view) notFound();

  const suggestions = await prisma.suggestion.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, title: true, detail: true, categories: true },
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="font-display text-3xl text-navy mb-1">
        {view.familyName ? `The ${view.familyName} Family` : "Your family's check-in"}
      </h1>
      <p className="text-ink-soft mb-2">
        Check in on last Shabbos, set next week&rsquo;s commitment, and keep
        the streak going.
      </p>
      {view.streak > 0 && (
        <p className="inline-block bg-gold-pale text-navy-deep text-sm font-medium rounded-full px-4 py-1.5 mb-6">
          🔥 Family streak: {view.streak} {view.streak === 1 ? "week" : "weeks"} strong
        </p>
      )}
      {view.streak === 0 && <div className="mb-6" />}
      <CheckinClient
        token={view.token}
        members={view.members}
        suggestions={suggestions}
        totalWeeks={campaign.weeks}
      />
    </div>
  );
}
