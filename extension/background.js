// Porteiro no Chrome.
//
// Um app "está em uso" quando: a aba ativa da janela em foco é dele e você mexeu no computador nos últimos 2 minutos.
// - Começou a usar  -> pergunta à porta (/api/gate). Liberado: conta. Barrado: manda a aba pro Porteiro.
// - Parou de usar    -> avisa que fechou (/api/event). Trocar de aba, de janela, de programa ou ficar parado conta.
// - A cada 30 s      -> se o passe acabou e "expulsar" tá ligado, fecha a sessão e manda a aba pro Porteiro.
//
// O estado fica no chrome.storage.local, porque o service worker do MV3 dorme e acorda a toda hora.

import { api, appFromUrl, entrarUrl, getConfig } from "./shared.js";

const IDLE_SECONDS = 120; // vídeo longo sem mexer no mouse ainda conta por 2 min
const TICK = "porteiro-tick";

// ---------- estado ----------
// current = { app, tabId, since } | null; lastSeen = última vez que vimos o app em uso (ms)
async function getState() {
  const s = await chrome.storage.local.get({ current: null, lastSeen: 0 });
  return { current: s.current, lastSeen: s.lastSeen };
}
async function setState(patch) {
  await chrome.storage.local.set(patch);
}

// ---------- o que está em uso agora ----------
async function inUse() {
  const idle = await chrome.idle.queryState(IDLE_SECONDS);
  if (idle !== "active") return null;
  let win;
  try {
    win = await chrome.windows.getLastFocused();
  } catch {
    return null;
  }
  if (!win || !win.focused) return null;
  const [tab] = await chrome.tabs.query({ active: true, windowId: win.id });
  if (!tab) return null;
  const app = appFromUrl(tab.url || tab.pendingUrl);
  return app ? { app, tabId: tab.id, url: tab.url || tab.pendingUrl } : null;
}

// ---------- ações ----------
async function close(app, atMs) {
  const params = { app };
  if (atMs) params.at = new Date(atMs).toISOString();
  await api("/api/event", params);
}

async function sendToGate(tabId, app, url) {
  const { base } = await getConfig();
  // o Chrome dispara vários eventos pra mesma navegação: sem isso, uma tentativa viraria várias barradas
  await setState({ redirecting: { tabId, app, until: Date.now() + 5000 } });
  try {
    await chrome.tabs.update(tabId, { url: entrarUrl(base, app, url) });
  } catch {
    /* aba já fechou */
  }
}

// Tudo passa por aqui, uma coisa de cada vez: eventos do Chrome chegam em rajada (trocar de aba dispara vários).
let queue = Promise.resolve();
function sync(reason) {
  queue = queue.then(() => doSync(reason)).catch((err) => console.warn("porteiro:", reason, err));
  return queue;
}

async function doSync(reason) {
  const { key } = await getConfig();
  if (!key) return; // sem segredo configurado, não faz nada
  const { current } = await getState();
  const next = await inUse();

  // essa aba acabou de ser mandada pra porta: ignora o eco da navegação antiga
  const { redirecting } = await chrome.storage.local.get({ redirecting: null });
  if (next && redirecting && redirecting.tabId === next.tabId && redirecting.app === next.app && Date.now() < redirecting.until) {
    return;
  }

  // mesmo app em uso: só atualiza a aba e o "visto por último"
  if (current && next && current.app === next.app) {
    await setState({ current: { ...current, tabId: next.tabId }, lastSeen: Date.now() });
    if (reason === "tick") await checkPass(current.app, next);
    return;
  }

  // parou de usar o anterior (ou trocou de app)
  if (current) {
    await close(current.app);
    await setState({ current: null });
  }
  if (!next) return;

  // começou a usar um app: pergunta à porta
  const r = await api("/api/gate", { app: next.app });
  if (r.ok && r.text.includes("liberado")) {
    await setState({ current: { app: next.app, tabId: next.tabId, since: Date.now() }, lastSeen: Date.now() });
  } else if (r.ok && r.text.includes("barrado")) {
    await sendToGate(next.tabId, next.app, next.url);
  }
  // erro de rede ou de servidor: deixa passar sem contar, igual ao iPhone sem internet
}

/** Passe acabou e "expulsar" tá ligado: fecha a sessão e manda a aba pro Porteiro. */
async function checkPass(app, tab) {
  const { expel } = await getConfig();
  if (!expel) return;
  const r = await api("/api/pass-status", { app });
  if (!r.ok) return;
  let body;
  try {
    body = JSON.parse(r.text);
  } catch {
    return;
  }
  if (body.active) return;
  await close(app);
  await setState({ current: null });
  await sendToGate(tab.tabId, app, tab.url);
}

/** Chrome reabriu: se ficou uma sessão aberta, fecha na hora em que ela foi vista pela última vez. */
async function recover() {
  const { current, lastSeen } = await getState();
  if (current) {
    await close(current.app, lastSeen || Date.now());
    await setState({ current: null });
  }
}

// ---------- ganchos do Chrome ----------
function setup() {
  chrome.idle.setDetectionInterval(IDLE_SECONDS);
  chrome.alarms.create(TICK, { periodInMinutes: 0.5 });
}

chrome.runtime.onInstalled.addListener(() => {
  setup();
  sync("install");
});
chrome.runtime.onStartup.addListener(async () => {
  setup();
  await recover();
  sync("startup");
});

chrome.tabs.onActivated.addListener(() => sync("tab"));
chrome.tabs.onUpdated.addListener((_id, info, tab) => {
  if (tab.active && (info.url || info.status === "loading")) sync("nav");
});
chrome.tabs.onRemoved.addListener(() => sync("tab-closed"));
chrome.windows.onFocusChanged.addListener(() => sync("focus"));
chrome.idle.onStateChanged.addListener(() => sync("idle"));
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === TICK) sync("tick");
});

// o popup pede uma sincronização depois de salvar o segredo
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.type === "sync") {
    sync("popup").then(() => reply({ ok: true }));
    return true;
  }
  return false;
});
