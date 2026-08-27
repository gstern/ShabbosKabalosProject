/**
 * Community configuration — everything shul-specific in one place.
 *
 * Defaults are the original Adas Torah deployment; a new shul overrides them
 * entirely through environment variables (see deploy/NEW-SHUL-SETUP.md), so
 * forks never need to edit code. NEXT_PUBLIC_ vars are inlined at build time
 * and safe to import from client components.
 */

function clean(v: string | undefined): string | undefined {
  const t = v?.trim();
  return t ? t : undefined;
}

const partnerRaw = clean(process.env.NEXT_PUBLIC_PARTNER_NAME) ?? "LINK Kollel";

export const shul = {
  /** The shul's name, e.g. "Adas Torah". */
  name: clean(process.env.NEXT_PUBLIC_SHUL_NAME) ?? "Adas Torah",
  /** Optional partner community shown next to the shul ("none" hides it). */
  partnerName: partnerRaw.toLowerCase() === "none" ? "" : partnerRaw,
  /** City line for the footer. */
  city: clean(process.env.NEXT_PUBLIC_SHUL_CITY) ?? "Los Angeles",
  /** Public site URL (also used in emails and WhatsApp blast texts). */
  siteUrl: (clean(process.env.NEXT_PUBLIC_BASE_URL) ?? "https://shabboswithadas.com").replace(
    /\/$/,
    ""
  ),
};

/** "LINK Kollel" -> "LINK" for the welcome popup's "Welcome, X Community!" */
export function partnerShortName(): string {
  return shul.partnerName.replace(/\s+Kollel$/i, "");
}

/** True when this deployment is the original Adas Torah site (keeps the
 * Rav-specific "Why we're doing this" text; forks get a generic version). */
export function isAdasDeployment(): boolean {
  return shul.name === "Adas Torah";
}
