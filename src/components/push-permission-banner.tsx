"use client";

import { useState, useEffect } from "react";
import { Bell, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/use-push-notifications";

const DISMISS_KEY = "compromisso_push_dismissed_at";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export function PushPermissionBanner() {
  const { permission, subscribed, loading, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const lastDismiss = Number(localStorage.getItem(DISMISS_KEY) || 0);
    setDismissed(Date.now() - lastDismiss < DISMISS_TTL_MS);
  }, []);

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    setDismissed(true);
  };

  // Esconde se já assinou, sem suporte, sem permissão negada, ou dispensado
  if (permission === "unsupported" || permission === "granted" && subscribed) return null;
  if (permission === "denied") return null;
  if (dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-sm z-50 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-primary text-white rounded-[2rem] shadow-2xl p-5 flex items-start gap-3 border border-white/10">
        <div className="h-11 w-11 rounded-2xl bg-accent text-accent-foreground flex items-center justify-center shrink-0">
          <Bell className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm italic leading-tight">Ativar notificações?</p>
          <p className="text-xs text-white/70 mt-1 leading-relaxed">
            Receba mensagens, comunicados e novos materiais direto no celular como um WhatsApp.
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              onClick={subscribe}
              disabled={loading}
              size="sm"
              className="bg-accent text-accent-foreground hover:bg-accent/90 border-none font-black text-xs rounded-xl h-9 px-4"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Bell className="h-3 w-3 mr-1.5" />}
              Ativar
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="text-white/60 hover:text-white hover:bg-white/10 font-bold text-xs rounded-xl h-9 px-3"
            >
              Depois
            </Button>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-white/40 hover:text-white shrink-0 -mr-1 -mt-1">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
