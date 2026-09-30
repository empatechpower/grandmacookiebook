import "server-only";
import { cookies } from "next/headers";

/** One-shot toast message. Read by <Toast> in the root layout, which clears it client-side. */
export async function flash(message: string) {
  (await cookies()).set("flash", `${Date.now()}|${message}`, { path: "/", maxAge: 10, sameSite: "lax" });
}
