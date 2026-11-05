import { api, APPS, DEFAULT_BASE, getConfig } from "./shared.js";

const $ = (id) => document.getElementById(id);
const timeFmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

async function load() {
  const cfg = await getConfig();
  $("key").value = cfg.key;
  $("expel").checked = cfg.expel;
  $("base").value = cfg.base;
  $("painel").href = cfg.base;
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
    $("status-main").textContent = "Porta fechada";
    $("status-sub").textContent = "Nenhuma rede social aberta agora.";
    return;
  }
  const name = APPS[current.app]?.name ?? current.app;
  $("status-main").textContent = `${name} liberado`;
  const r = await api("/api/pass-status", { app: current.app });
  try {
    const body = JSON.parse(r.text);
    $("status-sub").textContent = body.active
      ? `Passe até ${timeFmt.format(new Date(body.expiresAt))}.`
      : "O passe acabou.";
  } catch {
    $("status-sub").textContent = r.status === 401 ? "Segredo errado." : "Sem conexão com o Porteiro.";
  }
}

$("config").addEventListener("submit", async (e) => {
  e.preventDefault();
  const key = $("key").value.trim();
  const base = ($("base").value.trim() || DEFAULT_BASE).replace(/\/+$/, "");
  await chrome.storage.local.set({ key, base, expel: $("expel").checked });

  // confere o segredo de verdade antes de dizer que salvou
  const r = await api("/api/pass-status", { app: "tiktok" });
  $("saved").textContent = !key
    ? "Salvo, mas sem segredo a porta fica desligada."
    : r.ok
      ? "Salvo. Porta ligada."
      : r.status === 401
        ? "Salvo, mas o segredo tá errado."
        : "Salvo, mas não consegui falar com o Porteiro.";
  $("painel").href = base;
  await chrome.runtime.sendMessage({ type: "sync" }).catch(() => {});
  await renderStatus();
});

load();
