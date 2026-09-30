import Link from "next/link";
import { ResetForm } from "@/components/PasswordForms";

export const metadata = { title: "Choose a new password" };

export default async function Reset({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <section className="pad">
      <div className="wrap" style={{ maxWidth: 480 }}>
        <h2>Choose a new password</h2>
        <p className="lede-sm">You’ll be signed in, and any other devices will be signed out.</p>
        <div className="panel">
          {token ? (
            <ResetForm token={token} />
          ) : (
            <div className="alert alert-err">
              This link is missing its token. <Link href="/forgot-password" style={{ textDecoration: "underline" }}>Request a new link</Link>.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
