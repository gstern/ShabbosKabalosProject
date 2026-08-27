-- ============================================================
-- THE ELUL SHABBOS PROJECT — new-shul database setup (one paste)
-- Run this once in your Neon project's SQL Editor. It creates every
-- table and loads the campaign's commitment list. Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS "Household" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "familyName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "email2" TEXT,
    "email3" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "smsOptIn" BOOLEAN NOT NULL DEFAULT true,
    "emailOptIn" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Member" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isChild" BOOLEAN NOT NULL DEFAULT false,
    "gender" TEXT,
    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Suggestion" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "unitLabel" TEXT NOT NULL,
    "unitValue" INTEGER NOT NULL DEFAULT 1,
    "categories" TEXT NOT NULL DEFAULT 'both',
    "audience" TEXT NOT NULL DEFAULT 'both',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Goal" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "suggestionId" TEXT,
    "customTitle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedInAt" TIMESTAMP(3),
    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Campaign" (
    "id" TEXT NOT NULL DEFAULT 'campaign',
    "name" TEXT NOT NULL DEFAULT 'The Elul Shabbos Project',
    "startDate" TIMESTAMP(3) NOT NULL,
    "weeks" INTEGER NOT NULL DEFAULT 4,
    "signupDeadline" TIMESTAMP(3),
    "pledgePerSignup" INTEGER NOT NULL DEFAULT 5,
    "pledgePerCheckin" INTEGER NOT NULL DEFAULT 0,
    "charityName" TEXT NOT NULL DEFAULT 'Tomchei Shabbos',
    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MessageLog" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RaffleDraw" (
    "id" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "householdId" TEXT NOT NULL,
    "familyName" TEXT NOT NULL,
    "drawnAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RaffleDraw_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Household_token_key" ON "Household"("token");
CREATE INDEX IF NOT EXISTS "Household_phone_idx" ON "Household"("phone");
CREATE INDEX IF NOT EXISTS "Household_email_idx" ON "Household"("email");
CREATE INDEX IF NOT EXISTS "Member_householdId_idx" ON "Member"("householdId");
CREATE INDEX IF NOT EXISTS "Goal_memberId_week_idx" ON "Goal"("memberId", "week");
CREATE INDEX IF NOT EXISTS "Goal_week_idx" ON "Goal"("week");
CREATE INDEX IF NOT EXISTS "MessageLog_householdId_kind_week_idx" ON "MessageLog"("householdId", "kind", "week");
CREATE UNIQUE INDEX IF NOT EXISTS "RaffleDraw_week_key" ON "RaffleDraw"("week");

DO $$ BEGIN
  ALTER TABLE "Member" ADD CONSTRAINT "Member_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Goal" ADD CONSTRAINT "Goal_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Goal" ADD CONSTRAINT "Goal_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "Suggestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Campaign row (edit name/charity/pledge later in /admin)
INSERT INTO "Campaign" ("id","name","startDate","weeks","signupDeadline","pledgePerSignup","pledgePerCheckin","charityName")
VALUES ('campaign','The Elul Shabbos Project',CURRENT_TIMESTAMP,4,NULL,5,0,'Tomchei Shabbos')
ON CONFLICT ("id") DO NOTHING;

-- ------------------------------------------------------------
-- The commitment list (audience: adult / child / both).
-- Everything is editable afterward in /admin, including hiding
-- items or switching on the extra ideas at the bottom.
-- ------------------------------------------------------------
INSERT INTO "Suggestion" ("id","title","detail","unitLabel","unitValue","categories","sortOrder","active") VALUES
('sug_a01','Learn Hilchos Shabbos at the table','A few minutes of practical halacha at the seudah.','tables learning Hilchos Shabbos',1,'adult',1,true),
('sug_a02','Prepare and say a dvar Torah at the table','Prepare something on the parsha to share at the seudah.','divrei Torah shared',1,'both',2,true),
('sug_a03','Keep your phone off for the first 30 minutes after Shabbos','Don''t rush back into the week — let Shabbos linger before the phone goes on.','minutes added to Shabbos',30,'adult',3,true),
('sug_a04','Come 20 minutes early Shabbos morning to learn or join a shiur','Learn on your own or join a shiur before davening.','minutes of extra learning',20,'both',4,true),
('sug_a05','Eat a proper Melava Malka','Escort the Shabbos Queen out properly on Motzei Shabbos.','Melava Malkas eaten',1,'adult',5,true),
('sug_a06','Set the Shabbos table Thursday night','Walk into Friday with the table already glowing.','tables set early',1,'adult',6,true),
('sug_a07','Be fully dressed in bigdei Shabbos by zman hadlakas neiros','Fully ready, dressed b''kavod, by the zman of candle lighting.','times ready before candle lighting',1,'both',7,true),
('sug_a08','Wash for Seudah Shlishis','Make Seudah Shlishis a proper seudah with hamotzi.','seudos shlishis with hamotzi',1,'adult',8,true),
('sug_a09','Say 3 perakim of Tehillim by candle lighting','Start Shabbos with Tehillim as the candles are lit.','perakim of Tehillim said',3,'both',9,true),
('sug_a10','Call someone who''d appreciate it before Shabbos','A parent, a grandparent, someone alone — a pre-Shabbos hello.','pre-Shabbos calls made',1,'adult',10,true),
('sug_a11','Wear bigdei Shabbos outside the house, all of Shabbos','Your Shabbos best whenever you''re out, from candle lighting to havdalah.','Shabbosos in full bigdei Shabbos',1,'both',11,true),
('sug_k01','Spend 15 minutes helping prepare for Shabbos','Set the table, help in the kitchen — 15 minutes of kavod Shabbos.','minutes children helped for Shabbos',15,'child',12,true),
('sug_k02','Sing zemiros at the table','Bring the niggunim — lead or join the zemiros at the seudah.','tables singing zemiros',1,'child',13,true),
('sug_k04','Children: come to shul and stay through Kabbalas Shabbos','Be there from Lecha Dodi through the end.','Kabbalas Shabbos davened in shul',1,'child',14,true),
('sug_o15','Put your phone away 30 minutes before Shabbos','Ease into Shabbos without the last-minute scramble.','minutes added to Shabbos',30,'adult',15,false),
('sug_o16','Do Shnayim Mikra on the parsha this week','Twice mikra, once targum, before Shabbos is out.','parshiyos completed',1,'adult',16,false),
('sug_o17','Be in shul before Lecha Dodi on Friday night','Greet the Shabbos Queen from the first pasuk.','on-time Kabbalas Shabbos arrivals',1,'both',17,false),
('sug_o18','No talking during davening and leining','The whole Shabbos, from start to finish.','quiet davenings',1,'both',18,false),
('sug_o19','Bentch from a bentcher at every Shabbos seudah','Word by word, from the page.','seudos bentched from a bentcher',3,'both',19,false),
('sug_o20','Invite a guest to a Shabbos meal','Share your table with someone new.','guests hosted',1,'adult',20,false),
('sug_o21','Ask each of your kids a parsha question at the table','Turn the seudah into a conversation.','parsha conversations',1,'adult',21,false),
('sug_o22','Stay at the table until bentching at every seudah','Be part of the whole seudah, start to finish.','full seudos at the table',1,'child',22,false),
('sug_o23','Clear the table after each seudah','A simple, real way to give kavod to Shabbos.','tables cleared',1,'child',23,false),
('sug_o24','Come to Seudah Shlishis in shul','Finish Shabbos together with the shul.','seudos shlishis in shul',1,'both',24,false)
ON CONFLICT ("id") DO NOTHING;
