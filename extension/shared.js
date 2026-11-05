// Configuração e chamadas à API, usadas pelo service worker e pelo popup.

export const DEFAULT_BASE = "https://distract-quota.vercel.app";

// Mesma lista de lib/config.ts do app.
export const APPS = {
  tiktok: { name: "TikTok", domains: ["tiktok.com"] },
  instagram: { name: "Instagram", domains: ["instagram.com"] },
  twitter: { name: "X", domains: ["x.com", "twitter.com"] },
};

/** Qual app é essa URL (ou null). Só https. */
export function appFromUrl(url) {
  if (!url) return null;
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.toLowerCase();
  for (const [id, a] of Object.entries(APPS)) {
    if (a.domains.some((d) => host === d || host.endsWith("." + d))) return id;
  }
  return null;
}

/** { base, key, expel } do armazenamento local. */
export async function getConfig() {
  const c = await chrome.storage.local.get({ base: DEFAULT_BASE, key: "", expel: true });
  return { base: String(c.base || DEFAULT_BASE).replace(/\/+$/, ""), key: String(c.key || ""), expel: c.expel !== false };
}

/** GET na API do Porteiro com o segredo no header. Timeout curto: rede ruim não pode travar o navegador. */
export async function api(path, params = {}) {
  const { base, key } = await getConfig();
  if (!key) return { ok: false, status: 0, text: "sem segredo" };
  const qs = new URLSearchParams({ ...params, src: "chrome" }).toString();
  try {
    const res = await fetch(`${base}${path}?${qs}`, {
      headers: { "x-porteiro-key": key },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return { ok: res.ok, status: res.status, text: (await res.text()).trim() };
  } catch (err) {
    return { ok: false, status: 0, text: String(err) };
  }
}

export function entrarUrl(base, app, volta) {
  const u = new URL(`${base}/entrar/${app}`);
  if (volta) u.searchParams.set("volta", volta);
  return u.toString();
}
