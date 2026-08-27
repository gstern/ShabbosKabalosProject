-- Migration: category-based options (safe to run on the live database).
-- Run this BEFORE the code update deploys.

ALTER TABLE "Suggestion" ADD COLUMN IF NOT EXISTS "categories" TEXT NOT NULL DEFAULT 'man,woman,boy,girl';

UPDATE "Suggestion" SET "categories" = 'man,woman' WHERE "id" IN ('sug_a01','sug_a03','sug_a05','sug_a06','sug_a08','sug_a10');
UPDATE "Suggestion" SET "categories" = 'man,woman,boy,girl' WHERE "id" IN ('sug_a02','sug_a07','sug_a11');
UPDATE "Suggestion" SET "categories" = 'man,boy' WHERE "id" = 'sug_a04';
UPDATE "Suggestion" SET "categories" = 'woman,girl' WHERE "id" = 'sug_a09';
UPDATE "Suggestion" SET "categories" = 'boy,girl' WHERE "id" IN ('sug_k01','sug_k02');
UPDATE "Suggestion" SET "categories" = 'boy' WHERE "id" = 'sug_k04';

-- Kid dvar-Torah duplicate merges into sug_a02 (now offered to everyone)
UPDATE "Suggestion" SET "active" = false WHERE "id" = 'sug_k03';

-- Optional add-ons, hidden until an admin activates them
INSERT INTO "Suggestion" ("id","title","detail","unitLabel","unitValue","categories","sortOrder","active") VALUES
('sug_o15','Put your phone away 30 minutes before Shabbos','Ease into Shabbos without the last-minute scramble.','minutes added to Shabbos',30,'man,woman',15,false),
('sug_o16','Do Shnayim Mikra on the parsha this week','Twice mikra, once targum, before Shabbos is out.','parshiyos completed',1,'man',16,false),
('sug_o17','Be in shul before Lecha Dodi on Friday night','Greet the Shabbos Queen from the first pasuk.','on-time Kabbalas Shabbos arrivals',1,'man,boy',17,false),
('sug_o18','No talking during davening and leining','The whole Shabbos, from start to finish.','quiet davenings',1,'man,boy',18,false),
('sug_o19','Bentch from a bentcher at every Shabbos seudah','Word by word, from the page.','seudos bentched from a bentcher',3,'man,woman,boy,girl',19,false),
('sug_o20','Invite a guest to a Shabbos meal','Share your table with someone new.','guests hosted',1,'man,woman',20,false),
('sug_o21','Ask each of your kids a parsha question at the table','Turn the seudah into a conversation.','parsha conversations',1,'man,woman',21,false),
('sug_o22','Stay at the table until bentching at every seudah','Be part of the whole seudah, start to finish.','full seudos at the table',1,'boy,girl',22,false),
('sug_o23','Clear the table after each seudah','A simple, real way to give kavod to Shabbos.','tables cleared',1,'boy,girl',23,false),
('sug_o24','Come to Seudah Shlishis in shul','Finish Shabbos together with the shul.','seudos shlishis in shul',1,'man,boy',24,false)
ON CONFLICT ("id") DO NOTHING;

-- Wording refinements
UPDATE "Suggestion" SET "title" = 'Come 20 minutes early Shabbos morning to learn or join the shiur' WHERE "id" = 'sug_a04';
UPDATE "Suggestion" SET "title" = 'Be fully dressed in bigdei Shabbos by hadlakas neiros' WHERE "id" = 'sug_a07';
UPDATE "Suggestion" SET "title" = 'Wear bigdei Shabbos the whole Shabbos' WHERE "id" = 'sug_a11';
UPDATE "Suggestion" SET "title" = 'Spend 15 minutes helping prepare for Shabbos' WHERE "id" = 'sug_k01';
UPDATE "Suggestion" SET "title" = 'Come to shul and stay through Kabbalas Shabbos' WHERE "id" = 'sug_k04';
