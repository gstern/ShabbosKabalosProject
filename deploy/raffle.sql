-- Pizza raffle: run this once in the Neon SQL Editor.
-- Stores one winner per campaign week, drawn from the admin page.

CREATE TABLE IF NOT EXISTS "RaffleDraw" (
    "id" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "householdId" TEXT NOT NULL,
    "familyName" TEXT NOT NULL,
    "drawnAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaffleDraw_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RaffleDraw_week_key" ON "RaffleDraw"("week");
