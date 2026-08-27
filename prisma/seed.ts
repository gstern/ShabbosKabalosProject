import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// The approved campaign list. categories: which of man/woman/boy/girl see it.
// Items with active:false are pre-loaded ideas the admin can switch on.
const suggestions = [
  {
    id: "sug_a01",
    title: "Learn Hilchos Shabbos at the table",
    detail: "A few minutes of practical halacha at the seudah — suggested topics coming soon.",
    unitLabel: "tables learning Hilchos Shabbos",
    unitValue: 1,
    categories: "adult",
    sortOrder: 1,
  },
  {
    id: "sug_a02",
    title: "Prepare and say a dvar Torah at the table",
    detail: "Prepare something on the parsha to share at the seudah.",
    unitLabel: "divrei Torah shared",
    unitValue: 1,
    categories: "both",
    sortOrder: 2,
  },
  {
    id: "sug_a03",
    title: "Keep your phone off for the first 30 minutes after Shabbos",
    detail: "Don't rush back into the week — let Shabbos linger before the phone goes on.",
    unitLabel: "minutes added to Shabbos",
    unitValue: 30,
    categories: "adult",
    sortOrder: 3,
  },
  {
    id: "sug_a04",
    title: "Come 20 minutes early Shabbos morning to learn or join the Michtav M'Eliyahu shiur",
    detail: "Learn on your own or join the shiur in Michtav M'Eliyahu before davening.",
    unitLabel: "minutes of extra learning",
    unitValue: 20,
    categories: "both",
    sortOrder: 4,
  },
  {
    id: "sug_a05",
    title: "Eat a proper Melava Malka",
    detail: "Escort the Shabbos Queen out properly on Motzei Shabbos.",
    unitLabel: "Melava Malkas eaten",
    unitValue: 1,
    categories: "adult",
    sortOrder: 5,
  },
  {
    id: "sug_a06",
    title: "Set the Shabbos table Thursday night",
    detail: "Walk into Friday with the table already glowing.",
    unitLabel: "tables set early",
    unitValue: 1,
    categories: "adult",
    sortOrder: 6,
  },
  {
    id: "sug_a07",
    title: "Be fully dressed in bigdei Shabbos by zman hadlakas neiros",
    detail: "Fully ready, dressed b'kavod, by the zman of candle lighting.",
    unitLabel: "times ready before candle lighting",
    unitValue: 1,
    categories: "both",
    sortOrder: 7,
  },
  {
    id: "sug_a08",
    title: "Wash for Seudah Shlishis",
    detail: "Make Seudah Shlishis a proper seudah with hamotzi.",
    unitLabel: "seudos shlishis with hamotzi",
    unitValue: 1,
    categories: "adult",
    sortOrder: 8,
  },
  {
    id: "sug_a09",
    title: "Say 3 perakim of Tehillim by candle lighting",
    detail: "Start Shabbos with Tehillim as the candles are lit.",
    unitLabel: "perakim of Tehillim said",
    unitValue: 3,
    categories: "both",
    sortOrder: 9,
  },
  {
    id: "sug_a10",
    title: "Call someone who'd appreciate it before Shabbos",
    detail: "A parent, a grandparent, someone alone — a pre-Shabbos hello.",
    unitLabel: "pre-Shabbos calls made",
    unitValue: 1,
    categories: "adult",
    sortOrder: 10,
  },
  {
    id: "sug_a11",
    title: "Wear bigdei Shabbos outside the house, all of Shabbos",
    detail: "Your Shabbos best whenever you're out, from candle lighting to havdalah.",
    unitLabel: "Shabbosos in full bigdei Shabbos",
    unitValue: 1,
    categories: "both",
    sortOrder: 11,
  },
  {
    id: "sug_k01",
    title: "Spend 15 minutes helping prepare for Shabbos",
    detail: "Set the table, help in the kitchen — 15 minutes of kavod Shabbos.",
    unitLabel: "minutes children helped for Shabbos",
    unitValue: 15,
    categories: "child",
    sortOrder: 12,
  },
  {
    id: "sug_k02",
    title: "Sing zemiros at the table",
    detail: "Bring the niggunim — lead or join the zemiros at the seudah.",
    unitLabel: "tables singing zemiros",
    unitValue: 1,
    categories: "child",
    sortOrder: 13,
  },
  {
    id: "sug_k04",
    title: "Children: come to shul and stay through Kabbalas Shabbos",
    detail: "Be there from Lecha Dodi through the end.",
    unitLabel: "Kabbalas Shabbos davened in shul",
    unitValue: 1,
    categories: "child",
    sortOrder: 14,
  },

  // ---- Optional add-ons (hidden until an admin activates them) ----
  {
    id: "sug_o15",
    title: "Put your phone away 30 minutes before Shabbos",
    detail: "Ease into Shabbos without the last-minute scramble.",
    unitLabel: "minutes added to Shabbos",
    unitValue: 30,
    categories: "adult",
    sortOrder: 15,
    active: false,
  },
  {
    id: "sug_o16",
    title: "Do Shnayim Mikra on the parsha this week",
    detail: "Twice mikra, once targum, before Shabbos is out.",
    unitLabel: "parshiyos completed",
    unitValue: 1,
    categories: "adult",
    sortOrder: 16,
    active: false,
  },
  {
    id: "sug_o17",
    title: "Be in shul before Lecha Dodi on Friday night",
    detail: "Greet the Shabbos Queen from the first pasuk.",
    unitLabel: "on-time Kabbalas Shabbos arrivals",
    unitValue: 1,
    categories: "both",
    sortOrder: 17,
    active: false,
  },
  {
    id: "sug_o18",
    title: "No talking during davening and leining",
    detail: "The whole Shabbos, from start to finish.",
    unitLabel: "quiet davenings",
    unitValue: 1,
    categories: "both",
    sortOrder: 18,
    active: false,
  },
  {
    id: "sug_o19",
    title: "Bentch from a bentcher at every Shabbos seudah",
    detail: "Word by word, from the page.",
    unitLabel: "seudos bentched from a bentcher",
    unitValue: 3,
    categories: "both",
    sortOrder: 19,
    active: false,
  },
  {
    id: "sug_o20",
    title: "Invite a guest to a Shabbos meal",
    detail: "Share your table with someone new.",
    unitLabel: "guests hosted",
    unitValue: 1,
    categories: "adult",
    sortOrder: 20,
    active: false,
  },
  {
    id: "sug_o21",
    title: "Ask each of your kids a parsha question at the table",
    detail: "Turn the seudah into a conversation.",
    unitLabel: "parsha conversations",
    unitValue: 1,
    categories: "adult",
    sortOrder: 21,
    active: false,
  },
  {
    id: "sug_o22",
    title: "Stay at the table until bentching at every seudah",
    detail: "Be part of the whole seudah, start to finish.",
    unitLabel: "full seudos at the table",
    unitValue: 1,
    categories: "child",
    sortOrder: 22,
    active: false,
  },
  {
    id: "sug_o23",
    title: "Clear the table after each seudah",
    detail: "A simple, real way to give kavod to Shabbos.",
    unitLabel: "tables cleared",
    unitValue: 1,
    categories: "child",
    sortOrder: 23,
    active: false,
  },
  {
    id: "sug_o24",
    title: "Come to Seudah Shlishis in shul",
    detail: "Finish Shabbos together with the shul.",
    unitLabel: "seudos shlishis in shul",
    unitValue: 1,
    categories: "both",
    sortOrder: 24,
    active: false,
  },
];

async function main() {
  for (const s of suggestions) {
    const { id, ...data } = s;
    await prisma.suggestion.upsert({
      where: { id },
      update: {
        title: data.title,
        detail: data.detail,
        unitLabel: data.unitLabel,
        unitValue: data.unitValue,
        categories: data.categories,
        sortOrder: data.sortOrder,
      },
      create: { id, ...data },
    });
  }
  // The old kid-specific dvar Torah item is merged into sug_a02.
  await prisma.suggestion.updateMany({
    where: { id: "sug_k03" },
    data: { active: false },
  });
  console.log(`Seeded/updated ${suggestions.length} suggestions`);

  await prisma.campaign.upsert({
    where: { id: "campaign" },
    update: {},
    create: {
      id: "campaign",
      name: "The Elul Shabbos Project",
      // Week 1 = the week of the first Shabbos of Elul 5786 (Aug 15, 2026)
      startDate: new Date("2026-08-09T00:00:00-07:00"),
      weeks: 4,
      signupDeadline: new Date("2026-08-14T19:00:00-07:00"),
      pledgePerSignup: 5,
      pledgePerCheckin: 0,
      charityName: "Tomchei Shabbos",
    },
  });
  console.log("Campaign config ready");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
