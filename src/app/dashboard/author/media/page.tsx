import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { MEDIA_CATEGORIES } from "@/lib/storefront";
import { addMedia, deleteMedia, moveMedia } from "@/app/actions/media";
import { PageHead } from "@/components/ui";
import { MediaTile } from "@/components/MediaGrid";
import { SubmitButton } from "@/components/SubmitButton";

export default async function Media() {
  const user = await requireUser("AUTHOR");
  const items = await db.media.findMany({ where: { authorId: user.id }, orderBy: { position: "asc" } });
  return (
    <>
      <PageHead title="Media" sub="Photos, videos, interviews, school visits and awards — shown on your storefront in this order." />
      <div className="grid-2" style={{ alignItems: "start", marginBottom: 24 }}>
        <form action={addMedia} className="panel">
          <h3 style={{ marginBottom: 10 }}>Add a photo</h3>
          <input type="hidden" name="kind" value="PHOTO" />
          <div className="field"><label htmlFor="p-file">Upload</label><input id="p-file" name="file" type="file" accept="image/jpeg,image/png,image/webp" /></div>
          <div className="field"><label htmlFor="p-url">…or image link</label><input id="p-url" name="url" placeholder="https://" /></div>
          <div className="field-row">
            <div className="field"><label htmlFor="p-title">Title</label><input id="p-title" name="title" required placeholder="Reading at Lincoln Elementary" /></div>
            <div className="field"><label htmlFor="p-cat">Category</label>
              <select id="p-cat" name="category" defaultValue="SCHOOL_VISITS">{MEDIA_CATEGORIES.filter((c) => c.value !== "VIDEOS").map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
            </div>
          </div>
          <div className="field"><label htmlFor="p-cap">Caption (optional)</label><input id="p-cap" name="caption" maxLength={300} /></div>
          <SubmitButton className="btn btn-terra" pendingText="Uploading…">Add photo</SubmitButton>
        </form>
        <form action={addMedia} className="panel">
          <h3 style={{ marginBottom: 10 }}>Add a video</h3>
          <input type="hidden" name="kind" value="VIDEO" />
          <div className="field"><label htmlFor="v-url">Video link</label><input id="v-url" name="url" required placeholder="YouTube, Vimeo or any video page" /></div>
          <div className="field-row">
            <div className="field"><label htmlFor="v-title">Title</label><input id="v-title" name="title" required placeholder="Interview on KSAT 12" /></div>
            <div className="field"><label htmlFor="v-cat">Category</label>
              <select id="v-cat" name="category" defaultValue="VIDEOS">{MEDIA_CATEGORIES.filter((c) => c.value !== "PHOTOS").map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
            </div>
          </div>
          <div className="field"><label htmlFor="v-cap">Caption (optional)</label><input id="v-cap" name="caption" maxLength={300} /></div>
          <SubmitButton className="btn btn-terra">Add video</SubmitButton>
          <p className="hint" style={{ marginTop: 8 }}>YouTube and Vimeo videos play right on your storefront.</p>
        </form>
      </div>
      {items.length === 0 ? (
        <div className="empty">Nothing yet. Add photos from school visits, interviews, awards and more.</div>
      ) : (
        <div className="media-grid">
          {items.map((m, i) => (
            <div key={m.id}>
              <MediaTile m={m} />
              <div className="row" style={{ marginTop: 6 }}>
                {i > 0 && (<form action={moveMedia}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="dir" value="up" /><SubmitButton className="btn btn-ghost btn-sm" aria-label="Move earlier">←</SubmitButton></form>)}
                {i < items.length - 1 && (<form action={moveMedia}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="dir" value="down" /><SubmitButton className="btn btn-ghost btn-sm" aria-label="Move later">→</SubmitButton></form>)}
                <form action={deleteMedia}><input type="hidden" name="id" value={m.id} /><SubmitButton className="btn btn-danger btn-sm" confirm="Remove this from your storefront?">Remove</SubmitButton></form>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
