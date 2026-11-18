import "server-only";
import webpush from "web-push";
import { db } from "./db";

export type PushPayload = { title: string; body: string; url: string; tag?: string };

let ready = false;
function setup(): boolean {
  if (ready) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails("mailto:davigarutti5@gmail.com", pub, priv);
  ready = true;
  return true;
}

export const vapidPublicKey = () => process.env.VAPID_PUBLIC_KEY ?? "";

/** Manda pra todo aparelho inscrito. Inscrição morta (404/410) é apagada. Devolve quantos receberam. */
export async function pushAll(payload: PushPayload): Promise<number> {
  if (!setup()) throw new Error("Faltam VAPID_PUBLIC_KEY e/ou VAPID_PRIVATE_KEY no ambiente.");
  const { data, error } = await db().from("porteiro_push_subs").select("endpoint, p256dh, auth");
  if (error) throw error;
  let sent = 0;
  await Promise.all(
    (data ?? []).map(async (s: { endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 600, urgency: "high", topic: payload.tag?.slice(0, 32) },
        );
        sent++;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await db().from("porteiro_push_subs").delete().eq("endpoint", s.endpoint);
        } else {
          console.error("push falhou", code, err);
        }
      }
    }),
  );
  return sent;
}
