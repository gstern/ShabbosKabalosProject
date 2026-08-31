"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * One-time welcome for the LINK Kollel community joining the project.
 * Shown once per device (localStorage); while it's up, the JoinNudge popup
 * stands down for the session so the two never stack.
 */
export default function LinkWelcome({ partnerName = "LINK Kollel" }: { partnerName?: string }) {
  const [show, setShow] = useState(false);
  const shortName = partnerName.replace(/\s+Kollel$/i, "");

  useEffect(() => {
    try {
      if (localStorage.getItem("linkWelcome") === "1") return;
    } catch {}
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem("joinNudge", "1");
      } catch {}
      setShow(true);
    }, 800);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem("linkWelcome", "1");
    } catch {}
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-navy-deep/75 flex items-center justify-center p-4"
      onClick={dismiss}
    >
      <div
        className="bg-cream rounded-2xl max-w-md w-full p-8 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-5xl mb-3">🕯️✨</div>
        <p className="font-display tracking-[0.22em] uppercase text-sm text-gold mb-2">
          The Chicago Shabbos Project
        </p>
        <h2 className="font-display text-3xl text-navy mb-3">
          Welcome, {shortName} Community!
        </h2>
        <p className="text-ink-soft mb-5">
          {partnerName} has joined the Chicago Shabbos Project — one more
          community holding Shabbos together through the Yamim Noraim.
        </p>
        <div className="font-display text-navy-deep text-lg leading-relaxed mb-6">
          <p>Thank You Hashem for Yidden.</p>
          <p>Thank You Hashem for Elul.</p>
          <p>Thank You Hashem for Shabbos.</p>
        </div>
        <Link
          href="/signup"
          onClick={dismiss}
          className="block bg-gold text-navy-deep font-bold rounded-lg py-3.5 text-lg hover:bg-gold-soft transition-colors mb-3"
        >
          Join the campaign
        </Link>
        <button
          onClick={dismiss}
          className="text-sm text-ink-soft underline hover:text-navy"
        >
          Continue to the site
        </button>
      </div>
    </div>
  );
}
