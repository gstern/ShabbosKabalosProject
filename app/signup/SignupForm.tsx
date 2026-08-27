"use client";

import { useState } from "react";
import { audienceMatches, type Category } from "@/lib/categories";
import Avatar from "@/components/Avatar";
import type { SuggestionOption } from "@/lib/types";

type PersonDraft = {
  name: string;
  audience: "adult" | "child" | null;
  avatar: Category | null;
  suggestionIds: string[];
  useCustom: boolean;
  customTitle: string;
};

const emptyPerson = (): PersonDraft => ({
  name: "",
  audience: null,
  avatar: null,
  suggestionIds: [],
  useCustom: false,
  customTitle: "",
});

export default function SignupForm({
  suggestions,
  charityName = "Tomchei Shabbos",
  pledge = 5,
}: {
  suggestions: SuggestionOption[];
  charityName?: string;
  pledge?: number;
}) {
  const [familyName, setFamilyName] = useState("");
  const [phone, setPhone] = useState("");
  const [emails, setEmails] = useState<string[]>([""]);
  const [people, setPeople] = useState<PersonDraft[]>([emptyPerson()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ token: string } | null>(null);

  const updatePerson = (i: number, patch: Partial<PersonDraft>) =>
    setPeople((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const togglePick = (i: number, id: string) =>
    setPeople((ps) =>
      ps.map((p, j) => {
        if (j !== i) return p;
        const has = p.suggestionIds.includes(id);
        return {
          ...p,
          suggestionIds: has
            ? p.suggestionIds.filter((x) => x !== id)
            : [...p.suggestionIds, id],
        };
      })
    );

  async function submit() {
    setError(null);
    if (!familyName.trim()) {
      setError("Please enter your family (last) name.");
      return;
    }
    if (!emails.some((e) => e.trim())) {
      setError("Please enter an email so we can send your weekly reminders.");
      return;
    }
    for (const p of people) {
      if (!p.name.trim()) {
        setError("Please give every person a first name.");
        return;
      }
      if (!p.audience) {
        setError(`Choose adult or child for ${p.name.trim() || "each person"}.`);
        return;
      }
      if (!p.avatar) {
        setError(`Pick an avatar for ${p.name.trim() || "each person"}.`);
        return;
      }
      if (p.suggestionIds.length === 0 && !(p.useCustom && p.customTitle.trim())) {
        setError(`Pick at least one commitment for ${p.name.trim()} — or write in your own.`);
        return;
      }
      if (p.useCustom && !p.customTitle.trim()) {
        setError(`Write in what ${p.name.trim()} is taking on — or unselect "My own idea".`);
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyName: familyName.trim(),
          phone: phone.trim() || null,
          emails: emails.map((e) => e.trim()).filter(Boolean),
          members: people.map((p) => ({
            name: p.name.trim(),
            category: p.avatar,
            suggestionIds: p.suggestionIds,
            customTitle: p.useCustom && p.customTitle.trim() ? p.customTitle.trim() : null,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      try {
        document.cookie = `elul_token=${encodeURIComponent(data.token)}; path=/; max-age=15552000; SameSite=Lax`;
      } catch {}
      setDone({ token: data.token });
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    const link = `${window.location.origin}/c/${done.token}`;
    return (
      <div className="bg-white rounded-2xl border border-parchment shadow-sm p-6 sm:p-8 text-center">
        <div className="text-5xl mb-4">🕯️</div>
        <h2 className="font-display text-2xl text-navy mb-3">
          You&rsquo;re in — welcome!
        </h2>
        <p className="text-ink-soft mb-6">
          Your family profile is ready, and your commitments are set for the
          whole campaign. We&rsquo;ll email you before each Shabbos, and again
          afterward to check in. Your family&rsquo;s ${pledge} is on its way to{" "}
          {charityName}.
        </p>
        <a
          href={link}
          className="inline-block bg-gold text-navy-deep font-semibold rounded-lg px-8 py-3.5 text-lg hover:bg-gold-soft transition-colors mb-4"
        >
          See my family profile
        </a>
        <div className="bg-parchment/60 rounded-lg p-4 text-left">
          <p className="text-sm text-ink-soft mb-1">Your personal link (also in every reminder):</p>
          <a href={link} className="text-navy font-medium break-all underline underline-offset-2">
            {link}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contact */}
      <section className="bg-white rounded-2xl border border-parchment shadow-sm p-5 sm:p-6">
        <h2 className="font-semibold text-navy mb-1">Your family</h2>
        <p className="text-sm text-ink-soft mb-4">
          Weekly reminders arrive by email. Phone is optional.
        </p>
        <div className="space-y-3">
          {emails.map((em, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="email"
                inputMode="email"
                placeholder={i === 0 ? "Email (for weekly reminders)" : `Email ${i + 1}`}
                value={em}
                onChange={(e) =>
                  setEmails((es) => es.map((x, j) => (j === i ? e.target.value : x)))
                }
                className="flex-1 rounded-lg border border-parchment bg-cream px-4 py-3 outline-none focus:border-gold"
              />
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => setEmails((es) => es.filter((_, j) => j !== i))}
                  className="text-sm text-ink-soft underline hover:text-navy shrink-0"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          {emails.length < 3 && (
            <button
              type="button"
              onClick={() => setEmails((es) => [...es, ""])}
              className="text-sm text-navy underline underline-offset-2 hover:text-navy-deep"
            >
              + Add another email (both parents get the reminders)
            </button>
          )}
          <input
            type="tel"
            inputMode="tel"
            placeholder="Cell phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-parchment bg-cream px-4 py-3 outline-none focus:border-gold"
          />
          <input
            type="text"
            placeholder="Family (last) name"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            className="w-full rounded-lg border border-parchment bg-cream px-4 py-3 outline-none focus:border-gold"
          />
        </div>
      </section>

      {/* People */}
      {people.map((p, i) => (
        <section
          key={i}
          className="bg-white rounded-2xl border border-parchment shadow-sm p-5 sm:p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-navy">
              {i === 0 ? "Who's signing up?" : `Person ${i + 1}`}
            </h2>
            {i > 0 && (
              <button
                onClick={() => setPeople((ps) => ps.filter((_, j) => j !== i))}
                className="text-sm text-ink-soft hover:text-navy underline"
              >
                Remove
              </button>
            )}
          </div>

          <input
            type="text"
            placeholder="First name"
            value={p.name}
            onChange={(e) => updatePerson(i, { name: e.target.value })}
            className="w-full rounded-lg border border-parchment bg-cream px-4 py-3 outline-none focus:border-gold mb-3"
          />

          <div className="flex flex-wrap gap-2 mb-4">
            {(["adult", "child"] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() =>
                  updatePerson(i, {
                    audience: a,
                    avatar: null,
                    suggestionIds: [],
                    useCustom: false,
                    customTitle: "",
                  })
                }
                className={`rounded-full px-5 py-2 text-sm border transition-colors capitalize ${
                  p.audience === a
                    ? "border-gold bg-gold-pale text-navy-deep font-semibold"
                    : "border-parchment bg-cream hover:border-gold-soft"
                }`}
              >
                {a}
              </button>
            ))}
          </div>

          {p.audience && (
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm text-ink-soft">Their avatar:</span>
              {(p.audience === "adult"
                ? (["man", "woman"] as const)
                : (["boy", "girl"] as const)
              ).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => updatePerson(i, { avatar: c })}
                  className={`rounded-xl border p-1.5 transition-colors ${
                    p.avatar === c
                      ? "border-gold bg-gold-pale"
                      : "border-parchment bg-cream hover:border-gold-soft"
                  }`}
                  aria-label={c}
                >
                  <Avatar category={c} className="h-12 w-auto" />
                </button>
              ))}
            </div>
          )}

          {p.audience ? (
            <>
              <p className="text-sm text-ink-soft mb-2">
                For all four Shabbosos, {p.name.trim() || "they"}&rsquo;ll take on
                <span className="text-navy font-medium"> (pick one or more — you
                can add more later, but commitments are for keeps)</span>:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suggestions
                  .filter((s) => audienceMatches(s.categories, p.audience === "child"))
                  .map((s) => {
                    const selected = p.suggestionIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => togglePick(i, s.id)}
                        className={`text-left rounded-lg border px-3.5 py-2.5 text-sm transition-colors ${
                          selected
                            ? "border-gold bg-gold-pale text-navy-deep font-medium"
                            : "border-parchment bg-cream hover:border-gold-soft"
                        }`}
                      >
                        {selected ? "✓ " : ""}
                        {s.title}
                      </button>
                    );
                  })}
                <button
                  type="button"
                  onClick={() => updatePerson(i, { useCustom: !p.useCustom })}
                  className={`text-left rounded-lg border px-3.5 py-2.5 text-sm transition-colors ${
                    p.useCustom
                      ? "border-gold bg-gold-pale text-navy-deep font-medium"
                      : "border-parchment bg-cream hover:border-gold-soft"
                  }`}
                >
                  {p.useCustom ? "✓ " : ""}✏️ My own idea…
                </button>
              </div>
              {p.useCustom && (
                <input
                  type="text"
                  autoFocus
                  maxLength={120}
                  placeholder={`What will ${p.name.trim() || "they"} take on for Shabbos?`}
                  value={p.customTitle}
                  onChange={(e) => updatePerson(i, { customTitle: e.target.value })}
                  className="mt-2 w-full rounded-lg border border-gold-soft bg-cream px-4 py-3 outline-none focus:border-gold"
                />
              )}
              {p.audience === "child" && (
                <p className="mt-2 text-xs text-ink-soft">
                  🖍️ Need ideas for helping at home? See the{" "}
                  <a
                    href="/shabbos-helpers-guide.pdf"
                    target="_blank"
                    className="underline font-medium hover:text-navy"
                  >
                    Shabbos Helpers Guide
                  </a>
                  .
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-ink-soft italic">
              Choose Adult or Child to see their commitment options.
            </p>
          )}
        </section>
      ))}

      <button
        type="button"
        onClick={() => setPeople((ps) => [...ps, emptyPerson()])}
        className="w-full rounded-xl border-2 border-dashed border-gold-soft text-navy py-3.5 font-medium hover:bg-gold-pale transition-colors"
      >
        + Add another person
      </button>

      {error && (
        <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={submitting}
        onClick={submit}
        className="w-full bg-gold text-navy-deep text-lg font-semibold rounded-xl py-4 hover:bg-gold-soft transition-colors disabled:opacity-60"
      >
        {submitting ? "Signing you up…" : "Sign up for the four Shabbosos"}
      </button>
      <p className="text-xs text-ink-soft text-center pb-4">
        By signing up you agree to receive weekly reminder emails for this
        campaign. Unsubscribe anytime.
      </p>
    </div>
  );
}
