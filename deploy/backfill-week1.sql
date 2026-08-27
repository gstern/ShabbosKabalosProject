-- One-time heal for week 1: families who signed up on Sunday Aug 23 (after
-- the week rolled over at midnight PT) got goals starting at week 2, so
-- their page had nothing to check in for Shabbos August 22. This copies
-- each such member's week-2 commitments back to week 1 so they can check in.
--
-- Safe to run more than once (the NOT EXISTS guard skips anyone who already
-- has week-1 goals). Run in the Neon SQL Editor, ideally before Monday night.

INSERT INTO "Goal" ("id", "memberId", "week", "suggestionId", "customTitle", "createdAt")
SELECT gen_random_uuid()::text, g."memberId", 1, g."suggestionId", g."customTitle", NOW()
FROM "Goal" g
WHERE g."week" = 2
  AND g."createdAt" >= '2026-08-23T07:00:00Z'  -- Sunday 12:00am PT
  AND NOT EXISTS (
    SELECT 1 FROM "Goal" x WHERE x."memberId" = g."memberId" AND x."week" = 1
  );

-- See who was healed:
SELECT h."familyName", m."name", COUNT(*) AS week1_goals
FROM "Goal" g
JOIN "Member" m ON m."id" = g."memberId"
JOIN "Household" h ON h."id" = m."householdId"
WHERE g."week" = 1 AND g."createdAt" >= '2026-08-23T07:00:00Z'
GROUP BY h."familyName", m."name"
ORDER BY h."familyName";
