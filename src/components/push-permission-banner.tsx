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
  const [vapidReady, setVapidReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Só exibe se a chave pública VAPID estiver configurada
    setVapidReady(!!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
    const lastDismiss = Number(localStorage.getItem(DISMISS_KEY) || 0);
    setDismissed(Date.now() - lastDismiss < DISMISS_TTL_MS);
  }, []);

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    setDismissed(true);
  };

  if (!vapidReady) return null;
  if (permission === "unsupported") return null;
  if (permission === "granted" && subscribed) return null;
  if (permission === "denied") return null;
  if (dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-sm z-50 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-primary text-white rounded-[2rem] shadow-2xl p-5 border border-white/10">
        {/* Cabeçalho com ícone e fechar */}
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-2xl bg-accent text-accent-foreground flex items-center justify-center shrink-0">
            <Bell className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm italic leading-tight">Ativar notificações?</p>
            <p className="text-xs text-white/70 mt-1 leading-relaxed">
              Receba mensagens, comunicados e novos materiais direto no celular.
            </p>
          </div>
          {/* X com área de toque mínima 44px */}
          <button
            onClick={handleDismiss}
            aria-label="Dispensar"
            className="h-11 w-11 flex items-center justify-center rounded-xl text-white/50 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors shrink-0 -mr-1 -mt-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Botões de ação */}
        <div className="flex gap-3 mt-4">
          <Button
            onClick={subscribe}
            disabled={loading}
            className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 border-none font-black text-sm rounded-2xl h-12 active:scale-95 transition-all"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Bell className="h-4 w-4 mr-2" />
            )}
            Ativar
          </Button>
          <Button
            onClick={handleDismiss}
            variant="ghost"
            className="flex-1 text-white/70 hover:text-white hover:bg-white/10 font-bold text-sm rounded-2xl h-12 active:scale-95 transition-all"
          >
            Agora não
          </Button>
        </div>
      </div>
    </div>
  );
}
