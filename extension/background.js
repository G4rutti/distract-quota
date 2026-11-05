// Porteiro no Chrome.
//
// Um app "está em uso" quando a aba ativa da janela em foco é dele e você mexeu no computador nos últimos
// 2 minutos (ou a aba tá tocando som: vídeo rolando parado também conta).
// - Começou a usar  -> pergunta à porta (/api/gate). Liberado: conta. Barrado: manda a aba pro Porteiro.
// - Parou de usar    -> espera 10 s de folga (voltou nesse tempo? continua a mesma sessão) e avisa que fechou.
// - A cada 30 s      -> se o passe acabou e "expulsar" tá ligado, fecha a sessão e manda a aba pro Porteiro.
//
// Regras de tempo:
// - O "fechou" vai com "ago" (há quantos ms parou), e o servidor converte com o relógio dele: relógio do PC
//   errado não importa.
// - Se a gente ficou mais de 90 s sem ver o app em uso (Chrome fechado, notebook dormindo, extensão recarregada),
//   a sessão fecha na última vez em que foi vista, nunca agora.
// - "Fechou" que falha por rede fica numa fila e é reenviado.
//
// O estado fica no chrome.storage.local, porque o service worker do MV3 dorme e acorda a toda hora.

import { api, appFromUrl, entrarUrl, getConfig } from "./shared.js";

const IDLE_SECONDS = 120;
const GRACE_MS = 10_000; // folga pra trocar de aba rapidinho sem abrir sessão nova
const GAP_MS = 90_000; // sem ver o app em uso por mais que isso = o Chrome não tava rodando
const TICK = "porteiro-tick";

// ---------- estado ----------
// current       = { app, tabId, since } | null
// lastSeen      = última vez (ms, relógio do PC) que vimos o app em uso
// pausedAt      = quando parou de usar (ms) e ainda tá na folga; null se em uso
// pendingCloses = [{ app, endedAt }] fechamentos ainda não confirmados pelo servidor
// redirecting   = { tabId, app, until } aba que acabou de ir pra porta
const DEFAULTS = { current: null, lastSeen: 0, pausedAt: null, pendingCloses: [], redirecting: null };
const getState = () => chrome.storage.local.get(DEFAULTS);
const setState = (patch) => chrome.storage.local.set(patch);

// ---------- o que está em uso agora ----------
async function inUse() {
  let win;
  try {
    win = await chrome.windows.getLastFocused();
  } catch {
    return null;
  }
  if (!win || !win.focused) return null;
  const [tab] = await chrome.tabs.query({ active: true, windowId: win.id });
  if (!tab) return null;
  const url = tab.url || tab.pendingUrl;
  const app = appFromUrl(url);
  if (!app) return null;
  // parado sem mexer só conta se a aba tiver tocando som (vendo vídeo)
  if (!tab.audible && (await chrome.idle.queryState(IDLE_SECONDS)) !== "active") return null;
  return { app, tabId: tab.id, url };
}

// ---------- fechamentos (com fila e reenvio) ----------
async function queueClose(app, endedAt) {
  const { pendingCloses } = await getState();
  pendingCloses.push({ app, endedAt });
  await setState({ pendingCloses });
}

/** Manda os fechamentos pendentes. O que der erro de rede fica pra próxima; mais de 12 h, desiste. */
async function flushCloses() {
  const { pendingCloses } = await getState();
  if (!pendingCloses.length) return;
  const keep = [];
  for (const c of pendingCloses) {
    const ago = Math.max(0, Date.now() - c.endedAt);
    if (ago > 12 * 3600_000) continue;
    const r = await api("/api/event", { app: c.app, ago: String(Math.round(ago)) });
    if (!r.ok && r.status !== 401 && r.status !== 400) keep.push(c);
  }
  await setState({ pendingCloses: keep });
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

// ---------- sincronização ----------
// Uma de cada vez, e rajadas viram uma só: trocar de aba dispara vários eventos.
let running = null;
let again = false;
function sync(reason) {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      try {
        await doSync(reason);
      } catch (err) {
        console.warn("porteiro:", reason, err);
      }
    } while (again);
    running = null;
  })();
  return running;
}

async function doSync(reason) {
  const { key } = await getConfig();
  if (!key) return; // sem segredo configurado, não faz nada

  let { current, lastSeen, pausedAt, redirecting } = await getState();
  const now = Date.now();

  // Lacuna: ficamos sem olhar por muito tempo (Chrome fechado, notebook dormindo, extensão recarregada).
  // A sessão fecha na última vez em que foi vista, não agora.
  if (current && !pausedAt && now - lastSeen > GAP_MS) {
    await queueClose(current.app, lastSeen);
    current = null;
    pausedAt = null;
    await setState({ current: null, pausedAt: null });
  }

  await flushCloses();
  const next = await inUse();

  // Em uso o mesmo app: segue a sessão (volta da folga se tava pausado)
  if (current && next && current.app === next.app) {
    await setState({ current: { ...current, tabId: next.tabId }, lastSeen: now, pausedAt: null });
    if (reason === "tick") await checkPass(current.app, next);
    return;
  }

  // Parou de usar: entra na folga; passada a folga (ou trocou de app), fecha de verdade
  if (current) {
    const stoppedAt = pausedAt ?? (reason === "idle" ? now - IDLE_SECONDS * 1000 : now);
    const graceOver = now - stoppedAt >= GRACE_MS;
    if (!next && !graceOver) {
      if (!pausedAt) await setState({ pausedAt: stoppedAt, lastSeen: stoppedAt });
      return;
    }
    await queueClose(current.app, Math.max(stoppedAt, current.since));
    await setState({ current: null, pausedAt: null });
    await flushCloses();
  }
  if (!next) return;

  // essa aba acabou de ser mandada pra porta: não pergunta de novo
  if (redirecting && redirecting.tabId === next.tabId && redirecting.app === next.app && now < redirecting.until) return;

  // Começou a usar um app: pergunta à porta
  const r = await api("/api/gate", { app: next.app });
  if (r.ok && r.text.includes("liberado")) {
    await setState({ current: { app: next.app, tabId: next.tabId, since: Date.now() }, lastSeen: Date.now(), pausedAt: null });
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
  if (body.active !== false) return;
  await queueClose(app, Date.now());
  await setState({ current: null, pausedAt: null });
  await flushCloses();
  await sendToGate(tab.tabId, app, tab.url);
}

// ---------- ganchos do Chrome ----------
// No topo, não só no install/startup: se o alarme sumir, volta no próximo despertar do service worker.
chrome.idle.setDetectionInterval(IDLE_SECONDS);
chrome.alarms.get(TICK).then((a) => {
  if (!a) chrome.alarms.create(TICK, { periodInMinutes: 0.5 });
});

chrome.runtime.onInstalled.addListener(() => sync("install"));
chrome.runtime.onStartup.addListener(() => sync("startup"));
chrome.tabs.onActivated.addListener(() => sync("tab"));
chrome.tabs.onUpdated.addListener((_id, info, tab) => {
  if (tab.active && (info.url || info.status === "loading" || "audible" in info)) sync("nav");
});
chrome.tabs.onRemoved.addListener(() => sync("tab-closed"));
chrome.windows.onFocusChanged.addListener(() => sync("focus"));
chrome.idle.onStateChanged.addListener((state) => sync(state === "active" ? "tab" : "idle"));
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
