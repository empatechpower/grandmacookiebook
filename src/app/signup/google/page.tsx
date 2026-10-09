import { redirect } from "next/navigation";
import { currentUser, dashboardPath } from "@/lib/auth";
import { readPendingGoogleSignup } from "@/lib/google";
import { GoogleSignupForm } from "@/components/AuthForms";

export const metadata = { title: "Finish signing up" };

/** New "Continue with Google" users choose Guest or Author here before their account is created. */
export default async function GoogleSignup() {
  const user = await currentUser();
  if (user) redirect(dashboardPath(user.role));
  const pending = await readPendingGoogleSignup();
  if (!pending) redirect("/signup");
  return (
    <div className="auth-shell">
      <div className="auth-art">
        <div>
          <div className="eyebrow" style={{ color: "#e5c37a" }}>Almost there</div>
          <h2 style={{ fontSize: "2.6rem" }}>One last step.</h2>
        </div>
        <p>Tell us whether you’re here to book authors and buy books, or to sell and speak as an author.</p>
      </div>
      <div className="auth-form">
        <h2 style={{ marginBottom: 20 }}>Finish signing up</h2>
        <GoogleSignupForm name={pending.name} email={pending.email} initialRole={pending.role} />
      </div>
    </div>
  );
}
