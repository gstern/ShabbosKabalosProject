"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import { audienceMatches } from "@/lib/categories";
import type { MemberGoalView, SuggestionOption } from "@/lib/types";

function ProgressRow({
  history,
  totalWeeks,
}: {
  history: MemberGoalView["history"];
  totalWeeks: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {history.map((h, i) => (
        <div
          key={i}
          className={
            "size-7 rounded-full flex items-center justify-center text-xs font-semibold border " +
            (h === "done"
              ? "bg-gold text-navy-deep border-gold"
              : h === "late"
                ? "bg-gold-pale text-navy-deep border-gold-soft"
                : h === "set"
                  ? "bg-white text-navy border-navy/40"
                  : h === "missed"
                    ? "bg-parchment text-ink-soft border-parchment"
                    : "bg-transparent text-ink-soft/50 border-parchment")
          }
          title={`Week ${i + 1}`}
        >
          {h === "done" || h === "late" ? "✓" : i + 1}
        </div>
      ))}
      <span className="text-xs text-ink-soft ml-1">of {totalWeeks} weeks</span>
    </div>
  );
}

function AddPicker({
  suggestions,
  member,
  onSave,
  onCancel,
  busy,
}: {
  suggestions: SuggestionOption[];
  member: MemberGoalView;
  onSave: (suggestionIds: string[], customTitle: string | null) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [useCustom, setUseCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const held = new Set(member.currentSuggestionIds);
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const available = suggestions.filter(
    (s) => audienceMatches(s.categories, member.category) && !held.has(s.id)
  );

  return (
    <div>
      <p className="text-sm text-ink-soft mb-2">
        Commitments are for keeps through Shmini Atzeres — you can{" "}
        <span className="font-medium text-navy">add</span> more, but not remove.
        Pick what to add:
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        {available.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={busy}
            onClick={() => toggle(s.id)}
            className={`text-left rounded-lg border px-3.5 py-2.5 text-sm transition-colors disabled:opacity-60 ${
              selected.has(s.id)
                ? "border-gold bg-gold-pale text-navy-deep font-medium"
                : "border-parchment bg-cream hover:border-gold-soft"
            }`}
          >
            {selected.has(s.id) ? "✓ " : ""}
            {s.title}
          </button>
        ))}
        <button
          type="button"
          disabled={busy}
          onClick={() => setUseCustom((v) => !v)}
          className={`text-left rounded-lg border px-3.5 py-2.5 text-sm transition-colors disabled:opacity-60 ${
            useCustom
              ? "border-gold bg-gold-pale text-navy-deep font-medium"
              : "border-parchment bg-cream hover:border-gold-soft"
          }`}
        >
          {useCustom ? "✓ " : ""}✏️ My own idea…
        </button>
      </div>
      {useCustom && (
        <input
          type="text"
          autoFocus
          maxLength={120}
          placeholder={`What will ${member.name} take on for Shabbos?`}
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          className="mb-3 w-full rounded-lg border border-gold-soft bg-cream px-4 py-3 text-sm outline-none focus:border-gold"
        />
      )}
      <div className="flex gap-3">
        <button
          type="button"
          disabled={busy || (selected.size === 0 && !(useCustom && customTitle.trim()))}
          onClick={() =>
            onSave([...selected], useCustom && customTitle.trim() ? customTitle.trim() : null)
          }
          className="bg-navy text-cream rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-navy-soft transition-colors disabled:opacity-60"
        >
          {(() => {
            const n = selected.size + (useCustom && customTitle.trim() ? 1 : 0);
            return `Add ${n > 0 ? `${n} ` : ""}commitment${n === 1 ? "" : "s"}`;
          })()}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-ink-soft underline hover:text-navy">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function CheckinClient({
  token,
  members,
  suggestions,
  totalWeeks,
}: {
  token: string;
  members: MemberGoalView[];
  suggestions: SuggestionOption[];
  totalWeeks: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState<Record<string, boolean>>({});
  const [adjusting, setAdjusting] = useState<Record<string, boolean>>({});

  // Remember this family on the device so the header shows "My family".
  useEffect(() => {
    try {
      document.cookie = `elul_token=${encodeURIComponent(token)}; path=/; max-age=15552000; SameSite=Lax`;
    } catch {}
  }, [token]);

  async function post(url: string, body: object) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong — try again.");
      }
      router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong — try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function checkIn(m: MemberGoalView, goalId: string) {
    const ok = await post("/api/checkin", { token, goalId });
    if (ok) setCelebrating((c) => ({ ...c, [m.memberId]: true }));
  }

  async function addCommitments(
    m: MemberGoalView,
    suggestionIds: string[],
    customTitle: string | null
  ) {
    const ok = await post("/api/goal", {
      token,
      memberId: m.memberId,
      suggestionIds,
      customTitle,
    });
    if (ok) setAdjusting((a) => ({ ...a, [m.memberId]: false }));
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
          {error}
        </p>
      )}

      {members.map((m) => (
        <section
          key={m.memberId}
          className="bg-white rounded-2xl border border-parchment shadow-sm p-5 sm:p-6"
        >
          <div className="flex items-start gap-4 mb-4">
            <Avatar
              category={m.category}
              celebrating={!!celebrating[m.memberId]}
              className="h-20 w-auto shrink-0"
            />
            <div className="min-w-0">
              <h2 className="font-display text-xl text-navy flex items-center gap-2 flex-wrap">
                {m.name}
                {m.streak > 0 && (
                  <span className="text-xs bg-gold-pale text-navy-deep rounded-full px-2.5 py-0.5 font-sans font-medium">
                    🔥 {m.streak}-week streak
                  </span>
                )}
              </h2>
              {m.commitments.length > 0 && (
                <p className="text-sm text-ink-soft mt-0.5">
                  {m.commitments.join(" · ")}
                </p>
              )}
              <div className="mt-2">
                <ProgressRow history={m.history} totalWeeks={totalWeeks} />
              </div>
            </div>
          </div>

          {celebrating[m.memberId] && (
            <div className="mb-4 rounded-lg bg-gold-pale border border-gold/40 px-4 py-3 text-navy-deep text-sm">
              🎉 <strong>Beautiful!</strong> The community-wide count just went up —
              same commitment again next Shabbos. Keep the streak going!
            </div>
          )}

          {m.pending && (
            <div className="mb-4 rounded-xl border border-navy/15 bg-cream p-4">
              <p className="text-xs uppercase tracking-wide text-ink-soft mb-1">
                Week {m.pending.week} · Shabbos {m.pending.shabbosLabel}
              </p>
              <p className="text-xs text-ink-soft mb-3">
                {m.pending.late
                  ? "The streak window has closed — but check in anyway, it still counts toward the community-wide totals."
                  : "Check in by Monday night to keep the streak."}
              </p>
              <div className="space-y-2">
                {m.pending.items.map((item) => (
                  <div key={item.goalId} className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-navy">{item.title}</span>
                    {item.done ? (
                      <span className="text-sm text-navy-deep bg-gold-pale rounded-full px-3 py-1">✓ done</span>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => checkIn(m, item.goalId)}
                        className="bg-gold text-navy-deep font-semibold rounded-lg px-4 py-1.5 text-sm hover:bg-gold-soft transition-colors disabled:opacity-60"
                      >
                        ✓ I did it!
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {adjusting[m.memberId] ? (
            <div className="rounded-xl border border-gold/40 bg-white p-4">
              <AddPicker
                suggestions={suggestions}
                member={m}
                busy={busy}
                onSave={(ids, custom) => addCommitments(m, ids, custom)}
                onCancel={() => setAdjusting((a) => ({ ...a, [m.memberId]: false }))}
              />
            </div>
          ) : m.upcoming ? (
            <div className="rounded-xl border border-parchment bg-parchment/40 p-4">
              <p className="text-xs uppercase tracking-wide text-ink-soft mb-1">
                Next Shabbos · {m.upcoming.shabbosLabel}
              </p>
              <p className="font-medium text-navy">{m.upcoming.titles.join(" · ")}</p>
              {m.canAdjust && (
                <button
                  type="button"
                  onClick={() => setAdjusting((a) => ({ ...a, [m.memberId]: true }))}
                  className="mt-2 text-sm text-ink-soft underline hover:text-navy"
                >
                  + Add another commitment
                </button>
              )}
            </div>
          ) : m.canAdjust ? (
            <div className="rounded-xl border border-gold/40 bg-white p-4">
              <p className="text-sm font-medium text-navy mb-2">
                Set {m.name}&rsquo;s commitments for the rest of the campaign:
              </p>
              <AddPicker
                suggestions={suggestions}
                member={m}
                busy={busy}
                onSave={(ids, custom) => addCommitments(m, ids, custom)}
                onCancel={() => {}}
              />
            </div>
          ) : (
            !m.pending && (
              <p className="text-sm text-ink-soft">
                The campaign has wrapped up — thank you for being part of it!
              </p>
            )
          )}
        </section>
      ))}

      <p className="text-center text-sm text-ink-soft pb-4">
        Want to add another family member?{" "}
        <a href="/signup" className="underline hover:text-navy">
          Sign them up here
        </a>{" "}
        with the same email.
      </p>
    </div>
  );
}
