import { updateProfile } from "@/app/actions/author";
import type { CurrentUser } from "@/lib/auth";
import { GRADES, IDENTITIES, LANGUAGES, ORG_TYPES, TOPICS } from "@/lib/constants";
import { parseTags } from "@/lib/tags";
import { SubmitButton } from "./SubmitButton";

function Checks({ name, legend, opts, selected, hint }: {
  name: string;
  legend: string;
  opts: { value: string; label: string }[];
  selected: string;
  hint?: string;
}) {
  const on = parseTags(selected);
  return (
    <fieldset className="field">
      <legend>{legend}</legend>
      <div className="check-grid">
        {opts.map((o) => (
          <label key={o.value}>
            <input type="checkbox" name={name} value={o.value} defaultChecked={on.includes(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
      {hint && <div className="hint">{hint}</div>}
    </fieldset>
  );
}

export function ProfileForm({ user, showBio }: { user: CurrentUser; showBio: boolean }) {
  return (
    <form action={updateProfile} className="panel" style={{ maxWidth: showBio ? 820 : 560 }}>
      <div className={showBio ? "field-row" : undefined}>
        <div className="field">
          <label htmlFor="name">{showBio ? "Display name" : "Your name"}</label>
          <input id="name" name="name" defaultValue={user.name} required />
        </div>
        <div className="field">
          <label>Email</label>
          <input value={user.email} disabled />
        </div>
      </div>
      {showBio && (
        <div className="field">
          <label htmlFor="slug">Storefront link</label>
          <div className="slug-input">
            <span>/authors/</span>
            <input id="slug" name="slug" defaultValue={user.slug ?? ""} placeholder="your-name" pattern="[a-z0-9]+(-[a-z0-9]+)*" minLength={3} maxLength={40} />
          </div>
          <div className="hint">Lowercase letters, numbers and dashes. Your old link keeps working.</div>
        </div>
      )}
      {showBio && (
        <div className="field">
          <label htmlFor="headline">Headline</label>
          <input id="headline" name="headline" maxLength={120} defaultValue={user.headline ?? ""} placeholder="Children's author & SEL speaker" />
        </div>
      )}
      {!showBio && (
        <div className="field-row">
          <div className="field">
            <label htmlFor="orgType">Booking for</label>
            <select id="orgType" name="orgType" defaultValue={user.orgType ?? ""}>
              <option value="">—</option>
              {ORG_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="orgName">Organization name</label>
            <input id="orgName" name="orgName" defaultValue={user.orgName ?? ""} placeholder="Shown to authors on your requests" />
          </div>
        </div>
      )}
      <div className="field">
        <label htmlFor="location">{showBio ? "Based in" : "Default shipping address"}</label>
        <input id="location" name="location" defaultValue={user.location ?? ""} />
      </div>
      {showBio && (
        <>
          <div className="field">
            <label htmlFor="bio">Bio</label>
            <textarea id="bio" name="bio" defaultValue={user.bio ?? ""} placeholder="Shown on your public author page" />
          </div>
          <div className="field">
            <label htmlFor="avatarFile">Photo</label>
            <div className="row" style={{ alignItems: "center" }}>
              {user.avatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover" }} />
              )}
              <input id="avatarFile" name="avatarFile" type="file" accept="image/jpeg,image/png,image/webp" style={{ flex: 1 }} />
            </div>
            <div className="hint">JPEG, PNG or WebP, up to 5 MB. Square photos look best.</div>
          </div>
          <div className="field">
            <label htmlFor="avatarUrl">…or photo URL</label>
            <input id="avatarUrl" name="avatarUrl" defaultValue={user.avatarUrl ?? ""} placeholder="https://" />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="websiteUrl">Website</label>
              <input id="websiteUrl" name="websiteUrl" type="url" defaultValue={user.websiteUrl ?? ""} placeholder="https://" />
            </div>
            <div className="field">
              <label htmlFor="videoUrl">Intro video</label>
              <input id="videoUrl" name="videoUrl" type="url" defaultValue={user.videoUrl ?? ""} placeholder="YouTube or Vimeo link" />
            </div>
          </div>
          <div className="field-row three">
            <div className="field">
              <label htmlFor="facebookUrl">Facebook</label>
              <input id="facebookUrl" name="facebookUrl" type="url" defaultValue={user.facebookUrl ?? ""} placeholder="https://facebook.com/…" />
            </div>
            <div className="field">
              <label htmlFor="instagramUrl">Instagram</label>
              <input id="instagramUrl" name="instagramUrl" type="url" defaultValue={user.instagramUrl ?? ""} placeholder="https://instagram.com/…" />
            </div>
            <div className="field">
              <label htmlFor="tiktokUrl">TikTok</label>
              <input id="tiktokUrl" name="tiktokUrl" type="url" defaultValue={user.tiktokUrl ?? ""} placeholder="https://tiktok.com/@…" />
            </div>
          </div>
          <Checks name="topics" legend="Topics you speak and write about" opts={TOPICS} selected={user.topics} hint="Schools filter by these." />
          <Checks name="grades" legend="Grade levels / audiences" opts={GRADES} selected={user.grades} />
          <Checks name="languages" legend="Languages you present in" opts={LANGUAGES} selected={user.languages} />
          <Checks name="identities" legend="Community tags (optional)" opts={IDENTITIES} selected={user.identities} hint="Shown on your profile and used in discovery filters." />
        </>
      )}
      <SubmitButton>Save profile</SubmitButton>
    </form>
  );
}
