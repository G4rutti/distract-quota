// Auth de um usuário só, sem dependência: um segredo no ambiente.
// - Atalhos do iPhone mandam o segredo no header x-porteiro-key.
// - O navegador recebe um cookie com um hash do segredo depois do /login.
// Roda tanto no proxy quanto em route handlers (só usa Web Crypto).

export const COOKIE_NAME = "porteiro";
export const KEY_HEADER = "x-porteiro-key";

function secret(): string {
  const s = process.env.APP_SECRET;
  if (!s || s.length < 16) throw new Error("APP_SECRET ausente ou curto demais (mínimo 16 caracteres).");
  return s;
}

/** Compara em tempo constante pra não vazar o segredo por timing. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function sessionToken(): Promise<string> {
  const data = new TextEncoder().encode(`porteiro-cookie:${secret()}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isValidCookie(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  return safeEqual(value, await sessionToken());
}

export function isValidKey(value: string | null): boolean {
  if (!value) return false;
  return safeEqual(value, secret());
}
