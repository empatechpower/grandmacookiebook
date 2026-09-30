import { requireUser } from "@/lib/auth";

export default async function BuyerLayout({ children }: { children: React.ReactNode }) {
  await requireUser("BUYER");
  return children;
}
