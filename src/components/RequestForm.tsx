import { submitRequestForm } from "@/app/actions/forms";
import { SubmitButton } from "./SubmitButton";

type Field = { name: string; label: string; type?: "text" | "textarea" | "select" | "number"; options?: string[]; placeholder?: string; required?: boolean };

/** Generic public request form posting to submitRequestForm (answers go to the admin inbox). */
export function RequestForm({ form, fields, submit, defaults }: { form: string; fields: Field[]; submit: string; defaults?: { name?: string; email?: string } }) {
  return (
    <form action={submitRequestForm}>
      <input type="hidden" name="form" value={form} />
      <div className="field-row">
        <div className="field">
          <label htmlFor={`${form}-name`}>Your name</label>
          <input id={`${form}-name`} name="name" required defaultValue={defaults?.name} />
        </div>
        <div className="field">
          <label htmlFor={`${form}-email`}>Email</label>
          <input id={`${form}-email`} name="email" type="email" required defaultValue={defaults?.email} />
        </div>
      </div>
      {fields.map((f) => {
        const id = `${form}-${f.name}`;
        return (
          <div className="field" key={f.name}>
            <label htmlFor={id}>{f.label}</label>
            {f.type === "textarea" ? (
              <textarea id={id} name={f.name} required={f.required} placeholder={f.placeholder} />
            ) : f.type === "select" ? (
              <select id={id} name={f.name}>{f.options!.map((o) => <option key={o}>{o}</option>)}</select>
            ) : (
              <input id={id} name={f.name} type={f.type ?? "text"} required={f.required} placeholder={f.placeholder} />
            )}
          </div>
        );
      })}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px" }}>
        <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <SubmitButton className="btn btn-terra" pendingText="Sending…">{submit}</SubmitButton>
    </form>
  );
}
