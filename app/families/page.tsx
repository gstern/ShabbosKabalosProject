import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCampaign } from "@/lib/campaign";
import { familyStreakFromGoals } from "@/lib/household";
import { memberCategory } from "@/lib/categories";
import Avatar from "@/components/Avatar";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "The Families | The Elul Shabbos Project",
};

export default async function FamiliesPage() {
  const campaign = await getCampaign();
  const households = await prisma.household.findMany({
    where: { familyName: { not: null } },
    include: {
      members: { include: { goals: { select: { week: true, checkedInAt: true } } } },
    },
  });

  const families = households
    .filter((h) => h.members.length > 0)
    .map((h) => ({
      id: h.id,
      name: h.familyName as string,
      categories: h.members.map((m) => memberCategory(m)),
      people: h.members.length,
      streak: familyStreakFromGoals(campaign, h.members),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const totalPeople = families.reduce((n, f) => n + f.people, 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl sm:text-4xl text-navy mb-2 text-center">
        The families of the Elul Shabbos Project
      </h1>
      <p className="text-ink-soft text-center mb-8">
        {families.length === 0 ? (
          <>Be the first family on this wall.</>
        ) : (
          <>
            {families.length} {families.length === 1 ? "family" : "families"} &middot;{" "}
            {totalPeople} {totalPeople === 1 ? "person" : "people"} — each holding
            their commitments through Shabbos Shuva.
          </>
        )}
      </p>

      {families.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {families.map((f) => (
            <div
              key={f.id}
              className="bg-white rounded-2xl border border-parchment shadow-sm px-5 py-4"
            >
              <div className="flex -space-x-2 mb-2">
                {f.categories.slice(0, 6).map((c, i) => (
                  <Avatar key={i} category={c} className="h-11 w-auto" />
                ))}
                {f.categories.length > 6 && (
                  <span className="self-end text-xs text-ink-soft pl-2">
                    +{f.categories.length - 6}
                  </span>
                )}
              </div>
              <div>
                <div className="font-display text-lg text-navy">
                  The {f.name} Family
                </div>
                {f.streak > 0 ? (
                  <span className="inline-block text-xs bg-gold-pale text-navy-deep rounded-full px-2.5 py-0.5 mt-1 font-medium">
                    🔥 {f.streak}-week streak
                  </span>
                ) : (
                  <span className="text-xs text-ink-soft">signed up ✓</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-center pb-6">
        <p className="text-ink-soft mb-4">
          {families.length === 0
            ? "Your family's name belongs here."
            : "Don't see your family up here yet?"}
        </p>
        <Link
          href="/signup"
          className="inline-block bg-gold text-navy-deep font-semibold rounded-lg px-8 py-3.5 text-lg hover:bg-gold-soft transition-colors"
        >
          Join the campaign
        </Link>
      </div>
    </div>
  );
}
