import Link from "next/link";
import { requireUser } from "@/lib/auth";

export default async function AuthorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("AUTHOR");
  return (
    <>
      {user.status === "PENDING" && (
        <div className="alert alert-info">
          Your author account is awaiting admin approval. You can prepare listings now — they go public once you and
          each listing are approved.
        </div>
      )}
      {user.status !== "PENDING" && !user.payoutsReady && (
        <div className="alert alert-info">
          Connect Stripe so you can be paid — your listings are hidden from buyers until you do.{" "}
          <Link href="/dashboard/author/payouts" style={{ textDecoration: "underline" }}>Set up payouts</Link>
        </div>
      )}
      {children}
    </>
  );
}
