import { mimeForExt, readImage } from "@/lib/storage";

/** Serves uploaded images from the bucket (production) or local disk (development). */
export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  // Only "<folder>/<uuid>.<ext>" in the image folders — rejects traversal like ../../.env and never serves contracts/.
  if (parts.length !== 2 || !/^(avatars|covers|media)$/.test(parts[0]) || !/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(parts[1])) {
    return new Response("Not found", { status: 404 });
  }
  const file = await readImage(`${parts[0]}/${parts[1]}`);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(file as BodyInit, {
    headers: {
      "Content-Type": mimeForExt(parts[1].split(".")[1])!,
      // Each upload has a new random name, so it can be cached forever (by browsers and Vercel's CDN).
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
