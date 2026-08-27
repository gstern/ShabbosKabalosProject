import { prisma } from "@/lib/db";
import { getCampaign, shabbosOfWeek, formatShabbosDate } from "@/lib/campaign";
import SignupForm from "./SignupForm";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const campaign = await getCampaign();
  const suggestions = await prisma.suggestion.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, title: true, detail: true, categories: true },
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="font-display text-3xl text-navy mb-2">Join the campaign</h1>
      <p className="text-ink-soft mb-8">
        Sign up your whole household — each person takes on one or more
        commitments and holds them for the four Shabbosos of the campaign,
        {" "}{formatShabbosDate(shabbosOfWeek(campaign, 1))} through Shabbos
        Shuva, {formatShabbosDate(shabbosOfWeek(campaign, campaign.weeks))} —
        with the hope that they become permanent.
      </p>
      <SignupForm
        suggestions={suggestions}
        charityName={campaign.charityName}
        pledge={campaign.pledgePerSignup}
      />
    </div>
  );
}
