"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileCheck,
  ExternalLink,
  Cloud,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  MousePointer2,
  FolderPlus,
  Loader2,
  FileSearch,
  Clock,
  LayoutList,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";

const DOCUMENT_GROUPS = [
  {
    title: "Documentos Pessoais",
    items: [
      { id: "rg", label: "RG (Frente e Verso)" },
      { id: "cpf", label: "CPF ou CNH" },
      { id: "birth_cert", label: "Certidão de Nascimento ou Casamento" },
      { id: "voter_id", label: "Título de Eleitor" },
      { id: "military", label: "Reservista (Para homens)" },
      { id: "address", label: "Comprovante de Residência atualizado" },
    ],
  },
  {
    title: "Escolares (FATEC/ETEC/SiSU)",
    items: [
      { id: "hs_transcript", label: "Histórico Escolar do Ensino Médio" },
      { id: "hs_diploma", label: "Certificado de Conclusão do Ensino Médio" },
      { id: "photo_3x4", label: "Foto 3x4 digitalizada" },
    ],
  },
  {
    title: "Socioeconômicos (ProUni/Cotas)",
    items: [
      { id: "income_all", label: "Comprovantes de Renda de todos os moradores" },
      { id: "cadunico", label: "Comprovante de Inscrição no CadÚnico (Se houver)" },
      { id: "tax_return", label: "Declaração de IR (Se houver)" },
    ],
  },
];

const TIPS = [
  {
    icon: FileSearch,
    title: "Qualidade da Imagem",
    body: "Evite fotos com sombras ou reflexos de luz. Se o texto não estiver legível, sua inscrição poderá ser indeferida.",
  },
  {
    icon: Clock,
    title: "Validade dos Papéis",
    body: "Comprovantes de residência devem ter no máximo 90 dias. Certidões não podem ter rasuras ou remendos.",
  },
  {
    icon: LayoutList,
    title: "Organização Maestro",
    body: 'Renomeie seus arquivos como "RG_FRENTE.pdf" ou "HISTORICO_MEDIO.pdf". Isso agiliza a conferência e evita erros.',
  },
  {
    icon: ShieldCheck,
    title: "Dica de Segurança",
    body: "Nunca envie documentos originais por chats informais. Mantenha seu rastro digital seguro em pastas oficiais.",
  },
];

export default function StudentAdmissionCentral() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loadingDocs, setLoadingDocs] = useState(true);
  const [savingDoc, setSavingDoc] = useState(false);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [openGroups, setOpenGroups] = useState<number[]>([0, 1, 2]);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("student_checklists")
          .select("item_id")
          .eq("user_id", user.id);
        if (!error && data) setCheckedItems(data.map((d) => d.item_id));
      } catch (e) {
        console.error("Erro ao carregar central:", e);
      } finally {
        setLoadingDocs(false);
      }
    }
    loadData();
  }, [user]);

  const toggleItem = async (itemId: string) => {
    if (!user || savingDoc) return;
    const isChecked = checkedItems.includes(itemId);
    const newItems = isChecked
      ? checkedItems.filter((i) => i !== itemId)
      : [...checkedItems, itemId];
    setCheckedItems(newItems);
    setSavingDoc(true);
    try {
      if (isChecked) {
        await supabase
          .from("student_checklists")
          .delete()
          .match({ user_id: user.id, item_id: itemId });
      } else {
        await supabase
          .from("student_checklists")
          .insert({ user_id: user.id, item_id: itemId });
      }
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSavingDoc(false);
    }
  };

  const toggleGroup = (idx: number) => {
    setOpenGroups((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const totalDocs = DOCUMENT_GROUPS.reduce((acc, g) => acc + g.items.length, 0);
  const progressPercent = Math.round((checkedItems.length / totalDocs) * 100);

  if (loadingDocs) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-orange-400" />
        <p className="text-[10px] font-black uppercase tracking-widest text-white/30 animate-pulse">
          Sincronizando Checklist...
        </p>
      </div>
    );
  }

  return (
    <div className="pb-24 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Hero ── */}
      <div className="relative rounded-[2rem] overflow-hidden bg-[#0d0d0f] border border-white/5 p-6">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 80% 10%, rgba(255,107,0,0.12) 0%, transparent 60%), radial-gradient(ellipse at 10% 90%, rgba(16,185,129,0.08) 0%, transparent 60%)",
          }}
        />
        <div className="relative z-10 space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400/70 mb-1">
              Padrão SiSU/ProUni
            </p>
            <h1 className="text-2xl font-black italic tracking-tighter text-white leading-none">
              Checklist de Matrícula
            </h1>
            <p className="text-white/40 text-xs font-semibold mt-1">
              Organize sua documentação oficial
            </p>
          </div>

          {/* Progress section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-orange-400/60" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                  Prontidão Documental
                </span>
              </div>
              <span
                className={`text-lg font-black italic ${
                  progressPercent === 100 ? "text-emerald-400" : "text-orange-400"
                }`}
              >
                {progressPercent}%
              </span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  progressPercent === 100
                    ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                    : "bg-gradient-to-r from-orange-500 to-amber-400"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-white/25 font-medium">
              {checkedItems.length} de {totalDocs} documentos marcados
            </p>
          </div>
        </div>
      </div>

      {/* ── Document Groups ── */}
      <div className="space-y-3">
        {DOCUMENT_GROUPS.map((group, idx) => {
          const groupChecked = group.items.filter((i) => checkedItems.includes(i.id)).length;
          const isOpen = openGroups.includes(idx);
          return (
            <div
              key={idx}
              className="bg-white/3 border border-white/6 rounded-[1.5rem] overflow-hidden"
            >
              {/* Group header */}
              <button
                onClick={() => toggleGroup(idx)}
                className="w-full flex items-center justify-between p-4 text-left touch-manipulation"
              >
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-black text-orange-400">{idx + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm font-black text-white italic">{group.title}</p>
                    <p className="text-[10px] text-white/35 font-bold mt-0.5">
                      {groupChecked}/{group.items.length} completos
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {groupChecked === group.items.length && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  )}
                  <ChevronDown
                    className={`h-4 w-4 text-white/30 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </button>

              {/* Items */}
              {isOpen && (
                <div className="px-4 pb-4 space-y-2 border-t border-white/5 pt-3">
                  {group.items.map((item) => {
                    const checked = checkedItems.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all active:scale-[0.98] touch-manipulation ${
                          checked
                            ? "bg-emerald-500/8 border-emerald-500/20"
                            : "bg-white/3 border-white/5 hover:border-white/10"
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleItem(item.id)}
                          className="h-5 w-5 rounded-lg border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                        />
                        <span
                          className={`text-xs font-bold italic flex-1 leading-snug ${
                            checked ? "text-emerald-300" : "text-white/70"
                          }`}
                        >
                          {item.label}
                        </span>
                        {checked && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Google Drive CTA ── */}
      <div className="relative rounded-[1.5rem] overflow-hidden bg-[#0d0d0f] border border-white/8 p-5">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 90% 50%, rgba(255,107,0,0.10) 0%, transparent 60%)",
          }}
        />
        <div className="relative z-10 flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0">
            <Cloud className="h-5 w-5 text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-white text-sm italic">Nuvem de Documentos</p>
            <p className="text-[10px] text-white/40 font-medium mt-0.5">
              Use o Google Drive para não perder nada
            </p>
          </div>
          <Button
            asChild
            className="h-9 px-4 bg-orange-500 hover:bg-orange-600 text-white font-black text-[10px] rounded-xl shadow-lg shrink-0"
          >
            <a href="https://drive.google.com" target="_blank" rel="noopener noreferrer">
              Abrir <ExternalLink className="ml-1.5 h-3 w-3" />
            </a>
          </Button>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/5">
          {[
            { icon: MousePointer2, text: "Acesse drive.google.com" },
            { icon: FolderPlus, text: 'Crie "Ingresso 2024"' },
            { icon: Smartphone, text: "Escaneie com a câmera" },
          ].map((step, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 text-center">
              <step.icon className="h-4 w-4 text-white/25" />
              <span className="text-[9px] font-bold text-white/30 leading-tight">{step.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tips ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TIPS.map((tip, i) => (
          <div
            key={i}
            className="bg-white/3 border border-white/5 rounded-2xl p-4 flex items-start gap-3"
          >
            <div className="h-7 w-7 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center shrink-0">
              <tip.icon className="h-3.5 w-3.5 text-orange-400/60" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">
                {tip.title}
              </p>
              <p className="text-[11px] font-medium text-white/50 italic leading-relaxed">
                {tip.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
