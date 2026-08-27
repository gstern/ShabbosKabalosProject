import type { Category } from "@/lib/categories";

/**
 * Warm, simple illustrated figures — one per category. Flat shapes, no
 * facial features, tznius-appropriate. Rendered inline so they inherit
 * the site palette. The `celebrating` flag adds a little pop.
 */
export default function Avatar({
  category,
  celebrating = false,
  className = "h-20 w-auto",
}: {
  category: Category;
  celebrating?: boolean;
  className?: string;
}) {
  const navy = "#1c3350";
  const navySoft = "#2c4a6e";
  const gold = "#c19a3d";
  const skin = "#f0dfc8";
  const dark = "#22262c";

  const figure = (() => {
    switch (category) {
      case "man":
        return (
          <>
            {/* body */}
            <path d="M30 62 Q30 46 50 46 Q70 46 70 62 L70 96 Q70 100 66 100 L34 100 Q30 100 30 96 Z" fill={dark} />
            {/* shirt V */}
            <path d="M43 47 L50 60 L57 47 Q50 44 43 47 Z" fill="#ffffff" />
            {/* head */}
            <circle cx="50" cy="30" r="13" fill={skin} />
            {/* hat */}
            <ellipse cx="50" cy="19.5" rx="17" ry="4" fill={dark} />
            <path d="M39 19 Q39 8 50 8 Q61 8 61 19 Z" fill={dark} />
          </>
        );
      case "woman":
        return (
          <>
            {/* dress */}
            <path d="M36 58 Q38 46 50 46 Q62 46 64 58 L69 96 Q69 100 65 100 L35 100 Q31 100 31 96 Z" fill={navySoft} />
            {/* collar */}
            <circle cx="50" cy="48" r="3.5" fill={gold} />
            {/* head */}
            <circle cx="50" cy="30" r="13" fill={skin} />
            {/* headcovering */}
            <path d="M36 30 Q36 15 50 15 Q64 15 64 30 Q64 22 50 22 Q36 22 36 30 Z" fill={gold} />
            <path d="M37 27 Q37 17 50 17 Q63 17 63 27 Q57 21 50 21 Q43 21 37 27 Z" fill={gold} />
          </>
        );
      case "boy":
        return (
          <>
            {/* body (shorter) */}
            <path d="M33 68 Q33 55 50 55 Q67 55 67 68 L67 97 Q67 100 64 100 L36 100 Q33 100 33 97 Z" fill={navy} />
            {/* shirt V */}
            <path d="M44 56 L50 66 L56 56 Q50 53 44 56 Z" fill="#ffffff" />
            {/* head */}
            <circle cx="50" cy="41" r="12" fill={skin} />
            {/* kippah */}
            <path d="M41 33 Q45 28 53 29 Q58 30 59 33 Q54 30 49 30.5 Q44 31 41 33 Z" fill={dark} />
          </>
        );
      case "girl":
        return (
          <>
            {/* dress (shorter) */}
            <path d="M37 66 Q39 55 50 55 Q61 55 63 66 L66 97 Q66 100 63 100 L37 100 Q34 100 34 97 Z" fill={gold} />
            <circle cx="50" cy="58" r="3" fill={navy} />
            {/* head */}
            <circle cx="50" cy="41" r="12" fill={skin} />
            {/* hair + pigtails */}
            <path d="M38 41 Q38 27 50 27 Q62 27 62 41 Q62 33 50 33 Q38 33 38 41 Z" fill="#5b3a1e" />
            <circle cx="35.5" cy="42" r="4.5" fill="#5b3a1e" />
            <circle cx="64.5" cy="42" r="4.5" fill="#5b3a1e" />
          </>
        );
    }
  })();

  return (
    <span className={`avatar-wrap inline-block ${celebrating ? "avatar-pop" : ""}`}>
      <svg
        viewBox="0 0 100 104"
        className={className}
        role="img"
        aria-label={category}
      >
        {figure}
      </svg>
    </span>
  );
}
