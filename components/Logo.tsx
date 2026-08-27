import fs from "node:fs";
import path from "node:path";
import { shul } from "@/lib/shul";

// Renders the Adas Torah logo once public/logo.png (or logo.svg / logo-white.png)
// exists — drop the files in and every slot lights up. Until then, a clean
// text wordmark stands in.

function logoFile(...names: string[]): string | null {
  for (const name of names) {
    if (fs.existsSync(path.join(process.cwd(), "public", name))) return `/${name}`;
  }
  return null;
}

/** Header/footer mark on dark navy — prefers a white/knockout version. */
export function LogoOnDark({ className = "h-10 w-auto" }: { className?: string }) {
  const src = logoFile("logo-white.svg", "logo-white.png", "logo.svg", "logo.png");
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={shul.name} className={className} />;
  }
  return (
    <span className="font-display tracking-[0.18em] uppercase text-gold-soft text-sm">
      {shul.name}
    </span>
  );
}

/**
 * LINK Kollel mark on dark navy. Drop public/link-logo-white.png (or .svg /
 * link-logo.png) in and it replaces the text wordmark automatically.
 */
export function LinkLogoOnDark({ className = "h-9 w-auto" }: { className?: string }) {
  const src = logoFile(
    "link-logo-white.svg",
    "link-logo-white.png",
    "link-logo.svg",
    "link-logo.png"
  );
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={shul.partnerName} className={className} />;
  }
  return (
    <span className="font-display tracking-[0.18em] uppercase text-gold-soft text-sm text-center">
      {shul.partnerName}
    </span>
  );
}

/** LINK Kollel mark on light/cream backgrounds. */
export function LinkLogoOnLight({ className = "h-10 w-auto" }: { className?: string }) {
  const src = logoFile("link-logo.svg", "link-logo.png");
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={shul.partnerName} className={className} />;
  }
  return (
    <span className="font-display tracking-[0.18em] uppercase text-navy text-sm text-center">
      {shul.partnerName}
    </span>
  );
}

/** Mark on light/cream backgrounds. */
export function LogoOnLight({ className = "h-12 w-auto" }: { className?: string }) {
  const src = logoFile("logo.svg", "logo.png");
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={shul.name} className={className} />;
  }
  return (
    <span className="font-display tracking-[0.18em] uppercase text-navy text-sm">
      {shul.name}
    </span>
  );
}
