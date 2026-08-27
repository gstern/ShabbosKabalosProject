import { cookies } from "next/headers";
import { createHash } from "node:crypto";

const COOKIE = "elul_admin";

function expectedToken(): string {
  const password = process.env.ADMIN_PASSWORD ?? "change-me";
  return createHash("sha256").update(`elul:${password}`).digest("hex");
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return store.get(COOKIE)?.value === expectedToken();
}

export async function grantAdmin(password: string): Promise<boolean> {
  if (password !== (process.env.ADMIN_PASSWORD ?? "change-me")) return false;
  const store = await cookies();
  store.set(COOKIE, expectedToken(), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 60,
    path: "/",
  });
  return true;
}

export async function revokeAdmin(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
