import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const img = (id: string) => `https://images.unsplash.com/${id}?w=600&h=400&fit=crop`;

async function main() {
  // Wipe in dependency order so the seed is re-runnable.
  await db.booking.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.referralEarning.deleteMany();
  await db.referralPayout.deleteMany();
  await db.referral.deleteMany();
  await db.issue.deleteMany();
  await db.review.deleteMany();
  await db.message.deleteMany();
  await db.conversation.deleteMany();
  await db.availableDate.deleteMany();
  await db.cartItem.deleteMany();
  await db.visitPackage.deleteMany();
  await db.book.deleteMany();
  await db.user.deleteMany();
  await db.setting.deleteMany();
  await db.contactMessage.deleteMany();
  // Restart human-friendly numbering so re-seeding gives the same O-/B- numbers.
  await db.$executeRawUnsafe(`ALTER SEQUENCE "Order_number_seq" RESTART WITH 2201`);
  await db.$executeRawUnsafe(`ALTER SEQUENCE "Booking_number_seq" RESTART WITH 1041`);

  const passwordHash = await bcrypt.hash("atelier123", 10);
  const user = (name: string, email: string, role: string, extra: object = {}) =>
    db.user.create({ data: { name, email, role, passwordHash, ...extra } });

  await user("Amaka Nwosu", "admin@atelier.test", "ADMIN");
  const buyer = await user("Ada Buyer", "buyer@atelier.test", "BUYER", { location: "Lagos", orgType: "SCHOOL", orgName: "Oxbridge Preschool" });
  const school = await user("Nancy Mullin", "school@atelier.test", "BUYER", { orgType: "SCHOOL", orgName: "St. Cloud Elementary" });

  const tags = (...t: string[]) => (t.length ? `,${t.join(",")},` : "");
  type AuthorSeed = { name: string; email: string; bio: string; headline: string; topics: string; grades: string; languages: string; identities?: string; location: string };
  const authorData: AuthorSeed[] = [
    { name: "Chike Okoro", email: "author@atelier.test", bio: "Novelist and storyteller who loves a school hall full of questions.", headline: "Novelist · school & library speaker", topics: tags("literacy", "writing", "history"), grades: tags("g68", "g912", "adult"), languages: tags("english", "igbo"), identities: tags("black-owned"), location: "Port Harcourt" },
    { name: "Jeanette Gil", email: "jeanette@atelier.test", bio: "Social-emotional learning author and classroom speaker.", headline: "SEL author for early grades", topics: tags("sel", "confidence", "family"), grades: tags("prek", "k2", "g35"), languages: tags("english", "spanish"), identities: tags("hispanic-owned", "women-owned", "bilingual"), location: "Lagos" },
    { name: "Mike Crowder", email: "mike@atelier.test", bio: "Makes STEM feel like play for families and schools.", headline: "STEM author & family-night host", topics: tags("stem", "literacy"), grades: tags("k2", "g35", "g68"), languages: tags("english"), location: "Port Harcourt" },
    { name: "Meena Julapalli", email: "meena@atelier.test", bio: "Physician-author speaking on joy and resilience at work.", headline: "Keynote speaker on joy & resilience", topics: tags("mental-health", "leadership", "confidence"), grades: tags("adult", "college"), languages: tags("english"), identities: tags("aapi-owned", "women-owned"), location: "Abuja" },
    { name: "Susan Friedland", email: "susan@atelier.test", bio: "Animal tales for young readers and libraries.", headline: "Picture books about animals & kindness", topics: tags("nature", "anti-bullying"), grades: tags("prek", "k2"), languages: tags("english"), identities: tags("women-owned"), location: "Abuja" },
    { name: "Allie Davis", email: "allie@atelier.test", bio: "Astronomy writer bringing the night sky indoors.", headline: "Astronomy author · virtual assemblies", topics: tags("stem", "nature"), grades: tags("g35", "g68", "g912"), languages: tags("english", "french"), location: "Remote" },
    { name: "Jayme Branagh", email: "jayme@atelier.test", bio: "Empathy educator and workshop facilitator.", headline: "Empathy workshops for schools & teams", topics: tags("sel", "diversity", "anti-bullying"), grades: tags("g35", "g68", "adult"), languages: tags("english"), identities: tags("lgbtq-owned"), location: "Lagos" },
    { name: "Miriam Bejerano", email: "miriam@atelier.test", bio: "Picture-book author about travel and curiosity.", headline: "Travel & curiosity picture books", topics: tags("diversity", "family", "arts"), grades: tags("prek", "k2", "g35"), languages: tags("english", "spanish", "portuguese"), identities: tags("hispanic-owned", "bilingual"), location: "Ibadan" },
  ];
  // Demo authors get simulated Stripe accounts ("acct_mock_…") so the catalog works without Stripe keys.
  const a: Record<string, string> = {};
  for (const [i, { name, email, ...profile }] of authorData.entries()) {
    a[name] = (await user(name, email, "AUTHOR", { ...profile, stripeAccountId: `acct_mock_seed${i}`, payoutsReady: true })).id;
  }

  // Open weekdays over the next ~8 weeks, varied per author (Chike keeps an empty calendar
  // so the "propose any date" path is visible too).
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
  for (const [i, { name }] of authorData.entries()) {
    if (i === 0) continue;
    const dates: Date[] = [];
    for (let d = 2; d < 58; d++) {
      const date = new Date(today.getTime() + d * 86400000);
      const dow = date.getUTCDay();
      if (dow !== 0 && dow !== 6 && (d + i) % 3 !== 0) dates.push(date);
    }
    await db.availableDate.createMany({ data: dates.map((date) => ({ authorId: a[name], date })) });
  }

  const pending = await user("New Voice Press", "newvoice@atelier.test", "AUTHOR", {
    status: "PENDING",
    bio: "Independent press awaiting approval.",
  });

  const books: [string, string, number, string, string, number][] = [
    ["Balu the Paw Traveler", "Miriam Bejerano", 18, "children", "photo-1544947950-fa07a98d237f", 40],
    ["The Empathy Effect", "Jayme Branagh", 16, "sel", "photo-1512820790803-83ca734da794", 120],
    ["Night Sky Notes", "Allie Davis", 21, "stem", "photo-1507842217343-583bb7270b66", 60],
    ["Joyful Path", "Meena Julapalli", 19, "sel", "photo-1519682337058-a94d519337bc", 35],
    ["Word Play Lab", "Mike Crowder", 14, "stem", "photo-1495446815901-a7297e633e8d", 80],
    ["Horse Country Tales", "Susan Friedland", 17, "children", "photo-1481627834876-b7833e8f5570", 25],
    ["The Harmattan Letters", "Chike Okoro", 20, "fiction", "photo-1524995997946-a1c2e315a42f", 50],
    ["Nature Sketchbook", "Chike Okoro", 22, "nonfiction", "photo-1589998059171-988d887df646", 15],
  ];
  const bookIds: Record<string, string> = {};
  for (const [title, author, price, category, cover, stock] of books) {
    const b = await db.book.create({
      data: {
        title,
        authorId: a[author],
        price: price * 100,
        category,
        stock,
        coverUrl: img(cover),
        status: "APPROVED",
        description: `${title} — signed copies shipped directly by ${author}. Classroom-set discounts available on request.`,
      },
    });
    bookIds[title] = b.id;
  }
  await db.book.create({
    data: {
      title: "First Light",
      authorId: pending.id,
      price: 1500,
      category: "fiction",
      stock: 30,
      description: "A debut collection of short stories.",
      coverUrl: img("photo-1543002588-bfa74002ed7e"),
    },
  });

  const visits: [string, string, string, number, number, string][] = [
    ["Classroom SEL visit", "Jeanette Gil", "HYBRID", 45, 420, "Anywhere (virtual) · Lagos on-site"],
    ["STEM family night", "Mike Crowder", "IN_PERSON", 60, 780, "Port Harcourt & Rivers State"],
    ["Corporate keynote: Joy", "Meena Julapalli", "IN_PERSON", 60, 1800, "Nationwide"],
    ["Library animal tales", "Susan Friedland", "IN_PERSON", 40, 390, "Abuja"],
    ["Astronomy assembly", "Allie Davis", "VIRTUAL", 50, 510, "Anywhere"],
    ["Empathy workshop", "Jayme Branagh", "HYBRID", 75, 640, "Lagos & Ibadan"],
    ["Author Q&A and signing", "Chike Okoro", "IN_PERSON", 90, 650, "Port Harcourt"],
  ];
  const pkg: Record<string, { id: string; authorId: string; fee: number }> = {};
  for (const [title, author, format, durationMins, fee, region] of visits) {
    const p = await db.visitPackage.create({
      data: {
        title,
        authorId: a[author],
        format,
        durationMins,
        fee: fee * 100,
        region,
        status: "APPROVED",
        description: `${author} delivers a ${durationMins}-minute ${title.toLowerCase()} tailored to your audience, with Q&A at the end.`,
      },
    });
    pkg[title] = { id: p.id, authorId: p.authorId, fee: p.fee };
  }

  const soon = (days: number) => new Date(today.getTime() + days * 86400000);
  const booking = (n: number, buyerId: string, title: string, status: string, days: number, org: string) =>
    db.booking.create({
      data: {
        buyerId,
        authorId: pkg[title].authorId,
        packageId: pkg[title].id,
        fee: pkg[title].fee,
        commissionPct: 15,
        status,
        eventDate: soon(days),
        organisation: org,
        venue: "Main hall",
        audienceSize: 120,
        ...(["CONFIRMED", "COMPLETED"].includes(status)
          ? {
              paymentRef: `pi_mock_seed${n}`,
              chargeId: `ch_mock_seed${n}`,
              // Completed visits were paid out; upcoming ones are still held until 14 days after the event.
              ...(status === "COMPLETED" ? { transferId: `tr_mock_seed${n}` } : { releaseAt: soon(days + 14) }),
            }
          : {}),
      },
    });
  await booking(1041, school.id, "Classroom SEL visit", "CONFIRMED", 12, "St. Cloud Elementary");
  await booking(1042, buyer.id, "Author Q&A and signing", "PENDING", 20, "Oxbridge Preschool");
  await booking(1043, school.id, "Author Q&A and signing", "COMPLETED", -14, "St. Cloud Elementary");

  const order = async (n: number, buyerId: string, title: string, qty: number, status: string) => {
    const b = await db.book.findUniqueOrThrow({ where: { id: bookIds[title] } });
    await db.order.create({
      data: {
        buyerId,
        total: b.price * qty,
        shippingAddress: "12 Aba Road, Port Harcourt",
        status: "PAID",
        paymentRef: `pi_mock_seed${n}`,
        chargeId: `ch_mock_seed${n}`,
        items: {
          create: [
            {
              bookId: b.id, authorId: b.authorId, title: b.title, unitPrice: b.price, qty, commissionPct: 5, status,
              // Delivered lines were paid out; the rest are held for 14 days from payment.
              ...(status === "DELIVERED" ? { transferId: `tr_mock_seed${n}` } : { releaseAt: soon(10) }),
            },
          ],
        },
      },
    });
  };
  await order(2201, buyer.id, "Night Sky Notes", 24, "PAID");
  await order(2202, school.id, "The Empathy Effect", 40, "SHIPPED");
  await order(2203, buyer.id, "The Harmattan Letters", 3, "DELIVERED");
  await order(2204, school.id, "Nature Sketchbook", 10, "PAID");

  const convo = await db.conversation.create({ data: { buyerId: buyer.id, authorId: a["Chike Okoro"] } });
  const msg = (senderId: string, body: string, minsAgo: number) =>
    db.message.create({ data: { conversationId: convo.id, senderId, body, createdAt: new Date(Date.now() - minsAgo * 60000) } });
  await msg(buyer.id, "Hi Chike! We'd love you for our reading week. Around 120 students, grades 6–8. Could you do a Q&A and signing?", 180);
  await msg(a["Chike Okoro"], "Happy to! I've sent my package details. If the venue is outside Port Harcourt I'll add travel to the final quote.", 150);
  await msg(buyer.id, "Great — it's in Oxbridge, I've sent the request for the 20th.", 120);
  await db.conversation.update({ where: { id: convo.id }, data: { lastMessageAt: new Date(Date.now() - 120 * 60000), buyerLastReadAt: new Date() } });

  await db.contactMessage.create({
    data: { name: "Grace Eze", email: "grace@example.com", topic: "Booking help", body: "Hi, can our school pay by bank transfer instead of card for a visit next term?" },
  });

  // Reviews: two tied to real completed sales, the rest historical (no linked sale) to give authors a rating.
  const completed = await db.booking.findFirstOrThrow({ where: { status: "COMPLETED" } });
  const delivered = await db.orderItem.findFirstOrThrow({ where: { status: "DELIVERED" } });
  const review = (authorName: string, buyerId: string, rating: number, body: string, extra: object = {}) =>
    db.review.create({ data: { authorId: a[authorName], buyerId, rating, body, ...extra } });
  await review("Chike Okoro", school.id, 5, "Our grade 7s were spellbound. Chike stayed an extra 20 minutes to sign books and answer questions.", {
    bookingId: completed.id,
    authorReply: "Thank you — St. Cloud's students asked the best questions!",
  });
  await review("Chike Okoro", buyer.id, 4, "Beautiful book, arrived well packed. Took a few extra days to ship.", { orderItemId: delivered.id });
  await review("Jeanette Gil", school.id, 5, "The SEL assembly was perfect for K–2. Teachers are still using her feelings chart.");
  await review("Jeanette Gil", buyer.id, 5, "Warm, organised and great with little ones.");
  await review("Mike Crowder", school.id, 5, "STEM family night was our best-attended event this year.");
  await review("Meena Julapalli", buyer.id, 4, "Thoughtful keynote on joy at work — our staff loved it.");
  await review("Allie Davis", school.id, 5, "The virtual astronomy assembly worked flawlessly for 300 students.");
  for (const id of Object.values(a)) {
    const agg = await db.review.aggregate({ where: { authorId: id, hidden: false }, _avg: { rating: true }, _count: true });
    await db.user.update({ where: { id }, data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count } });
  }

  // One open problem report so the admin queue has something to show.
  const lateLine = await db.orderItem.findFirstOrThrow({ where: { order: { number: 2204 } } });
  await db.issue.create({
    data: { buyerId: school.id, orderItemId: lateLine.id, reason: "NOT_RECEIVED", details: "Ordered 10 copies two weeks ago and nothing has arrived. No tracking number." },
  });

  // Referrals: Jeanette referred Mike (verified, one reward so far); Chike's referral awaits verification.
  const inAYear = new Date(Date.now() + 365 * 86400000);
  const mikeRef = await db.referral.create({
    data: {
      referrerId: a["Jeanette Gil"], referredEmail: "mike@atelier.test", referredName: "Mike Crowder", referredUserId: a["Mike Crowder"],
      status: "APPROVED", pct: 2, expiresAt: inAYear, reviewedAt: new Date(),
    },
  });
  await db.referralEarning.create({ data: { referralId: mikeRef.id, sourceKind: "booking", sourceId: "seed-history-1", saleAmount: 78000, amount: 1560 } });
  await db.referral.create({
    data: { referrerId: a["Chike Okoro"], referredEmail: "tolu.ade@example.com", referredName: "Tolu Ade", pct: 2, expiresAt: inAYear },
  });

  await db.setting.createMany({
    data: [
      { key: "bookCommissionPct", value: "5" },
      { key: "visitCommissionPct", value: "15" },
      { key: "referralPct", value: "2" },
      { key: "referralMonths", value: "12" },
    ],
  });

  console.log("Seeded. All demo passwords: atelier123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
