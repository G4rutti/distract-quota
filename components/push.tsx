"use client";

import { useEffect, useState } from "react";

const supported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

const isStandalone = () =>
  (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia("(display-mode: standalone)").matches;

const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });

function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const save = (sub: PushSubscription) =>
  fetch("/api/push/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub.toJSON()) });

/**
 * Fica no layout: a cada abertura do app, reapresenta a inscrição pro servidor.
 * Se o banco perdeu ou o iOS trocou o endpoint, volta a funcionar sozinho.
 */
export function PushKeeper() {
  useEffect(() => {
    if (!supported() || Notification.permission !== "granted") return;
    register()
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => sub && save(sub))
      .catch(() => {});
  }, []);
  return null;
}

type State = "loading" | "unsupported" | "install" | "denied" | "off" | "on";

/** Liga e desliga a notificação de "acabou o passe" neste aparelho. */
export function PushSwitch({ vapidKey }: { vapidKey: string }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!supported()) {
      // no iPhone, fora da tela de início, o Safari nem expõe o PushManager
      setState(isIos() && !isStandalone() ? "install" : "unsupported");
      return;
    }
    if (Notification.permission === "denied") return setState("denied");
    register()
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("off"));
  }, []);

  async function enable() {
    setBusy(true);
    setMsg("");
    try {
      // o pedido de permissão tem que sair direto do toque, sem nada antes
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = await register();
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidKey) }));
      const r = await save(sub);
      if (!r.ok) throw new Error(String(r.status));
      setState("on");
      setMsg("Pronto. Quando um passe acabar com o app aberto, chega o aviso.");
    } catch (err) {
      setMsg(`Não deu pra ativar (${err instanceof Error ? err.message : "erro"}). Tenta de novo.`);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMsg("");
    try {
      const reg = await register();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/push/test", { method: "POST" });
      const body = (await r.json().catch(() => ({}))) as { sent?: number };
      setMsg(r.ok ? (body.sent ? "Mandei. Deve chegar em alguns segundos." : "Nenhum aparelho inscrito. Desliga e liga de novo.") : "Falhou.");
    } finally {
      setBusy(false);
    }
  }

  const btn = "press flex h-12 items-center justify-center rounded-ui px-5 text-base font-medium disabled:opacity-40";

  return (
    <div className="flex flex-col gap-3">
      {state === "loading" && <p className="text-muted">Conferindo...</p>}
      {state === "install" && (
        <p className="text-muted">
          No iPhone, notificação só funciona no Porteiro da tela de início. Abre ele por lá e volta aqui em Ajustes.
        </p>
      )}
      {state === "unsupported" && <p className="text-muted">Esse navegador não recebe notificação de site.</p>}
      {state === "denied" && (
        <p className="text-muted">
          A permissão tá bloqueada. No iPhone: Ajustes &gt; Notificações &gt; Porteiro &gt; Permitir Notificações.
        </p>
      )}
      {state === "off" && (
        <button type="button" onClick={enable} disabled={busy} className={`${btn} bg-accent text-accent-ink`}>
          {busy ? "Ativando..." : "Ativar notificações"}
        </button>
      )}
      {state === "on" && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={test} disabled={busy} className={`${btn} bg-accent text-accent-ink`}>
            Mandar um teste
          </button>
          <button type="button" onClick={disable} disabled={busy} className={`${btn} border-[1.5px] border-line`}>
            Desligar
          </button>
        </div>
      )}
      {msg && (
        <p role="status" className="text-sm text-muted">
          {msg}
        </p>
      )}
    </div>
  );
}
