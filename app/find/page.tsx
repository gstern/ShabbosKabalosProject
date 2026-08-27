"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FindPage() {
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact: contact.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      router.push(`/c/${data.token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-3xl text-navy mb-2">Sign in</h1>
      <p className="text-ink-soft mb-6">
        Enter the email (or phone) you signed up with and we&rsquo;ll take you
        straight to your family&rsquo;s page — no password needed. Every
        reminder email has a direct link too.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <input
          type="text"
          inputMode="email"
          placeholder="Phone number or email"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className="w-full rounded-lg border border-parchment bg-white px-4 py-3 outline-none focus:border-gold"
        />
        {error && (
          <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !contact.trim()}
          className="w-full bg-gold text-navy-deep font-semibold rounded-lg py-3.5 hover:bg-gold-soft transition-colors disabled:opacity-60"
        >
          {busy ? "Looking you up…" : "Take me to my family page"}
        </button>
      </form>
      <p className="text-sm text-ink-soft mt-6 text-center">
        Haven&rsquo;t signed up yet?{" "}
        <a href="/signup" className="underline hover:text-navy">
          Join the campaign
        </a>
      </p>
    </div>
  );
}
