"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { done, fail, str } from "@/lib/actions";
import { COLLECTION_KINDS, slugify } from "@/lib/content";
import { fromDayKey, isDayKey } from "@/lib/dates";
import { hasFile, saveImage } from "@/lib/storage";

// ---------- Collections ----------

const CollectionSchema = z.object({
  title: z.string().trim().min(3).max(120),
  subtitle: z.string().trim().max(160),
  description: z.string().trim().min(10, "Add a short description").max(3000),
  kind: z.enum(COLLECTION_KINDS.map((k) => k.value) as [string, ...string[]]),
});

export async function saveCollection(fd: FormData) {
  await requireUser("ADMIN");
  const p = CollectionSchema.safeParse({ title: str(fd, "title"), subtitle: str(fd, "subtitle"), description: str(fd, "description"), kind: str(fd, "kind") });
  if (!p.success) return fail(p.error.issues[0].message);
  const slug = slugify(str(fd, "slug") || p.data.title);
  if (!slug) return fail("Add a title");
  const id = str(fd, "id");
  const clash = await db.collection.findFirst({ where: { slug, ...(id ? { id: { not: id } } : {}) } });
  if (clash) return fail("Another collection already uses that web address");
  const data = { ...p.data, subtitle: p.data.subtitle || null, slug, featured: fd.get("featured") === "on", published: fd.get("published") === "on" };
  const c = id ? await db.collection.update({ where: { id }, data }) : await db.collection.create({ data });
  await done("Collection saved", `/dashboard/admin/collections/${c.id}`);
}

export async function addCollectionItem(fd: FormData) {
  await requireUser("ADMIN");
  const collectionId = str(fd, "collectionId");
  const [kind, id] = str(fd, "item").split(":");
  if (!["author", "book"].includes(kind) || !id) return fail("Choose an author or book");
  const ref = kind === "author" ? { authorId: id } : { bookId: id };
  // Checked explicitly: Postgres treats NULLs as distinct, so the unique index alone won't catch duplicates.
  if (await db.collectionItem.findFirst({ where: { collectionId, ...ref } })) return fail("That's already in this collection");
  const max = await db.collectionItem.aggregate({ where: { collectionId }, _max: { position: true } });
  await db.collectionItem.create({
    data: {
      collectionId,
      ...ref,
      note: str(fd, "note").slice(0, 500) || null,
      position: (max._max.position ?? 0) + 1,
    },
  });
  await done("Added");
}

export async function removeCollectionItem(fd: FormData) {
  await requireUser("ADMIN");
  await db.collectionItem.delete({ where: { id: str(fd, "id") } });
  await done("Removed");
}

export async function moveCollectionItem(fd: FormData) {
  await requireUser("ADMIN");
  const item = await db.collectionItem.findUnique({ where: { id: str(fd, "id") } });
  if (!item) return;
  const up = str(fd, "dir") === "up";
  const neighbour = await db.collectionItem.findFirst({
    where: { collectionId: item.collectionId, position: up ? { lt: item.position } : { gt: item.position } },
    orderBy: { position: up ? "desc" : "asc" },
  });
  if (!neighbour) return;
  await db.$transaction([
    db.collectionItem.update({ where: { id: item.id }, data: { position: neighbour.position } }),
    db.collectionItem.update({ where: { id: neighbour.id }, data: { position: item.position } }),
  ]);
  await done(null);
}

export async function deleteCollection(fd: FormData) {
  await requireUser("ADMIN");
  await db.collection.delete({ where: { id: str(fd, "id") } });
  await done("Collection deleted", "/dashboard/admin/collections");
}

// ---------- Articles (news, resources, events) ----------

const ArticleSchema = z.object({
  kind: z.enum(["NEWS", "RESOURCE", "EVENT"]),
  title: z.string().trim().min(3).max(160),
  summary: z.string().trim().min(10, "Add a one-line summary").max(300),
  body: z.string().trim().min(20, "Write the article body").max(40000),
  eventUrl: z.union([z.literal(""), z.string().url()]),
});

export async function saveArticle(fd: FormData) {
  await requireUser("ADMIN");
  const p = ArticleSchema.safeParse({ kind: str(fd, "kind"), title: str(fd, "title"), summary: str(fd, "summary"), body: str(fd, "body"), eventUrl: str(fd, "eventUrl") });
  if (!p.success) return fail(p.error.issues[0].message);
  const slug = slugify(str(fd, "slug") || p.data.title);
  const id = str(fd, "id");
  if (await db.article.findFirst({ where: { slug, ...(id ? { id: { not: id } } : {}) } })) return fail("Another article already uses that web address");
  const start = str(fd, "eventStart"), end = str(fd, "eventEnd");
  if (p.data.kind === "EVENT" && !isDayKey(start)) return fail("Events need a start date");
  let coverUrl: string | null = str(fd, "coverUrl") || null;
  const upload = fd.get("coverFile");
  if (hasFile(upload)) {
    const saved = await saveImage(upload, "covers");
    if ("error" in saved) return fail(saved.error);
    coverUrl = saved.url;
  }
  const published = fd.get("published") === "on";
  const existing = id ? await db.article.findUnique({ where: { id } }) : null;
  const data = {
    ...p.data,
    slug,
    eventUrl: p.data.eventUrl || null,
    coverUrl,
    eventStart: isDayKey(start) ? fromDayKey(start) : null,
    eventEnd: isDayKey(end) ? fromDayKey(end) : null,
    published,
    publishedAt: published ? (existing?.publishedAt ?? new Date()) : null,
  };
  const a = id ? await db.article.update({ where: { id }, data }) : await db.article.create({ data });
  await done(published ? "Published" : "Saved as draft", `/dashboard/admin/articles/${a.id}`);
}

export async function deleteArticle(fd: FormData) {
  await requireUser("ADMIN");
  await db.article.delete({ where: { id: str(fd, "id") } });
  await done("Article deleted", "/dashboard/admin/articles");
}
