import { requireUser } from "@/lib/auth";
import { PageHead } from "@/components/ui";
import { ProfileForm } from "@/components/ProfileForm";
import { ChangePasswordForm } from "@/components/PasswordForms";

export default async function BuyerProfile() {
  const user = await requireUser("BUYER");
  return (
    <>
      <PageHead title="Profile" />
      <ProfileForm user={user} showBio={false} />
      <ChangePasswordForm />
    </>
  );
}
