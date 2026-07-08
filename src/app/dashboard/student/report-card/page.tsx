"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/app/lib/supabase";
import { Loader2, GraduationCap, TrendingUp, Calendar, School } from "lucide-react";
import Image from "next/image";

type ReportCard = {
  id: string;
  track: "enem" | "etec";
  semester: number;
  classificatoria_score: number | null;
  classificatoria_max: number | null;
  simulado_score: number | null;
  simulado_max: number | null;
  redacao_score: number | null;
  redacao_max: number | null;
  absences_1sem: number | null;
  absences_2sem: number | null;
  sala: string | null;
  turno: string | null;
  colegio: string | null;
};

function ScoreCard({ label, score, max, icon: Icon }: { label: string; score: number | null; max: number | null; icon: any }) {
  const hasScore = score !== null && score !== undefined;
  const pct = hasScore && max ? Math.round((score! / max) * 100) : null;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 min-w-0">
      <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
        {hasScore ? (
          <p className="font-black text-lg text-slate-900 tabular-nums">
            {score}<span className="text-slate-400 text-sm font-bold">/{max}</span>
            {pct !== null && <span className="ml-2 text-xs font-bold text-emerald-600">{pct}%</span>}
          </p>
        ) : (
          <p className="font-bold text-sm text-slate-300">Ainda não realizado</p>
        )}
      </div>
    </div>
  );
}

export default function ReportCardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ReportCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("report_card_entries")
          .select("*")
          .eq("student_id", user.id)
          .order("semester", { ascending: true });
        if (!error && active) setEntries((data as ReportCard[]) ?? []);
      } catch (e) {
        console.error("Erro ao carregar boletim:", e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 px-4">
        <GraduationCap className="h-10 w-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-semibold text-sm">
          Seu boletim ainda não foi lançado. Assim que a secretaria publicar, ele aparece aqui automaticamente.
        </p>
      </div>
    );
  }

  const entry = entries[0];
  const trackLabel = entry.track === "enem" ? "Vestibulinho ENEM" : "Vestibulinho ETEC";

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10 animate-in fade-in duration-500">
      <div className="relative overflow-hidden rounded-[2rem] aurora-dark text-white shadow-xl">
        <div className="relative w-full h-36 md:h-44">
          <Image
            src="/images/updates/boletim_update.png"
            alt="Meu Boletim"
            fill
            sizes="(max-width: 768px) 100vw, 672px"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        </div>
        <div className="absolute inset-0 dot-grid opacity-10 pointer-events-none" />
        <div className="relative z-10 p-6 md:p-8 -mt-4">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full border border-amber-500/30">
            <GraduationCap className="h-3 w-3" />
            {trackLabel}
          </span>
          <h1 className="font-black italic text-2xl md:text-3xl tracking-tighter mt-3">Meu Boletim</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-white/60 text-xs font-medium">
            {entry.colegio && <span className="flex items-center gap-1"><School className="h-3 w-3" />{entry.colegio}</span>}
            {entry.sala && <span>Sala {entry.sala}</span>}
            {entry.turno && <span>{entry.turno}</span>}
          </div>
        </div>
      </div>

      {entries.map((e) => (
        <div key={e.id} className="space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">
            {e.semester}º Semestre
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ScoreCard label="Classificatória" score={e.classificatoria_score} max={e.classificatoria_max} icon={TrendingUp} />
            <ScoreCard label="Simulado" score={e.simulado_score} max={e.simulado_max} icon={TrendingUp} />
            {e.track === "enem" && (
              <ScoreCard label="Redação" score={e.redacao_score} max={e.redacao_max} icon={GraduationCap} />
            )}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Faltas</p>
                <p className="font-black text-lg text-slate-900 tabular-nums">
                  {e.absences_1sem ?? 0}
                  {e.absences_2sem !== null && <span className="text-slate-400 text-sm"> · {e.absences_2sem} (2º sem)</span>}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
