import { api, APPS, getConfig } from "./shared.js";

const $ = (id) => document.getElementById(id);
const timeFmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

async function load() {
  const cfg = await getConfig();
  $("key").value = cfg.key;
  $("expel").checked = cfg.expel;
  $("painel").href = cfg.base;
  $("incognito").hidden = await chrome.extension.isAllowedIncognitoAccess();
  await renderStatus();
}

async function renderStatus() {
  const cfg = await getConfig();
  if (!cfg.key) {
    $("status-main").textContent = "Falta o segredo";
    $("status-sub").textContent = "Cola o APP_SECRET aqui embaixo pra porta começar a funcionar.";
    return;
  }
  const { current } = await chrome.storage.local.get({ current: null });
  if (!current) {
    $("status-main").textContent = "Nada em uso agora";
    $("status-sub").textContent = "Abriu TikTok, Instagram ou X, a porta confere o passe.";
    return;
  }
  const name = APPS[current.app]?.name ?? current.app;
  const r = await api("/api/pass-status", { app: current.app });
  if (!r.ok) {
    $("status-main").textContent = `${name} aberto`;
    $("status-sub").textContent = r.status === 401 ? "Segredo errado." : "Sem conexão com o Porteiro.";
    return;
  }
  const body = JSON.parse(r.text);
  if (body.active) {
    $("status-main").textContent = `${name} liberado`;
    $("status-sub").textContent = `Passe até ${timeFmt.format(new Date(body.expiresAt))}.`;
  } else {
    $("status-main").textContent = `${name} aberto, passe vencido`;
    $("status-sub").textContent = "Liga o expulsar aqui embaixo pra porta fechar sozinha.";
  }
}

$("config").addEventListener("submit", async (e) => {
  e.preventDefault();
  const key = $("key").value.trim();
  await chrome.storage.local.set({ key, expel: $("expel").checked });

  // confere o segredo de verdade antes de dizer que salvou
  const r = await api("/api/pass-status", { app: "tiktok" });
  $("saved").textContent = !key
    ? "Salvo, mas sem segredo a porta fica desligada."
    : r.ok
      ? "Salvo. Porta ligada."
      : r.status === 401
        ? "Salvo, mas o segredo tá errado."
        : "Salvo, mas não consegui falar com o Porteiro.";
  await chrome.runtime.sendMessage({ type: "sync" }).catch(() => {});
  await renderStatus();
});

async function renderDiag() {
  const d = await chrome.storage.local.get({ diag: [], lastError: "", lastContact: "", pendingCloses: [] });
  $("contact").textContent =
    `Última conversa com a porta: ${d.lastContact || "nenhuma"}` +
    (d.lastError ? ` | Último erro: ${d.lastError}` : "") +
    (d.pendingCloses.length ? ` | Fechamentos na fila: ${d.pendingCloses.length}` : "");
  $("diag").textContent = d.diag.slice().reverse().join("\n") || "Nada ainda.";
}

$("copy").addEventListener("click", async () => {
  const manifest = chrome.runtime.getManifest();
  const text = `Porteiro ${manifest.version} | ${navigator.userAgent}\n${$("contact").textContent}\n${$("diag").textContent}`;
  await navigator.clipboard.writeText(text);
  $("copy").textContent = "Copiado";
});

load();
renderDiag();
