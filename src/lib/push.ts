import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

// Configuração VAPID (somente server-side)
if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:contato@compromissose.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  type?: "chat" | "communication" | "material" | "document" | "attendance" | "info";
  icon?: string;
  image?: string;
  tag?: string;
}

interface SubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Cliente admin para bypass de RLS ao enviar push em fan-out.
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Envia uma notificação push (Web Push) para todos os dispositivos
 * inscritos de um conjunto de usuários. Também persiste em `notifications`
 * para a inbox in-app de cada destinatário.
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  if (userIds.length === 0) return { sent: 0, failed: 0, persisted: 0 };

  const sb = adminClient();

  // 1) Persistir na inbox in-app
  const inboxRows = userIds.map(uid => ({
    user_id: uid,
    type: payload.type || "info",
    title: payload.title,
    body: payload.body || null,
    url: payload.url || null,
  }));
  const { error: notifErr } = await sb.from("notifications").insert(inboxRows);
  if (notifErr) console.error("[push] inbox insert error:", notifErr.message);

  // 2) Buscar subscriptions dos destinatários
  const { data: subs, error: subsErr } = await sb
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, user_id")
    .in("user_id", userIds);

  if (subsErr || !subs || subs.length === 0) {
    return { sent: 0, failed: 0, persisted: inboxRows.length };
  }

  const json = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  const expiredEndpoints: string[] = [];

  // 3) Disparar em paralelo
  await Promise.all(
    subs.map(async (s: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          json
        );
        sent++;
      } catch (err: any) {
        failed++;
        // 404 / 410 = subscription expirada — limpa do banco
        if (err.statusCode === 404 || err.statusCode === 410) {
          expiredEndpoints.push(s.endpoint);
        } else {
          console.error("[push] send error:", err.statusCode, err.body || err.message);
        }
      }
    })
  );

  // 4) Limpeza de subscriptions expiradas
  if (expiredEndpoints.length > 0) {
    await sb.from("push_subscriptions").delete().in("endpoint", expiredEndpoints);
  }

  return { sent, failed, persisted: inboxRows.length };
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  return sendPushToUsers([userId], payload);
}
