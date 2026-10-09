import type { Collection } from "@prisma/client";
import { saveCollection } from "@/app/actions/content";
import { COLLECTION_KINDS } from "@/lib/content";
import { SubmitButton } from "./SubmitButton";

export function CollectionForm({ c }: { c?: Collection }) {
  return (
    <form action={saveCollection} className="panel" style={{ maxWidth: 760 }}>
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="field-row">
        <div className="field">
          <label htmlFor="title">Title</label>
          <input id="title" name="title" required defaultValue={c?.title} placeholder="2027 Featured Author Catalog" maxLength={150} />
        </div>
        <div className="field">
          <label htmlFor="kind">Type</label>
          <select id="kind" name="kind" defaultValue={c?.kind ?? "CATALOG"}>
            {COLLECTION_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="subtitle">Subtitle (optional)</label>
          <input id="subtitle" name="subtitle" defaultValue={c?.subtitle ?? ""} placeholder="Curated by our educator panel · October 2026" maxLength={200} />
        </div>
        <div className="field">
          <label htmlFor="slug">Web address</label>
          <input id="slug" name="slug" defaultValue={c?.slug} placeholder="auto from title" maxLength={80} pattern="[a-z0-9\-]*" title="Lowercase letters, numbers and dashes" />
          <div className="hint">/collections/<b>{c?.slug ?? "…"}</b></div>
        </div>
      </div>
      <div className="field">
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" required defaultValue={c?.description} maxLength={5000} />
      </div>
      <div className="row" style={{ marginBottom: 14 }}>
        <label className="row" style={{ gap: 6 }}><input type="checkbox" name="published" defaultChecked={c?.published} style={{ width: "auto" }} /> Published</label>
        <label className="row" style={{ gap: 6 }}><input type="checkbox" name="featured" defaultChecked={c?.featured} style={{ width: "auto" }} /> Feature on home page</label>
      </div>
      <SubmitButton>{c ? "Save changes" : "Create collection"}</SubmitButton>
    </form>
  );
}
