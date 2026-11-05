import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, isValidCookie } from "@/lib/auth";

// Rotas dos Atalhos e da extensão (/api/gate, /api/event, /api/pass-status) checam o segredo por conta própria.
// /login, manifest e ícones ficam abertos. O resto exige o cookie.
const PUBLIC = [/^\/login$/, /^\/api\/gate$/, /^\/api\/event$/, /^\/api\/pass-status$/, /^\/manifest\.webmanifest$/, /^\/(icon|apple-icon)$/];

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.some((r) => r.test(pathname))) return NextResponse.next();

  if (await isValidCookie(req.cookies.get(COOKIE_NAME)?.value)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
