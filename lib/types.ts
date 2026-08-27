import type { Category } from "@/lib/categories";

export type SuggestionOption = {
  id: string;
  title: string;
  detail: string | null;
  categories: string; // audience: "adult" | "child" | "both" (legacy CSVs tolerated)
};

export type PendingItem = {
  goalId: string;
  title: string;
  done: boolean;
};

export type MemberGoalView = {
  memberId: string;
  name: string;
  category: Category;
  isChild: boolean;
  /** Consecutive fully-checked-in (on-time) weeks for this person. */
  streak: number;
  /** The commitment titles this member holds for the campaign. */
  commitments: string[];
  /** Current suggestion ids (for pre-selecting the adjust picker). */
  currentSuggestionIds: string[];
  currentCustomTitle: string | null;
  /** Week awaiting check-ins (its Shabbos has passed). */
  pending: {
    week: number;
    shabbosLabel: string;
    late: boolean;
    items: PendingItem[];
  } | null;
  /** The upcoming Shabbos and what they're doing. */
  upcoming: {
    week: number;
    shabbosLabel: string;
    titles: string[];
  } | null;
  /** Whether commitments can still be adjusted (campaign not over). */
  canAdjust: boolean;
  /** Per-week history: "done" | "late" | "missed" | "set" | "none". */
  history: ("done" | "late" | "missed" | "set" | "none")[];
};
