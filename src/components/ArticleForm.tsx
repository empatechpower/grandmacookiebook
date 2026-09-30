import type { Article } from "@prisma/client";
import { saveArticle } from "@/app/actions/content";
import { ARTICLE_KINDS } from "@/lib/content";
import { dayKey } from "@/lib/dates";
import { SubmitButton } from "./SubmitButton";

export function ArticleForm({ a, kind }: { a?: Article; kind?: string }) {
  return (
    <form action={saveArticle} className="panel" style={{ maxWidth: 860 }}>
      {a && <input type="hidden" name="id" value={a.id} />}
      <div className="field-row">
        <div className="field">
          <label htmlFor="title">Title</label>
          <input id="title" name="title" required defaultValue={a?.title} />
        </div>
        <div className="field">
          <label htmlFor="kind">Section</label>
          <select id="kind" name="kind" defaultValue={a?.kind ?? kind ?? "NEWS"}>
            {ARTICLE_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label} ({k.path})</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="summary">Summary</label>
        <input id="summary" name="summary" required maxLength={300} defaultValue={a?.summary} placeholder="One line shown in lists and link previews" />
      </div>
      <div className="field">
        <label htmlFor="body">Body</label>
        <textarea id="body" name="body" required defaultValue={a?.body} style={{ minHeight: 280, fontFamily: "ui-monospace, monospace", fontSize: ".88rem" }} />
        <div className="hint">Blank line = new paragraph. Start a line with <code>## </code> for a heading or <code>- </code> for a bullet. Links are clickable automatically.</div>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="coverFile">Cover image</label>
          <input id="coverFile" name="coverFile" type="file" accept="image/jpeg,image/png,image/webp" />
        </div>
        <div className="field">
          <label htmlFor="coverUrl">…or cover image URL</label>
          <input id="coverUrl" name="coverUrl" defaultValue={a?.coverUrl ?? ""} />
        </div>
      </div>
      <fieldset className="field panel" style={{ background: "var(--paper)" }}>
        <legend>Event details (events only)</legend>
        <div className="field-row">
          <div className="field">
            <label htmlFor="eventStart">Starts</label>
            <input id="eventStart" name="eventStart" type="date" defaultValue={a?.eventStart ? dayKey(a.eventStart) : ""} />
          </div>
          <div className="field">
            <label htmlFor="eventEnd">Ends</label>
            <input id="eventEnd" name="eventEnd" type="date" defaultValue={a?.eventEnd ? dayKey(a.eventEnd) : ""} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="eventUrl">Registration or livestream link</label>
          <input id="eventUrl" name="eventUrl" defaultValue={a?.eventUrl ?? ""} placeholder="https://" />
        </div>
      </fieldset>
      <div className="field-row">
        <div className="field">
          <label htmlFor="slug">Web address</label>
          <input id="slug" name="slug" defaultValue={a?.slug} placeholder="auto from title" />
        </div>
        <label className="row" style={{ gap: 6, alignSelf: "end", marginBottom: 20 }}>
          <input type="checkbox" name="published" defaultChecked={a?.published} style={{ width: "auto" }} /> Published
        </label>
      </div>
      <SubmitButton>{a ? "Save" : "Create"}</SubmitButton>
    </form>
  );
}
