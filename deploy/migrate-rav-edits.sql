-- Migration for the Rav's revisions + multi-commitment signups.
-- Run in Neon's SQL Editor. Safe to run once, before or right after deploy.

-- 1. Allow more than one commitment per person per week
DROP INDEX IF EXISTS "Goal_memberId_week_key";
CREATE INDEX IF NOT EXISTS "Goal_memberId_week_idx" ON "Goal"("memberId", "week");

-- 2. Suggestion audiences become adult / child / both
UPDATE "Suggestion" SET "categories" = 'adult' WHERE "id" IN ('sug_a01','sug_a03','sug_a05','sug_a06','sug_a08','sug_a10','sug_o15','sug_o16','sug_o20','sug_o21');
UPDATE "Suggestion" SET "categories" = 'both'  WHERE "id" IN ('sug_a02','sug_a04','sug_a07','sug_a09','sug_a11','sug_o17','sug_o18','sug_o19','sug_o24');
UPDATE "Suggestion" SET "categories" = 'child' WHERE "id" IN ('sug_k01','sug_k02','sug_k04','sug_o22','sug_o23');

-- 3. Phone commitment: 30 minutes instead of Rabbeinu Tam
UPDATE "Suggestion" SET
  "title"  = 'Keep your phone off for the first 30 minutes after Shabbos',
  "detail" = 'Don''t rush back into the week — let Shabbos linger before the phone goes on.'
WHERE "id" = 'sug_a03';

-- 4. Child wording in the highlight-reel unit
UPDATE "Suggestion" SET "unitLabel" = 'minutes children helped for Shabbos' WHERE "id" = 'sug_k01';

-- 5. Campaign window (weeks are now fixed in code: Aug 22 / 29, Sep 5 / 19)
UPDATE "Campaign" SET "startDate" = '2026-08-16T07:00:00Z', "signupDeadline" = '2026-08-22T02:00:00Z' WHERE "id" = 'campaign';

-- Round 2: suggestion text clarifications
UPDATE "Suggestion" SET "title" = 'Come 20 minutes early Shabbos morning to learn or join the Michtav M''Eliyahu shiur', "detail" = 'Learn on your own or join the shiur in Michtav M''Eliyahu before davening.' WHERE "id" = 'sug_a04';
UPDATE "Suggestion" SET "title" = 'Be fully dressed in bigdei Shabbos by zman hadlakas neiros', "detail" = 'Fully ready, dressed b''kavod, by the zman of candle lighting.' WHERE "id" = 'sug_a07';
UPDATE "Suggestion" SET "title" = 'Wear bigdei Shabbos outside the house, all of Shabbos', "detail" = 'Your Shabbos best whenever you''re out, from candle lighting to havdalah.' WHERE "id" = 'sug_a11';
UPDATE "Suggestion" SET "title" = 'Children: come to shul and stay through Kabbalas Shabbos' WHERE "id" = 'sug_k04';

-- Round 3: multiple reminder emails per family
ALTER TABLE "Household" ADD COLUMN IF NOT EXISTS "email2" TEXT;
ALTER TABLE "Household" ADD COLUMN IF NOT EXISTS "email3" TEXT;
