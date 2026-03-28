
"use client";

export const runtime = 'edge';

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';
import { useAuth } from "@/lib/AuthProvider";
import Script from "next/script";

const InteractiveWorkbook = dynamic(
  () => import("@/components/InteractiveWorkbook").then(mod => mod.InteractiveWorkbook),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Carregando Material Interativo...</p>
      </div>
    )
  }
);
import { supabase } from "@/app/lib/supabase";
import { Loader2, ChevronLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function BookViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [material, setMaterial] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMaterial() {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('library_resources')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) {
          console.error("Erro ao carregar material:", error);
          router.push("/dashboard/library");
          return;
        }
        setMaterial(data);
      } catch (err) {
        console.error("Falha fatal:", err);
      } finally {
        setLoading(false);
      }
    }
    loadMaterial();
  }, [id, router]);

  if (authLoading || loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Descriptografando Material Seguro...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden select-none">
      <Script 
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" 
        strategy="afterInteractive"
      />
      <Script 
        src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js" 
        strategy="afterInteractive"
      />
      <header className="h-16 bg-slate-950 border-b border-white/5 flex items-center justify-between px-4 md:px-8 shrink-0 z-50">
        <div className="flex items-center gap-4 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white hover:bg-white/10 rounded-full shrink-0">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-sm md:text-lg font-black text-white italic truncate leading-none">{material?.title}</h1>
            <p className="text-[8px] md:text-[9px] font-black text-accent uppercase tracking-widest mt-1">Ambiente de Estudo Controlado</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge className="bg-primary/20 text-primary border-none font-black text-[8px] md:text-[10px] uppercase h-8 px-4 flex items-center gap-2 rounded-xl">
            <ShieldCheck className="h-3 w-3 text-accent" /> ANTI-PIRATARIA ATIVO
          </Badge>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative">
        <InteractiveWorkbook 
          materialId={id} 
          pdfUrl={material?.url} 
          userName={profile?.name || user?.email || "Estudante"}
          userCpf={profile?.id?.substring(0, 8) || "ID-USER"}
        />
      </main>
    </div>
  );
}
