"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, isValidKey, sessionToken } from "@/lib/auth";

function safeNext(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "/";
  // resolve como o navegador resolveria; se sair da origem (//x, /\t/x...), volta pro início
  try {
    const u = new URL(value, "http://porteiro.local");
    const path = u.pathname.replace(/^\/+/, "/"); // "//evil.com" viraria URL de outro domínio
    return u.origin === "http://porteiro.local" ? path + u.search : "/";
  } catch {
    return "/";
  }
}

export async function login(form: FormData) {
  const next = safeNext(form.get("next"));
  const secret = form.get("segredo");

  if (typeof secret !== "string" || !isValidKey(secret)) {
    redirect(`/login?erro=1&next=${encodeURIComponent(next)}`);
  }

  (await cookies()).set(COOKIE_NAME, await sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect(next);
}
