import { redirect } from "next/navigation";
import { currentUser, dashboardPath } from "@/lib/auth";
import { SignupForm } from "@/components/AuthForms";

export const metadata = { title: "Join — Atelier" };

export default async function Signup({ searchParams }: { searchParams: Promise<{ role?: string; email?: string }> }) {
  const user = await currentUser();
  if (user) redirect(dashboardPath(user.role));
  const { role, email } = await searchParams;
  return (
    <div className="auth-shell">
      <div className="auth-art">
        <div>
          <div className="eyebrow" style={{ color: "#e8b089" }}>New member</div>
          <h2 style={{ fontSize: "2.6rem" }}>Pick the desk that fits you.</h2>
        </div>
        <p>Authors sell books and offer visits. Buyers purchase and book. Super admins are invited internally.</p>
      </div>
      <div className="auth-form">
        <h2 style={{ marginBottom: 20 }}>Create account</h2>
        <SignupForm initialRole={role ?? "BUYER"} initialEmail={email} />
      </div>
    </div>
  );
}
