import "server-only";
import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Image uploads (author photos, book covers).
 * - Production: any S3-compatible bucket (AWS S3, Cloudflare R2, DigitalOcean Spaces…) when S3_BUCKET is set.
 * - Local: ./uploads on disk, served by src/app/uploads/[...path]/route.ts.
 *   (Serverless hosts like Vercel don't keep files written to disk, so set S3_* there.)
 */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "uploads");

const TYPES = [
  { ext: "jpg", mime: "image/jpeg", magic: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "png", mime: "image/png", magic: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: "webp", mime: "image/webp", magic: (b: Buffer) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP" },
];
export const mimeForExt = (ext: string) => TYPES.find((t) => t.ext === ext)?.mime;

const s3 = process.env.S3_BUCKET
  ? new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined, // e.g. https://<account>.r2.cloudflarestorage.com
      credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
    })
  : null;

/** A file input value that actually contains a file (empty inputs submit a 0-byte File). */
export const hasFile = (v: FormDataEntryValue | null): v is File => typeof v === "object" && v !== null && v.size > 0;

/**
 * Validates by content (not the browser-supplied name or type) and stores the image.
 * Returns its public URL, or an error message for the user.
 */
export async function saveImage(file: File, folder: "avatars" | "covers"): Promise<{ url: string } | { error: string }> {
  if (file.size > MAX_IMAGE_BYTES) return { error: "Images must be 5 MB or smaller" };
  const buf = Buffer.from(await file.arrayBuffer());
  const type = TYPES.find((t) => t.magic(buf));
  if (!type) return { error: "Upload a JPEG, PNG or WebP image" };
  const key = `${folder}/${randomUUID()}.${type.ext}`;

  if (s3) {
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
        Body: buf,
        ContentType: type.mime,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return { url: `${process.env.S3_PUBLIC_URL!.replace(/\/$/, "")}/${key}` };
  }
  const dest = path.join(LOCAL_UPLOAD_DIR, key);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, buf);
  return { url: `/uploads/${key}` };
}

// ---------- Private files (booking contracts) ----------
// Stored under contracts/ and only ever served through an authorised route, never by URL.
// On S3, keep the contracts/ prefix private (block public access to it).

export const MAX_PDF_BYTES = 10 * 1024 * 1024;

export async function savePrivatePdf(file: File): Promise<{ key: string } | { error: string }> {
  if (file.size > MAX_PDF_BYTES) return { error: "Contracts must be 10 MB or smaller" };
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.toString("ascii", 0, 5) !== "%PDF-") return { error: "Upload the contract as a PDF" };
  const key = `contracts/${randomUUID()}.pdf`;
  if (s3) {
    await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key, Body: buf, ContentType: "application/pdf" }));
  } else {
    const dest = path.join(LOCAL_UPLOAD_DIR, key);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, buf);
  }
  return { key };
}

export async function readPrivateFile(key: string): Promise<Uint8Array | null> {
  if (!/^contracts\/[0-9a-f-]{36}\.pdf$/.test(key)) return null;
  try {
    if (s3) {
      const obj = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }));
      return obj.Body ? await obj.Body.transformToByteArray() : null;
    }
    return await readFile(path.join(LOCAL_UPLOAD_DIR, key));
  } catch {
    return null;
  }
}
