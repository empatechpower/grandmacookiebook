import { redirect } from "next/navigation";

// Pricing is private to authors (client request); it lives in the author dashboard.
export default function Pricing() {
  redirect("/dashboard/author/pricing");
}
