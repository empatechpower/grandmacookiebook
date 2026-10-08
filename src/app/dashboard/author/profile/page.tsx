import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { appUrl } from "@/lib/url";
import { authorPath } from "@/lib/storefront";
import { ensureAuthorSlug } from "@/lib/slugs";
import { PageHead } from "@/components/ui";
import { ProfileForm } from "@/components/ProfileForm";
import { CopyLink } from "@/components/CopyLink";

export default async function Storefront() {
  const user = await requireUser("AUTHOR");
  user.slug = (await ensureAuthorSlug(user)) ?? user.slug;
  const url = `${await appUrl()}${authorPath(user)}`;
  const live = user.status === "ACTIVE" && user.payoutsReady;
  return (
    <>
      <PageHead title="Storefront" sub="Your public page: biography, links, focus areas and visit details. Books and visits come from Products and Listings." />
      <div className="panel split" style={{ marginBottom: 18, maxWidth: 820 }}>
        <div style={{ minWidth: 0 }}>
          <b>Your storefront link</b>
          <div className="muted" style={{ fontSize: ".9rem", overflowWrap: "anywhere" }}>{url}</div>
          {!live && <div className="hint">Your storefront goes public once your account is approved and Stripe is connected.</div>}
        </div>
        <div className="row">
          <CopyLink url={url} />
          {live && <Link className="btn btn-ink btn-sm" href={authorPath(user)} target="_blank">View storefront</Link>}
        </div>
      </div>
      <div className="row" style={{ marginBottom: 18 }}>
        <Link className="btn btn-ghost btn-sm" href="/dashboard/author/media">+ Photos & videos (Media)</Link>
        <Link className="btn btn-ghost btn-sm" href="/dashboard/author/books">+ Books & products</Link>
        <Link className="btn btn-ghost btn-sm" href="/dashboard/author/visits">+ Visit listings</Link>
      </div>
      <ProfileForm user={user} showBio />
    </>
  );
}
