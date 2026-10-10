import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const img = (id: string) => `https://images.unsplash.com/${id}?w=600&h=400&fit=crop`;

async function main() {
  // Wipe in dependency order so the seed is re-runnable.
  await db.purchaseOrder.deleteMany();
  await db.booking.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.invoice.deleteMany();
  await db.bid.deleteMany();
  await db.rfp.deleteMany();
  await db.collectionItem.deleteMany();
  await db.collection.deleteMany();
  await db.article.deleteMany();
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
  await db.$executeRawUnsafe(`ALTER SEQUENCE "Invoice_number_seq" RESTART WITH 1001`);

  const passwordHash = await bcrypt.hash("atelier123", 10);
  const user = (name: string, email: string, role: string, extra: object = {}) =>
    db.user.create({ data: { name, email, role, passwordHash, emailVerifiedAt: new Date(), ...extra } });

  await user("Sarah Mitchell", "admin@atelier.test", "ADMIN");
  const buyer = await user("Ada Brooks", "buyer@atelier.test", "BUYER", { location: "1200 N 10th St, McAllen, TX 78501", orgType: "SCHOOL", orgName: "Oxbridge Preschool" });
  const school = await user("Nancy Mullin", "school@atelier.test", "BUYER", { orgType: "SCHOOL", orgName: "St. Cloud Elementary" });

  const tags = (...t: string[]) => (t.length ? `,${t.join(",")},` : "");
  type AuthorSeed = { name: string; email: string; bio: string; headline: string; topics: string; grades: string; languages: string; identities?: string; location: string };
  const authorData: AuthorSeed[] = [
    { name: "Marcus Bell", email: "author@atelier.test", bio: "Novelist and storyteller who loves a school hall full of questions.", headline: "Novelist · school & library speaker", topics: tags("literacy", "writing", "history"), grades: tags("g68", "g912", "adult"), languages: tags("english"), identities: tags(), location: "McAllen, TX" },
    { name: "Jeanette Gil", email: "jeanette@atelier.test", bio: "Social-emotional learning author and classroom speaker.", headline: "SEL author for early grades", topics: tags("sel", "confidence", "family"), grades: tags("prek", "k2", "g35"), languages: tags("english", "spanish"), identities: tags("women-authors", "bilingual"), location: "Edinburg, TX" },
    { name: "Mike Crowder", email: "mike@atelier.test", bio: "Makes STEM feel like play for families and schools.", headline: "STEM author & family-night host", topics: tags("stem", "literacy"), grades: tags("k2", "g35", "g68"), languages: tags("english"), identities: tags("men-authors"), location: "Brownsville, TX" },
    { name: "Meena Julapalli", email: "meena@atelier.test", bio: "Physician-author speaking on joy and resilience at work.", headline: "Keynote speaker on joy & resilience", topics: tags("mental-health", "leadership", "confidence"), grades: tags("adult", "college"), languages: tags("english"), identities: tags("women-authors"), location: "Harlingen, TX" },
    { name: "Susan Friedland", email: "susan@atelier.test", bio: "Animal tales for young readers and libraries.", headline: "Picture books about animals & kindness", topics: tags("nature", "anti-bullying"), grades: tags("prek", "k2"), languages: tags("english"), identities: tags("women-authors"), location: "Mission, TX" },
    { name: "Allie Davis", email: "allie@atelier.test", bio: "Astronomy writer bringing the night sky indoors.", headline: "Astronomy author · virtual assemblies", topics: tags("stem", "nature"), grades: tags("g35", "g68", "g912"), languages: tags("english", "french"), location: "Remote" },
    { name: "Jayme Branagh", email: "jayme@atelier.test", bio: "Empathy educator and workshop facilitator.", headline: "Empathy workshops for schools & teams", topics: tags("sel", "diversity", "anti-bullying"), grades: tags("g35", "g68", "adult"), languages: tags("english"), identities: tags(), location: "Weslaco, TX" },
    { name: "Miriam Bejerano", email: "miriam@atelier.test", bio: "Picture-book author about travel and curiosity.", headline: "Travel & curiosity picture books", topics: tags("diversity", "family", "arts"), grades: tags("prek", "k2", "g35"), languages: tags("english", "spanish", "portuguese"), identities: tags("bilingual"), location: "Pharr, TX" },
  ];
  // Demo authors get simulated Stripe accounts ("acct_mock_…") so the catalog works without Stripe keys.
  const a: Record<string, string> = {};
  for (const [i, { name, email, ...profile }] of authorData.entries()) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    a[name] = (await user(name, email, "AUTHOR", { ...profile, slug, stripeAccountId: `acct_mock_seed${i}`, payoutsReady: true })).id;
  }

  // Open weekdays over the next ~8 weeks, varied per author (Marcus keeps an empty calendar
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
    ["Letters from the Delta", "Marcus Bell", 20, "fiction", "photo-1524995997946-a1c2e315a42f", 50],
    ["Nature Sketchbook", "Marcus Bell", 22, "nonfiction", "photo-1589998059171-988d887df646", 15],
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
        description: `${title} — signed copies shipped directly by ${author}. Bulk discounts for classroom sets apply automatically.`,
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
    ["Classroom SEL visit", "Jeanette Gil", "HYBRID", 45, 420, "Anywhere (virtual) · Hidalgo County on-site"],
    ["STEM family night", "Mike Crowder", "IN_PERSON", 60, 780, "Cameron County"],
    ["Corporate keynote: Joy", "Meena Julapalli", "IN_PERSON", 60, 1800, "Nationwide"],
    ["Library animal tales", "Susan Friedland", "IN_PERSON", 40, 390, "Mission & McAllen"],
    ["Astronomy assembly", "Allie Davis", "VIRTUAL", 50, 510, "Anywhere"],
    ["Empathy workshop", "Jayme Branagh", "HYBRID", 75, 640, "Weslaco & Mercedes"],
    ["Author Q&A and signing", "Marcus Bell", "IN_PERSON", 90, 650, "Rio Grande Valley"],
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
        eventTime: "10:00",
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
        shippingAddress: "1200 N 10th St, McAllen, TX 78501",
        phone: "(956) 555-0142",
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
  await order(2203, buyer.id, "Letters from the Delta", 3, "DELIVERED");
  await order(2204, school.id, "Nature Sketchbook", 10, "PAID");

  const convo = await db.conversation.create({ data: { buyerId: buyer.id, authorId: a["Marcus Bell"] } });
  const msg = (senderId: string, body: string, minsAgo: number) =>
    db.message.create({ data: { conversationId: convo.id, senderId, body, createdAt: new Date(Date.now() - minsAgo * 60000) } });
  await msg(buyer.id, "Hi Marcus! We'd love you for our reading week. Around 120 students, grades 6–8. Could you do a Q&A and signing?", 180);
  await msg(a["Marcus Bell"], "Happy to! I've sent my package details. If the venue is outside the Valley I'll add travel to the final quote.", 150);
  await msg(buyer.id, "Great — it's in Oxbridge, I've sent the request for the 20th.", 120);
  await db.conversation.update({ where: { id: convo.id }, data: { lastMessageAt: new Date(Date.now() - 120 * 60000), buyerLastReadAt: new Date() } });

  await db.contactMessage.create({
    data: { name: "Grace Evans", email: "grace@example.com", topic: "Booking help", body: "Hi, can our school pay by bank transfer instead of card for a visit next term?" },
  });

  // Reviews: two tied to real completed sales, the rest historical (no linked sale) to give authors a rating.
  const completed = await db.booking.findFirstOrThrow({ where: { status: "COMPLETED" } });
  const delivered = await db.orderItem.findFirstOrThrow({ where: { status: "DELIVERED" } });
  const review = (authorName: string, buyerId: string, rating: number, body: string, extra: object = {}) =>
    db.review.create({ data: { authorId: a[authorName], buyerId, rating, body, ...extra } });
  await review("Marcus Bell", school.id, 5, "Our grade 7s were spellbound. Marcus stayed an extra 20 minutes to sign books and answer questions.", {
    bookingId: completed.id,
    authorReply: "Thank you — St. Cloud's students asked the best questions!",
  });
  await review("Marcus Bell", buyer.id, 4, "Beautiful book, arrived well packed. Took a few extra days to ship.", { orderItemId: delivered.id });
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

  // Referrals: Jeanette referred Mike (verified, one reward so far); Marcus's referral awaits verification.
  const inAYear = new Date(Date.now() + 365 * 86400000);
  const mikeRef = await db.referral.create({
    data: {
      referrerId: a["Jeanette Gil"], referredEmail: "mike@atelier.test", referredName: "Mike Crowder", referredUserId: a["Mike Crowder"],
      status: "APPROVED", pct: 2, expiresAt: inAYear, reviewedAt: new Date(),
    },
  });
  await db.referralEarning.create({ data: { referralId: mikeRef.id, sourceKind: "booking", sourceId: "seed-history-1", saleAmount: 78000, amount: 1560 } });
  await db.referral.create({
    data: { referrerId: a["Marcus Bell"], referredEmail: "tara.adams@example.com", referredName: "Tara Adams", pct: 2, expiresAt: inAYear },
  });

  // Bulk discounts are on by default; the gift set opts out.
  await db.book.create({
    data: {
      title: "Cookie Jar Story Set", authorId: a["Miriam Bejerano"], price: 3500, category: "gifts", stock: 20, status: "APPROVED",
      coverUrl: img("photo-1589998059171-988d887df646"),
      bulkEnabled: false,
      description: "A gift box with a signed picture book, a recipe card for grandma's travel cookies and a bookmark.",
    },
  });

  // Curated collections.
  const col = async (slug: string, title: string, kind: string, subtitle: string, description: string, featured: boolean, items: [string, string, string?][]) => {
    const c = await db.collection.create({ data: { slug, title, kind, subtitle, description, featured, published: true } });
    let pos = 0;
    for (const [type, key, note] of items) {
      await db.collectionItem.create({
        data: { collectionId: c.id, position: ++pos, note: note ?? null, ...(type === "author" ? { authorId: a[key] } : { bookId: bookIds[key] }) },
      });
    }
  };
  await col("featured-author-catalog", "2027 Featured Author Catalog", "CATALOG", "Authors schools book again and again",
    "Our hand-picked authors for the new school year — engaging, reliable and loved by students.", true, [
      ["author", "Jeanette Gil", "Perfect for K–2 SEL assemblies."],
      ["author", "Mike Crowder", "Families still talk about his STEM nights."],
      ["author", "Allie Davis", "Flawless virtual assemblies for big groups."],
      ["author", "Marcus Bell"],
    ]);
  await col("educators-favorites-october", "Educator's Monthly Favorites: October", "FAVORITES", "Curated by our educator panel · October",
    "Each month a panel of teachers and librarians picks the books they're reaching for. This month: kindness, curiosity and the night sky.", true, [
      ["book", "The Empathy Effect", "Great for circle time discussions."],
      ["book", "Night Sky Notes", "Pairs with a stargazing homework night."],
      ["book", "Horse Country Tales"],
      ["book", "Balu the Paw Traveler"],
    ]);
  await col("black-history-month", "Black History Month picks", "THEME", "Voices to celebrate in February",
    "Authors and books to celebrate Black history, culture and storytelling all year round.", false, [
      ["author", "Marcus Bell", "Historical fiction with a gift for Q&A."],
      ["book", "Letters from the Delta"],
    ]);

  // Newsroom, resources and an upcoming event.
  const art = (slug: string, kind: string, title: string, summary: string, body: string, extra: object = {}) =>
    db.article.create({ data: { slug, kind, title, summary, body, published: true, publishedAt: new Date(), ...extra } });
  await art("grandma-cookie-book-launches", "NEWS", "Grandma Cookie Book launches for schools and authors",
    "A new marketplace to book author visits and buy books directly from the people who write them.",
    "Today we're opening Grandma Cookie Book to schools, libraries, businesses and authors.\n\n## What you can do\n\n- Find vetted authors by topic, grade, budget and date\n- Post a request and receive proposals\n- Buy signed books and classroom sets\n\nQuestions? Visit our contact page.");
  await art("author-visit-checklist", "RESOURCE", "Planning a great author visit: a checklist",
    "Everything to prepare before, during and after an author visit — from AV to book orders.",
    "## Four weeks before\n\n- Confirm the date, audience and schedule with the author in Messages\n- Share your visitor and safeguarding requirements\n- Pre-order signed books so they arrive in time\n\n## On the day\n\n- Test the microphone and projector\n- Have a named contact meet the author\n\n## Afterwards\n\n- Confirm the visit on your bookings page so the author is paid\n- Leave a review to help other schools");
  await art("lexile-level-showcase-template", "RESOURCE", "Template: showcase your book's Lexile level",
    "Help teachers see at a glance where your book fits — a simple template for your listing description.",
    "Teachers search by reading level. Add a short block like this to your book description:\n\n- Lexile measure: (e.g. 620L)\n- Grade band: (e.g. 2–4)\n- Themes: (e.g. friendship, courage)\n\nYou can get an official Lexile measure from MetaMetrics.");
  const nextMarch = new Date(Date.UTC(new Date().getUTCFullYear() + 1, 2, 2));
  await art("literacy-week", "EVENT", "Literacy Week: free author sessions", "Five days of free virtual author sessions, activities and resources for classrooms and families.",
    "Join us for a week of free virtual sessions with authors from the marketplace.\n\n## What's included\n\n- Daily live readings and Q&A\n- Printable classroom activities\n- Discounts on classroom sets\n\nRegistration is free for schools and libraries.",
    { eventStart: nextMarch, eventEnd: new Date(nextMarch.getTime() + 4 * 86400000) });

  // An open request for proposals with one bid.
  const rfp = await db.rfp.create({
    data: {
      buyerId: school.id, title: "Author Visit", format: "ANY", audience: "Grades 3–5 assembly", audienceSize: 220,
      description: "We'd love an energetic author to kick off Reading Week with an assembly and a short Q&A. Themes around kindness or curiosity are a bonus.",
      eventDate: soon(40), deadline: soon(20), grade: "g35", budgetMax: 70000, location: "Edinburg, TX",
    },
  });
  const jPkg = await db.visitPackage.findFirstOrThrow({ where: { authorId: a["Jeanette Gil"] } });
  await db.bid.create({
    data: { rfpId: rfp.id, authorId: a["Jeanette Gil"], packageId: jPkg.id, fee: 52000,
      message: "I'd open with an interactive reading of my kindness picture book, then a feelings-chart activity the whole hall can join in. 45 minutes plus Q&A." },
  });

  // Storefront extras for Marcus Bell: social links, media, a featured book with extra photos.
  await db.user.update({
    where: { id: a["Marcus Bell"] },
    data: { websiteUrl: "https://example.com/marcus-bell", facebookUrl: "https://facebook.com/example", instagramUrl: "https://instagram.com/example", phone: "(956) 555-0199" },
  });
  const photo = (id: string) => `https://images.unsplash.com/${id}?w=900&h=560&fit=crop`;
  await db.media.createMany({
    data: [
      { authorId: a["Marcus Bell"], kind: "PHOTO", category: "SCHOOL_VISITS", title: "Reading week at St. Cloud Elementary", url: photo("photo-1503676260728-1c00da094a0b"), caption: "Q&A with 7th graders", position: 1 },
      { authorId: a["Marcus Bell"], kind: "PHOTO", category: "AWARDS", title: "Texas Library Association honoree", url: photo("photo-1513475382585-d06e58bcb0e0"), position: 2 },
      { authorId: a["Marcus Bell"], kind: "PHOTO", category: "PHOTOS", title: "Signing at the RGV Book Festival", url: photo("photo-1524995997946-a1c2e315a42f"), position: 3 },
    ],
  });
  await db.book.update({ where: { id: bookIds["Letters from the Delta"] }, data: { featured: true } });
  await db.bookImage.createMany({
    data: [
      { bookId: bookIds["Letters from the Delta"], url: img("photo-1512820790803-83ca734da794"), position: 1 },
      { bookId: bookIds["Letters from the Delta"], url: img("photo-1495446815901-a7297e633e8d"), position: 2 },
    ],
  });
  await db.orderItem.updateMany({ where: { status: "SHIPPED" }, data: { carrier: "USPS", trackingNumber: "9400111899223197428490", shippedAt: new Date() } });

  // Invoices for the sales that were already paid.
  for (const o of await db.order.findMany({ where: { status: "PAID" }, orderBy: { number: "asc" } })) {
    await db.invoice.create({ data: { orderId: o.id, total: o.total, issuedAt: o.createdAt } });
  }
  for (const b of await db.booking.findMany({ where: { paymentRef: { not: null } }, orderBy: { number: "asc" } })) {
    await db.invoice.create({ data: { bookingId: b.id, total: b.fee, issuedAt: b.createdAt } });
  }

  // Purchase orders from St. Cloud Elementary: one approved with its Net 30 invoice due, one waiting for review.
  const poOrder = async (title: string, qty: number, po: string, approvedDaysAgo: number | null) => {
    const b = await db.book.findUniqueOrThrow({ where: { id: bookIds[title] } });
    const approved = approvedDaysAgo !== null;
    const approvedAt = approved ? soon(-approvedDaysAgo) : null;
    const o = await db.order.create({
      data: {
        buyerId: school.id,
        total: b.price * qty,
        shippingAddress: "St. Cloud Elementary, 2400 W Nolana Ave, McAllen, TX 78504",
        phone: "(956) 555-0188",
        status: approved ? "PAID" : "PENDING",
        items: { create: [{ bookId: b.id, authorId: b.authorId, title: b.title, unitPrice: b.price, qty, commissionPct: 5, status: approved ? "PAID" : "PENDING" }] },
        purchaseOrder: {
          create: {
            buyerId: school.id, poNumber: po, billingName: "Linda Garza, Accounts Payable", billingEmail: "ap@stcloud.example.org", billingPhone: "(956) 555-0101",
            billingAddress: "McAllen ISD — Accounts Payable\n2000 N 23rd St\nMcAllen, TX 78501", amount: b.price * qty, termsDays: 30,
            status: approved ? "APPROVED" : "PENDING", approvedAt,
          },
        },
      },
    });
    if (approved) await db.invoice.create({ data: { orderId: o.id, total: o.total, status: "DUE", issuedAt: approvedAt!, dueAt: soon(30 - approvedDaysAgo) } });
  };
  await poOrder("The Empathy Effect", 25, "4500012345", 7);
  await poOrder("Horse Country Tales", 30, "4500012399", null);

  await db.setting.createMany({
    data: [
      { key: "bookCommissionPct", value: "5" },
      { key: "visitCommissionPct", value: "15" },
      { key: "referralPct", value: "2" },
      { key: "referralMonths", value: "12" },
      { key: "cancelNoticeDays", value: "7" },
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
