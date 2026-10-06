"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { done, fail, str } from "@/lib/actions";
import { hasFile, saveImage } from "@/lib/storage";
import { MEDIA_CATEGORIES } from "@/lib/storefront";

const MAX_ITEMS = 60;

export async function addMedia(fd: FormData) {
  const user = await requireUser("AUTHOR");
  if ((await db.media.count({ where: { authorId: user.id } })) >= MAX_ITEMS) return fail(`You can add up to ${MAX_ITEMS} items`);
  const kind = str(fd, "kind") === "VIDEO" ? "VIDEO" : "PHOTO";
  const category = MEDIA_CATEGORIES.some((c) => c.value === str(fd, "category")) ? str(fd, "category") : "OTHER";
  const title = str(fd, "title").slice(0, 120);
  if (title.length < 2) return fail("Give it a short title");
  let url = str(fd, "url");
  const file = fd.get("file");
  if (kind === "PHOTO" && hasFile(file)) {
    const saved = await saveImage(file, "media");
    if ("error" in saved) return fail(saved.error);
    url = saved.url;
  }
  if (!url) return fail(kind === "PHOTO" ? "Upload a photo or paste its link" : "Paste the video link (YouTube, Vimeo…)");
  if (!url.startsWith("/uploads/") && !z.string().url().safeParse(url).success) return fail("That link doesn't look right — it should start with https://");
  const max = await db.media.aggregate({ where: { authorId: user.id }, _max: { position: true } });
  await db.media.create({
    data: { authorId: user.id, kind, category, title, url, caption: str(fd, "caption").slice(0, 300) || null, position: (max._max.position ?? 0) + 1 },
  });
  await done("Added to your storefront");
}

export async function deleteMedia(fd: FormData) {
  const user = await requireUser("AUTHOR");
  await db.media.deleteMany({ where: { id: str(fd, "id"), authorId: user.id } });
  await done("Removed");
}

export async function moveMedia(fd: FormData) {
  const user = await requireUser("AUTHOR");
  const item = await db.media.findFirst({ where: { id: str(fd, "id"), authorId: user.id } });
  if (!item) return;
  const up = str(fd, "dir") === "up";
  const other = await db.media.findFirst({
    where: { authorId: user.id, position: up ? { lt: item.position } : { gt: item.position } },
    orderBy: { position: up ? "desc" : "asc" },
  });
  if (!other) return;
  await db.$transaction([
    db.media.update({ where: { id: item.id }, data: { position: other.position } }),
    db.media.update({ where: { id: other.id }, data: { position: item.position } }),
  ]);
  await done(null);
}
