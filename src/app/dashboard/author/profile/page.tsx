import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { PageHead } from "@/components/ui";
import { ProfileForm } from "@/components/ProfileForm";
import { ChangePasswordForm } from "@/components/PasswordForms";

export default async function AuthorProfile() {
  const user = await requireUser("AUTHOR");
  return (
    <>
      <PageHead
        title="Public profile"
        sub="Buyers see this on your author page."
        action={user.status === "ACTIVE" && <Link className="btn btn-line" href={`/authors/${user.id}`}>View public page</Link>}
      />
      <ProfileForm user={user} showBio />
      <ChangePasswordForm />
    </>
  );
}
