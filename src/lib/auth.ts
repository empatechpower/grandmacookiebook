import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "./db";
import { readSession } from "./session";
import type { Role } from "./constants";

/** The signed-in user, re-read from the DB each request so suspensions and password changes apply immediately. */
export const currentUser = cache(async () => {
  const session = await readSession();
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.id } });
  if (!user || user.status === "SUSPENDED" || user.sessionVersion !== session.v) return null;
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

/** Guard for pages and server actions. Redirects rather than throwing. */
export async function requireUser(...roles: Role[]) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (roles.length && !roles.includes(user.role as Role)) redirect("/dashboard");
  return user;
}

export const dashboardPath = (role: string) =>
  role === "ADMIN" ? "/dashboard/admin" : role === "AUTHOR" ? "/dashboard/author" : "/dashboard/buyer";
