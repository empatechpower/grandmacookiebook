import { redirect } from "next/navigation";
import { currentUser, dashboardPath } from "@/lib/auth";
import { LoginForm } from "@/components/AuthForms";

export const metadata = { title: "Log in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await currentUser();
  if (user) redirect(dashboardPath(user.role));
  const { next } = await searchParams;
  return (
    <div className="auth-shell">
      <div className="auth-art">
        <div>
          <div className="eyebrow" style={{ color: "#e8b089" }}>Welcome back</div>
          <h2 style={{ fontSize: "2.6rem", letterSpacing: "-.03em" }}>Your desk is waiting.</h2>
        </div>
        {process.env.NODE_ENV !== "production" && (
          <p>
            Demo accounts (password <b>atelier123</b>):
            <br />
            buyer@atelier.test · author@atelier.test · admin@atelier.test
          </p>
        )}
      </div>
      <div className="auth-form">
        <h2>Log in</h2>
        <p style={{ color: "var(--mute)", margin: "8px 0 22px" }}>Buyers, authors and admins all sign in here.</p>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
