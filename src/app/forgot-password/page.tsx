import { ForgotForm } from "@/components/PasswordForms";

export const metadata = { title: "Reset password" };

export default function Forgot() {
  return (
    <section className="pad">
      <div className="wrap" style={{ maxWidth: 480 }}>
        <h2>Forgot your password?</h2>
        <p className="lede-sm">Enter your account email and we’ll send you a link to choose a new one.</p>
        <div className="panel"><ForgotForm /></div>
      </div>
    </section>
  );
}
