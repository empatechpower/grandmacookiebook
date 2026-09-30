import { redirect } from "next/navigation";
import { dashboardPath, requireUser } from "@/lib/auth";

export default async function Dashboard() {
  const user = await requireUser();
  redirect(dashboardPath(user.role));
}
