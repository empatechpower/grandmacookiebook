import Link from "next/link";
import type { Book, VisitPackage } from "@prisma/client";
import { saveBook, savePackage } from "@/app/actions/author";
import { CATEGORIES, FORMATS } from "@/lib/constants";
import { SubmitButton } from "./SubmitButton";

const dollars = (cents?: number) => (cents != null ? (cents / 100).toFixed(2).replace(/\.00$/, "") : "");

function ReviewNote({ status, note }: { status?: string; note?: string | null }) {
  if (status === "REJECTED" && note) return <div className="alert alert-err">Admin feedback: {note}</div>;
  if (status === "APPROVED")
    return <div className="alert alert-ok">Live. Changing title, description, category or cover sends it back for review; price and stock update instantly.</div>;
  return null;
}

export function BookForm({ book }: { book?: Book }) {
  return (
    <form action={saveBook} className="panel" style={{ maxWidth: 720 }}>
      <ReviewNote status={book?.status} note={book?.reviewNote} />
      {book && <input type="hidden" name="id" value={book.id} />}
      <div className="field">
        <label htmlFor="title">Title</label>
        <input id="title" name="title" required defaultValue={book?.title} placeholder="Working title" />
      </div>
      <div className="field">
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" required defaultValue={book?.description} />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="category">Category</label>
          <select id="category" name="category" defaultValue={book?.category ?? "children"}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="price">Price (USD)</label>
          <input id="price" name="price" type="number" step="0.01" min="1" required defaultValue={dollars(book?.price) || "18"} />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="stock">Copies in stock</label>
          <input id="stock" name="stock" type="number" min="0" required defaultValue={book?.stock ?? 10} />
        </div>
        <div className="field">
          <label htmlFor="coverFile">Cover image</label>
          <input id="coverFile" name="coverFile" type="file" accept="image/jpeg,image/png,image/webp" />
          <div className="hint">JPEG, PNG or WebP, up to 5 MB.</div>
        </div>
      </div>
      <div className="field">
        <label htmlFor="images">More photos (optional)</label>
        <input id="images" name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple />
        <div className="hint">Back cover, inside pages, merchandise shots — up to 8 extra photos.</div>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="bulkMinQty">Classroom-set price from (copies)</label>
          <input id="bulkMinQty" name="bulkMinQty" type="number" min={2} defaultValue={book?.bulkMinQty ?? ""} placeholder="e.g. 25" />
        </div>
        <div className="field">
          <label htmlFor="bulkPrice">Classroom-set price per copy (USD)</label>
          <input id="bulkPrice" name="bulkPrice" type="number" step="0.01" min="1" defaultValue={dollars(book?.bulkPrice ?? undefined)} placeholder="Optional" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="coverUrl">…or cover image URL</label>
        <div className="row" style={{ alignItems: "center" }}>
          {book?.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={book.coverUrl} alt="" style={{ width: 56, height: 42, borderRadius: 8, objectFit: "cover" }} />
          )}
          <input id="coverUrl" name="coverUrl" defaultValue={book?.coverUrl ?? ""} placeholder="https://" style={{ flex: 1 }} />
        </div>
      </div>
      <div className="row">
        <SubmitButton className="btn btn-terra">{book ? "Save changes" : "Submit for review"}</SubmitButton>
        <Link className="btn btn-ghost" href="/dashboard/author/books">Cancel</Link>
      </div>
    </form>
  );
}

export function PackageForm({ pkg }: { pkg?: VisitPackage }) {
  return (
    <form action={savePackage} className="panel" style={{ maxWidth: 720 }}>
      <ReviewNote status={pkg?.status} note={pkg?.reviewNote} />
      {pkg && <input type="hidden" name="id" value={pkg.id} />}
      <div className="field">
        <label htmlFor="title">Package name</label>
        <input id="title" name="title" required defaultValue={pkg?.title} placeholder="Keynote / classroom hour" />
      </div>
      <div className="field">
        <label htmlFor="description">What the audience gets</label>
        <textarea id="description" name="description" required defaultValue={pkg?.description} />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="format">Format</label>
          <select id="format" name="format" defaultValue={pkg?.format ?? "IN_PERSON"}>
            {FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="durationMins">Duration (minutes)</label>
          <input id="durationMins" name="durationMins" type="number" min="10" required defaultValue={pkg?.durationMins ?? 45} />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="fee">Fee (USD)</label>
          <input id="fee" name="fee" type="number" step="0.01" min="1" required defaultValue={dollars(pkg?.fee) || "500"} />
        </div>
        <div className="field">
          <label htmlFor="region">Travel region</label>
          <input id="region" name="region" defaultValue={pkg?.region ?? ""} placeholder="e.g. Rio Grande Valley, South Texas, or Anywhere" />
        </div>
      </div>
      <div className="row">
        <SubmitButton className="btn btn-terra">{pkg ? "Save changes" : "Submit for review"}</SubmitButton>
        <Link className="btn btn-ghost" href="/dashboard/author/visits">Cancel</Link>
      </div>
    </form>
  );
}
