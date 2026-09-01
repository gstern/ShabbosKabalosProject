import { prisma } from "@/lib/db";
import {
  getCampaign,
  activeWeek,
  shabbosOfWeek,
  formatShabbosDate,
} from "@/lib/campaign";
import { lastShabbosWeek, nextShabbosWeek } from "@/lib/household";
import { memberCategory } from "@/lib/categories";
import { getCampaignStats } from "@/lib/stats";
import { raffleEligible, raffleDraws } from "@/lib/raffle";
import { isAdmin } from "@/lib/adminAuth";
import { goalTitle } from "@/lib/household";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { shul } from "@/lib/shul";
import {
  loginAction,
  logoutAction,
  deleteHouseholdAction,
  deleteMemberAction,
  mergeHouseholdsAction,
  saveCampaignAction,
  saveSuggestionAction,
  deleteSuggestionAction,
  sendThursdayAction,
  sendCheckinAction,
  sendRaffleDeadlineAction,
  drawRaffleAction,
} from "./actions";

export const dynamic = "force-dynamic";
// Give the reminder-blast server actions room to finish a full send.
export const maxDuration = 60;

function laDateInput(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
}

const inputCls =
  "w-full rounded-lg border border-parchment bg-cream px-3 py-2 text-sm outline-none focus:border-gold";
const btnCls =
  "bg-navy text-cream rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-soft transition-colors";

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <h1 className="font-display text-2xl text-navy mb-4">Admin</h1>
        <form action={loginAction} className="space-y-3">
          <input
            type="password"
            name="password"
            placeholder="Admin password"
            className={inputCls}
          />
          <button type="submit" className={btnCls}>
            Log in
          </button>
        </form>
      </div>
    );
  }

  const campaign = await getCampaign();
  const week = activeWeek(campaign);
  const stats = await getCampaignStats(week);
  const suggestions = await prisma.suggestion.findMany({ orderBy: { sortOrder: "asc" } });
  const households = await prisma.household.findMany({
    include: {
      members: { include: { goals: { include: { suggestion: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  const messageCounts = await prisma.messageLog.groupBy({
    by: ["kind", "week"],
    _count: { _all: true },
    orderBy: [{ week: "asc" }],
  });

  const upWeek = Math.min(nextShabbosWeek(campaign), campaign.weeks);
  const doneWeek = lastShabbosWeek(campaign);
  const upShabbos = formatShabbosDate(shabbosOfWeek(campaign, upWeek));
  const preShabbosBlast = [
    `🕯️ *The Chicago Shabbos Project — Week ${upWeek} of ${campaign.weeks}*`,
    ``,
    `Shabbos ${upShabbos} is coming! Whatever you signed up for this week — this is your Shabbos to do it. 💪`,
    ``,
    `Not signed up yet? It takes 30 seconds, and the whole family can join:`,
    shul.siteUrl,
  ].join("\n");
  const checkinBlast = [
    `✨ *Gut voch, ${shul.name}!*`,
    ``,
    doneWeek >= 1
      ? `How did week ${doneWeek} go? Take 10 seconds to check in — keep your family's streak alive and move the whole community's numbers:`
      : `The campaign is about to begin — sign up now and pick your first commitment:`,
    `${shul.siteUrl}/find`,
    ``,
    `📖 Every family where *everyone* checks in is entered into this week's raffle!`,
  ].join("\n");

  // Raffle: one draw per week whose Shabbos has passed.
  const draws = await raffleDraws();
  const raffleWeeks = await Promise.all(
    Array.from({ length: doneWeek }, (_, i) => i + 1).map(async (w) => ({
      week: w,
      shabbos: formatShabbosDate(shabbosOfWeek(campaign, w)),
      eligible: await raffleEligible(w),
      winner: draws.find((d) => d.week === w) ?? null,
    }))
  );
  const latestWin = draws.find((d) => d.week === doneWeek);
  const winnerBlast = latestWin
    ? [
        `📖 *Raffle winner — week ${latestWin.week}!*`,
        ``,
        `Mazel tov to *The ${latestWin.familyName} Family* — everyone checked in, and they've won a $100 gift card to Z Berman Chicago! 🎉`,
        ``,
        `Want in next week? Everyone in the family checks in after Shabbos, and you're automatically entered:`,
        shul.siteUrl,
      ].join("\n")
    : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-navy">Campaign admin</h1>
        <form action={logoutAction}>
          <button className="text-sm text-ink-soft underline hover:text-navy">
            Log out
          </button>
        </form>
      </div>

      {/* Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          ["Households", stats.households],
          ["People", stats.members],
          ["Children", stats.kids],
          ["Check-ins", stats.checkins],
          [`$ to ${stats.charityName}`, `$${stats.pledgeTotal}`],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="bg-white rounded-xl border border-parchment px-4 py-4 text-center"
          >
            <div className="font-display text-2xl text-navy">{value}</div>
            <div className="text-xs text-ink-soft mt-1">{label}</div>
          </div>
        ))}
      </section>

      {/* Reminders */}
      <section className="bg-white rounded-xl border border-parchment p-5">
        <h2 className="font-semibold text-navy mb-3">Reminders</h2>
        <p className="text-sm text-ink-soft mb-4">
          Crons run automatically: Thursday 9am (pre-Shabbos), and check-in
          chasers Sunday &amp; Tuesday 9am — families who haven&rsquo;t checked
          in keep hearing from us every ~2 days until the window closes. These
          buttons trigger the same runs by hand — already-sent households are
          skipped, so it&rsquo;s safe to press twice.
        </p>
        <div className="flex flex-wrap gap-3 mb-4">
          <form action={sendThursdayAction}>
            <button className={btnCls}>Send Thursday reminder now</button>
          </form>
          <form action={sendCheckinAction}>
            <button className={btnCls}>Send check-in reminder now</button>
          </form>
          <a href="/api/admin/export" className={btnCls + " inline-block"}>
            Export CSV
          </a>
        </div>
        {messageCounts.length > 0 && (
          <p className="text-xs text-ink-soft">
            Sent so far:{" "}
            {messageCounts
              .map((m) => `${m.kind} w${m.week}: ${m._count._all}`)
              .join(" · ")}
          </p>
        )}
      </section>

      {/* One-off deadline nudge */}
      <section className="bg-white rounded-xl border border-parchment p-5">
        <h2 className="font-semibold text-navy mb-1">
          One-off reminder to whoever hasn&rsquo;t checked in
        </h2>
        <p className="text-sm text-ink-soft mb-4">
          Sends only to households still missing a check-in for the most
          recent Shabbos — good for a raffle-deadline push. Safe to press
          once; re-pressing only reaches anyone still missed.
        </p>
        <form action={sendRaffleDeadlineAction} className="space-y-3">
          <textarea
            name="deadlineText"
            rows={2}
            className="w-full rounded-lg border border-parchment bg-cream px-3 py-2 text-sm"
            defaultValue="The raffle for the $100 Z Berman Chicago gift card is tomorrow at 5pm — you must be checked in to qualify!"
          />
          <button className={btnCls}>Send reminder now</button>
        </form>
      </section>

      {/* WhatsApp blast texts */}
      <section className="bg-white rounded-xl border border-parchment p-5">
        <h2 className="font-semibold text-navy mb-1">
          WhatsApp / announcement blasts
        </h2>
        <p className="text-sm text-ink-soft mb-4">
          Ready-to-paste messages for the shul WhatsApp group — long-press to
          select and copy. They update automatically each week.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-navy mb-1">
              Before Shabbos (send Thursday/Friday):
            </p>
            <textarea
              readOnly
              rows={6}
              className="w-full rounded-lg border border-parchment bg-cream px-3 py-2 text-sm"
              defaultValue={preShabbosBlast}
            />
          </div>
          <div>
            <p className="text-xs font-medium text-navy mb-1">
              After Shabbos (send Motzei Shabbos/Sunday):
            </p>
            <textarea
              readOnly
              rows={6}
              className="w-full rounded-lg border border-parchment bg-cream px-3 py-2 text-sm"
              defaultValue={checkinBlast}
            />
          </div>
        </div>
      </section>

      {/* Gift card raffle */}
      <section className="bg-white rounded-xl border border-parchment p-5">
        <h2 className="font-semibold text-navy mb-1">📖 $100 Gift card raffle</h2>
        <p className="text-sm text-ink-soft mb-4">
          One winner per week, drawn from the families where{" "}
          <strong>everyone</strong> checked in for that Shabbos (late check-ins
          count). Best drawn Monday night or later, after the check-in window
          closes. Redrawing replaces the saved winner.
        </p>
        {raffleWeeks.length === 0 ? (
          <p className="text-sm text-ink-soft italic">
            The raffle opens after the first Shabbos — come back Motzei Shabbos.
          </p>
        ) : (
          <div className="space-y-4">
            {raffleWeeks.map((rw) => (
              <div key={rw.week} className="rounded-lg border border-parchment bg-cream/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <p className="font-medium text-navy">
                    Week {rw.week} · Shabbos {rw.shabbos}
                  </p>
                  {rw.winner ? (
                    <p className="text-sm bg-gold-pale text-navy-deep rounded-full px-3 py-1 font-medium">
                      🏆 The {rw.winner.familyName} Family
                    </p>
                  ) : (
                    <p className="text-sm text-ink-soft">no winner drawn yet</p>
                  )}
                </div>
                <p className="text-sm text-ink-soft mb-3">
                  {rw.eligible.length === 0 ? (
                    <em>No fully-checked-in families yet for this week.</em>
                  ) : (
                    <>
                      {rw.eligible.length}{" "}
                      {rw.eligible.length === 1 ? "family" : "families"} in the hat:{" "}
                      {rw.eligible
                        .map((f) => f.familyName ?? f.token)
                        .join(", ")}
                    </>
                  )}
                </p>
                {rw.eligible.length > 0 && (
                  <form action={drawRaffleAction}>
                    <input type="hidden" name="week" value={rw.week} />
                    {rw.winner ? (
                      <ConfirmSubmit
                        message={`Redraw week ${rw.week}? This replaces The ${rw.winner.familyName} Family as the saved winner.`}
                        className={btnCls}
                      >
                        Redraw winner
                      </ConfirmSubmit>
                    ) : (
                      <button className={btnCls}>🎲 Draw the winner</button>
                    )}
                  </form>
                )}
              </div>
            ))}
            {winnerBlast && (
              <div>
                <p className="text-xs font-medium text-navy mb-1">
                  Winner announcement (paste into the shul WhatsApp):
                </p>
                <textarea
                  readOnly
                  rows={7}
                  className="w-full rounded-lg border border-parchment bg-cream px-3 py-2 text-sm"
                  defaultValue={winnerBlast}
                />
              </div>
            )}
          </div>
        )}
      </section>

      {/* Households */}
      <section className="bg-white rounded-xl border border-parchment p-5 overflow-x-auto">
        <h2 className="font-semibold text-navy mb-3">
          Signups ({households.length} households)
        </h2>
        {households.length > 1 && (
          <details className="mb-4 rounded-lg border border-parchment bg-cream/60">
            <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-navy">
              Merge duplicate families
            </summary>
            <form
              action={mergeHouseholdsAction}
              className="px-4 pb-4 pt-2 flex flex-col sm:flex-row gap-3 sm:items-end"
            >
              <label className="text-xs text-ink-soft flex-1">
                Keep this family (link &amp; name survive)
                <select name="keepId" className={inputCls}>
                  {households.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.familyName ?? "(no name)"} · {h.email ?? h.phone ?? ""} ·{" "}
                      {h.members.length} {h.members.length === 1 ? "person" : "people"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-ink-soft flex-1">
                Fold this duplicate into it (everything moves over)
                <select name="absorbId" className={inputCls}>
                  {households.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.familyName ?? "(no name)"} · {h.email ?? h.phone ?? ""} ·{" "}
                      {h.members.length} {h.members.length === 1 ? "person" : "people"}
                    </option>
                  ))}
                </select>
              </label>
              <ConfirmSubmit
                message="Merge these two families? All people, check-ins, and emails move into the first family; the duplicate is removed. This cannot be undone."
                className={btnCls + " whitespace-nowrap"}
              >
                Merge
              </ConfirmSubmit>
            </form>
            <p className="px-4 pb-3 text-xs text-ink-soft">
              If the same person now appears twice after merging, remove the extra
              one with the ✕ next to their name.
            </p>
          </details>
        )}
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-ink-soft border-b border-parchment">
              <th className="py-2 pr-3">Contact</th>
              <th className="py-2 pr-3">People</th>
              <th className="py-2 pr-3">This week (w{week})</th>
              <th className="py-2 pr-3">Weeks</th>
              <th className="py-2">Link</th>
            </tr>
          </thead>
          <tbody>
            {households.map((h) => (
              <tr key={h.id} className="border-b border-parchment/60 align-top">
                <td className="py-2 pr-3 whitespace-nowrap">
                  {h.familyName && <div className="font-medium">{h.familyName}</div>}
                  {h.phone && <div>{h.phone}</div>}
                  {h.email && <div className="text-ink-soft">{h.email}</div>}
                  {h.email2 && <div className="text-ink-soft">{h.email2}</div>}
                  {h.email3 && <div className="text-ink-soft">{h.email3}</div>}
                </td>
                <td className="py-2 pr-3">
                  {h.members.map((m) => {
                    const cat = memberCategory(m);
                    const icon = { man: "👨", woman: "👩", boy: "👦", girl: "👧" }[cat];
                    return (
                      <div key={m.id} className="flex items-center gap-2">
                        <span>
                          {m.name} {icon}
                        </span>
                        <form action={deleteMemberAction} className="inline">
                          <input type="hidden" name="id" value={m.id} />
                          <ConfirmSubmit
                            message={`Remove ${m.name} and all their check-ins? This cannot be undone.`}
                            className="text-xs text-red-700/70 hover:text-red-700"
                          >
                            ✕
                          </ConfirmSubmit>
                        </form>
                      </div>
                    );
                  })}
                </td>
                <td className="py-2 pr-3">
                  {h.members.map((m) => {
                    const g = m.goals.find((g) => g.week === week);
                    return (
                      <div key={m.id} className="text-ink-soft">
                        {g ? goalTitle(g) : <em>not set</em>}
                        {g?.checkedInAt ? " ✓" : ""}
                      </div>
                    );
                  })}
                </td>
                <td className="py-2 pr-3">
                  {h.members.map((m) => (
                    <div key={m.id} className="font-mono text-xs tracking-wider">
                      {Array.from({ length: campaign.weeks }, (_, i) => {
                        const g = m.goals.find((g) => g.week === i + 1);
                        return g?.checkedInAt ? "✓" : g ? "·" : "–";
                      }).join(" ")}
                    </div>
                  ))}
                </td>
                <td className="py-2">
                  <div className="flex flex-col gap-1">
                    <a
                      href={`/c/${h.token}`}
                      className="text-navy underline underline-offset-2"
                    >
                      open
                    </a>
                    <form action={deleteHouseholdAction}>
                      <input type="hidden" name="id" value={h.id} />
                      <ConfirmSubmit
                        message={`Delete the ${h.familyName ?? ""} family entirely — every member and check-in? This cannot be undone.`}
                        className="text-xs text-red-700/70 underline hover:text-red-700"
                      >
                        delete family
                      </ConfirmSubmit>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {households.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-ink-soft">
                  No signups yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Suggestions */}
      <section className="bg-white rounded-xl border border-parchment p-5">
        <h2 className="font-semibold text-navy mb-1">Commitment options</h2>
        <p className="text-sm text-ink-soft mb-4">
          The unit label + value drive the homepage highlight reel (e.g. unit
          &ldquo;minutes added to Shabbos&rdquo; × 10 per check-in).
        </p>
        <div className="space-y-3">
          {suggestions.map((s) => (
            <details key={s.id} className="rounded-lg border border-parchment">
              <summary className="cursor-pointer px-4 py-2.5 text-sm flex items-center justify-between">
                <span>
                  {s.title}
                  {!s.active && (
                    <span className="ml-2 text-xs text-red-600">(hidden)</span>
                  )}
                </span>
                <span className="text-xs text-ink-soft">
                  {s.unitValue} × {s.unitLabel}
                </span>
              </summary>
              <form
                action={saveSuggestionAction}
                className="px-4 pb-4 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <input type="hidden" name="id" value={s.id} />
                <label className="text-xs text-ink-soft sm:col-span-2">
                  Title
                  <input name="title" defaultValue={s.title} className={inputCls} />
                </label>
                <label className="text-xs text-ink-soft sm:col-span-2">
                  Detail
                  <input name="detail" defaultValue={s.detail ?? ""} className={inputCls} />
                </label>
                <label className="text-xs text-ink-soft">
                  Unit label
                  <input name="unitLabel" defaultValue={s.unitLabel} className={inputCls} />
                </label>
                <label className="text-xs text-ink-soft">
                  Unit value
                  <input
                    name="unitValue"
                    type="number"
                    defaultValue={s.unitValue}
                    className={inputCls}
                  />
                </label>
                <label className="text-xs text-ink-soft">
                  Sort order
                  <input
                    name="sortOrder"
                    type="number"
                    defaultValue={s.sortOrder}
                    className={inputCls}
                  />
                </label>
                <div className="text-xs text-ink-soft sm:col-span-2">
                  Shown to
                  <div className="flex flex-wrap gap-3 mt-1 text-sm text-ink">
                    {(["adult", "child"] as const).map((c) => (
                      <label key={c} className="flex items-center gap-1.5 capitalize">
                        <input
                          type="checkbox"
                          name={`cat_${c}`}
                          defaultChecked={s.categories.includes(c) || s.categories.includes("both") || ["man","woman","boy","girl"].some((x) => s.categories.includes(x) && ((c === "adult" && (x === "man" || x === "woman")) || (c === "child" && (x === "boy" || x === "girl"))))}
                        />
                        {c}
                      </label>
                    ))}
                    <label className="flex items-center gap-1.5 ml-4">
                      <input type="checkbox" name="active" defaultChecked={s.active} />
                      Active (visible on the site)
                    </label>
                  </div>
                </div>
                <div className="sm:col-span-2 flex gap-3">
                  <button className={btnCls}>Save</button>
                  <button
                    formAction={deleteSuggestionAction}
                    className="text-sm text-red-700 underline"
                  >
                    Delete / hide
                  </button>
                </div>
              </form>
            </details>
          ))}
        </div>

        <details className="mt-4 rounded-lg border-2 border-dashed border-gold-soft">
          <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-navy">
            + Add a new option
          </summary>
          <form
            action={saveSuggestionAction}
            className="px-4 pb-4 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            <label className="text-xs text-ink-soft sm:col-span-2">
              Title
              <input name="title" placeholder="e.g. Bake challah" className={inputCls} />
            </label>
            <label className="text-xs text-ink-soft sm:col-span-2">
              Detail
              <input name="detail" className={inputCls} />
            </label>
            <label className="text-xs text-ink-soft">
              Unit label
              <input name="unitLabel" placeholder="challos baked" className={inputCls} />
            </label>
            <label className="text-xs text-ink-soft">
              Unit value
              <input name="unitValue" type="number" defaultValue={1} className={inputCls} />
            </label>
            <label className="text-xs text-ink-soft">
              Sort order
              <input name="sortOrder" type="number" defaultValue={99} className={inputCls} />
            </label>
            <div className="text-xs text-ink-soft sm:col-span-2">
              Shown to
              <div className="flex flex-wrap gap-3 mt-1 text-sm text-ink">
                {(["adult", "child"] as const).map((c) => (
                  <label key={c} className="flex items-center gap-1.5 capitalize">
                    <input type="checkbox" name={`cat_${c}`} defaultChecked />
                    {c}
                  </label>
                ))}
                <label className="flex items-center gap-1.5 ml-4">
                  <input type="checkbox" name="active" defaultChecked />
                  Active (visible on the site)
                </label>
              </div>
            </div>
            <div className="sm:col-span-2">
              <button className={btnCls}>Add option</button>
            </div>
          </form>
        </details>
      </section>

      {/* Campaign settings */}
      <section className="bg-white rounded-xl border border-parchment p-5">
        <h2 className="font-semibold text-navy mb-3">Campaign settings</h2>
        <form
          action={saveCampaignAction}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl"
        >
          <label className="text-xs text-ink-soft sm:col-span-2">
            Campaign name
            <input name="name" defaultValue={campaign.name} className={inputCls} />
          </label>
          <label className="text-xs text-ink-soft">
            Week 1 starts (Sunday)
            <input
              name="startDate"
              type="date"
              defaultValue={laDateInput(campaign.startDate)}
              className={inputCls}
            />
          </label>
          <label className="text-xs text-ink-soft">
            Number of weeks
            <input
              name="weeks"
              type="number"
              defaultValue={campaign.weeks}
              className={inputCls}
            />
          </label>
          <label className="text-xs text-ink-soft">
            Signup deadline (for the ${campaign.pledgePerSignup} pledge)
            <input
              name="signupDeadline"
              type="date"
              defaultValue={laDateInput(campaign.signupDeadline)}
              className={inputCls}
            />
          </label>
          <label className="text-xs text-ink-soft">
            Charity name
            <input name="charityName" defaultValue={campaign.charityName} className={inputCls} />
          </label>
          <label className="text-xs text-ink-soft">
            $ per family signup
            <input
              name="pledgePerSignup"
              type="number"
              defaultValue={campaign.pledgePerSignup}
              className={inputCls}
            />
          </label>
          <div className="sm:col-span-2">
            <button className={btnCls}>Save settings</button>
          </div>
        </form>
      </section>
    </div>
  );
}
