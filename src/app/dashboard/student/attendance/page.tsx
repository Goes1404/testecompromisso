
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ClipboardCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldAlert,
  AlertTriangle,
  CalendarDays,
  Sparkles,
  Flame,
} from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function StudentAttendancePage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<any[]>([]);
  const [myRecords, setMyRecords] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [checkinCode, setCheckinCode] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);

  const [impactOpen, setImpactOpen] = useState(false);
  const [confirmoInput, setConfirmoInput] = useState("");

  const otpRefs = useRef<Array<HTMLInputElement | null>>([null, null, null, null]);

  const handleOtpChange = (idx: number, raw: string) => {
    const val = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(-1);
    const chars = checkinCode.padEnd(4, " ").split("");
    chars[idx] = val || " ";
    const next = chars.join("").trimEnd();
    setCheckinCode(next);
    if (val && idx < 3) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      const chars = checkinCode.padEnd(4, " ").split("");
      if (chars[idx] && chars[idx] !== " ") {
        chars[idx] = " ";
        setCheckinCode(chars.join("").trimEnd());
      } else if (idx > 0) {
        chars[idx - 1] = " ";
        setCheckinCode(chars.join("").trimEnd());
        otpRefs.current[idx - 1]?.focus();
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
      e.preventDefault();
    } else if (e.key === "ArrowRight" && idx < 3) {
      otpRefs.current[idx + 1]?.focus();
      e.preventDefault();
    } else if (e.key === "Enter" && checkinCode.length === 4) {
      handleOpenImpact();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    setCheckinCode(pasted);
    setTimeout(() => otpRefs.current[Math.min(pasted.length, 3)]?.focus(), 0);
  };

  async function fetchData() {
    if (!user) return;
    setLoading(true);
    try {
      const [sessionsRes, recordsRes] = await Promise.all([
        (() => {
          const q = supabase
            .from("class_sessions")
            .select("id, title, subject, session_date, session_type, teacher_name")
            .order("session_date", { ascending: false });
          return profile?.course ? q.eq("class_label", profile.course) : q;
        })(),
        supabase
          .from("attendance_records")
          .select("session_id, status")
          .eq("student_id", user.id),
      ]);

      if (sessionsRes.data) setSessions(sessionsRes.data);
      if (recordsRes.data) {
        const map: Record<string, string> = {};
        recordsRes.data.forEach((r: any) => { map[r.session_id] = r.status; });
        setMyRecords(map);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, [user]);

  function handleOpenImpact() {
    const code = checkinCode.trim().toUpperCase();
    if (code.length < 4 || code.length > 6) {
      toast({ title: "Código inválido", description: "O token tem 4 caracteres (ex: A7X9).", variant: "destructive" });
      return;
    }
    setConfirmoInput("");
    setImpactOpen(true);
  }

  async function handleConfirmedCheckin() {
    const code = checkinCode.trim().toUpperCase();
    if (confirmoInput.trim().toUpperCase() !== "CONFIRMO") {
      toast({ title: "Digite CONFIRMO para prosseguir", variant: "destructive" });
      return;
    }
    setCheckingIn(true);
    try {
      const res = await fetch("/api/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, confirmed: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erro no check-in", description: data.error || "Código inválido ou expirado.", variant: "destructive" });
      } else {
        toast({ title: "Presença registrada!", description: `Aula: ${data.session_title}` });
        setCheckinCode("");
        setImpactOpen(false);
        setConfirmoInput("");
        fetchData();
      }
    } catch {
      toast({ title: "Erro de conexão", variant: "destructive" });
    } finally {
      setCheckingIn(false);
    }
  }

  const totalSessions = sessions.length;
  const presentes = sessions.filter((s) => myRecords[s.id] === "presente").length;
  const ausentes = sessions.filter((s) => myRecords[s.id] === "ausente" || !myRecords[s.id]).length;
  const pct = totalSessions > 0 ? Math.round((presentes / totalSessions) * 100) : 0;
  const atRisk = pct < 75 && totalSessions > 0;
  const isStellar = pct >= 90 && totalSessions > 0;

  return (
    <div className="pb-24 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Hero ── */}
      <div className={`relative rounded-[2rem] overflow-hidden bg-[#0d0d0f] border p-6 transition-colors ${
        isStellar ? "border-emerald-500/30" : "border-white/5"
      }`}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isStellar
              ? "radial-gradient(ellipse at 70% 0%, rgba(16,185,129,0.22) 0%, transparent 60%), radial-gradient(ellipse at 10% 100%, rgba(20,184,166,0.12) 0%, transparent 60%)"
              : "radial-gradient(ellipse at 70% 0%, rgba(255,107,0,0.13) 0%, transparent 60%), radial-gradient(ellipse at 10% 100%, rgba(59,130,246,0.08) 0%, transparent 60%)",
          }}
        />
        {/* Stellar mode: subtle pulsing glow */}
        {isStellar && (
          <div
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none animate-pulse"
            style={{
              background: "radial-gradient(circle, rgba(16,185,129,0.4) 0%, transparent 70%)",
              filter: "blur(30px)",
            }}
          />
        )}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            {isStellar && <Sparkles className="h-3 w-3 text-emerald-400 animate-pulse" />}
            <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${
              isStellar ? "text-emerald-400/80" : "text-orange-400/70"
            }`}>
              {isStellar ? "Frequência exemplar" : "Aluno"}
            </p>
          </div>
          <h1 className="text-2xl font-black italic tracking-tighter text-white leading-none mb-4">
            Minha Frequência
          </h1>

          {/* KPI row */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Aulas", value: totalSessions, color: "text-white" },
              { label: "Presente", value: presentes, color: "text-emerald-400" },
              { label: "Ausente", value: ausentes, color: "text-red-400" },
              { label: "Taxa", value: `${pct}%`, color: atRisk ? "text-red-400" : "text-emerald-400" },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className={`flex flex-col items-center rounded-2xl py-3 px-2 border ${
                  kpi.label === "Taxa" && atRisk
                    ? "bg-red-500/10 border-red-500/20"
                    : "bg-white/4 border-white/6"
                }`}
              >
                <span className={`text-xl font-black leading-none ${kpi.color}`}>{kpi.value}</span>
                <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider mt-1">{kpi.label}</span>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-[9px] font-black text-white/30 uppercase">
              <span>Frequência geral</span>
              <span className={atRisk ? "text-red-400" : "text-emerald-400"}>{pct}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${atRisk ? "bg-red-500" : "bg-gradient-to-r from-emerald-500 to-teal-400"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Alert: at risk ── */}
      {atRisk && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs font-bold text-red-300 leading-relaxed">
            Sua frequência está abaixo de 75%. Entre em contato com seu professor para regularizar a situação.
          </p>
        </div>
      )}

      {/* ── Check-in (OTP-style) ── */}
      <div className="relative bg-[#0d0d0f] border border-orange-500/15 rounded-[1.5rem] p-5 space-y-4 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 100% 0%, rgba(255,107,0,0.10) 0%, transparent 60%)",
          }}
        />
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0">
            <KeyRound className="h-4 w-4 text-orange-400" />
          </div>
          <div>
            <p className="font-black text-white text-sm italic">Check-in da Aula</p>
            <p className="text-[10px] text-white/35 font-medium">
              Digite o token exibido na lousa
            </p>
          </div>
        </div>

        {/* OTP boxes */}
        <div className="relative z-10 flex justify-center gap-2 py-1">
          {[0, 1, 2, 3].map((idx) => {
            const char = checkinCode[idx] || "";
            const filled = !!char;
            return (
              <input
                key={idx}
                ref={(el) => { otpRefs.current[idx] = el; }}
                type="text"
                inputMode="text"
                autoComplete="off"
                maxLength={1}
                value={char}
                onChange={(e) => handleOtpChange(idx, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                onPaste={handleOtpPaste}
                onFocus={(e) => e.target.select()}
                className={`h-14 w-12 sm:w-14 rounded-xl border-2 text-center text-2xl font-black italic font-mono uppercase outline-none transition-all touch-manipulation ${
                  filled
                    ? "bg-orange-500/15 border-orange-500/50 text-orange-300 shadow-lg shadow-orange-500/20"
                    : "bg-white/3 border-white/10 text-white/40 focus:border-orange-500/40 focus:bg-white/5"
                }`}
              />
            );
          })}
        </div>

        <Button
          onClick={handleOpenImpact}
          disabled={checkingIn || checkinCode.length < 4}
          className="relative z-10 w-full h-12 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs rounded-xl shadow-xl shadow-orange-500/30 disabled:opacity-40 disabled:shadow-none uppercase tracking-widest"
        >
          <CheckCircle2 className="h-4 w-4 mr-1.5" />
          Confirmar Presença
        </Button>
      </div>

      {/* ── History ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <CalendarDays className="h-4 w-4 text-orange-400/60" />
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">Histórico de Aulas</p>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-orange-400" />
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 animate-pulse">Carregando...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 border border-dashed border-white/8 rounded-[1.5rem]">
            <ClipboardCheck className="h-8 w-8 text-white/10" />
            <p className="text-xs font-bold text-white/20 uppercase tracking-widest">Nenhuma aula registrada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session, idx) => {
              const status = myRecords[session.id];
              const isPresente = status === "presente";
              const isJustificado = status === "justificado";
              return (
                <div
                  key={session.id}
                  className="flex items-center gap-3 bg-white/3 border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-all animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
                  style={{ animationDelay: `${Math.min(idx * 40, 400)}ms`, animationDuration: "400ms" }}
                >
                  {/* Status dot */}
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isPresente
                        ? "bg-emerald-500/15 border border-emerald-500/25"
                        : isJustificado
                        ? "bg-amber-500/15 border border-amber-500/25"
                        : "bg-red-500/15 border border-red-500/25"
                    }`}
                  >
                    {isPresente ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : isJustificado ? (
                      <AlertCircle className="h-4 w-4 text-amber-400" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white italic truncate leading-tight">
                      {session.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-white/35 font-bold">
                        {format(new Date(session.session_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      {session.subject && (
                        <>
                          <span className="text-white/15">·</span>
                          <span className="text-[10px] text-white/35 font-bold">{session.subject}</span>
                        </>
                      )}
                      {session.teacher_name && (
                        <>
                          <span className="text-white/15">·</span>
                          <span className="text-[10px] text-white/35 font-bold">{session.teacher_name}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge
                      className={`border-none font-black text-[8px] uppercase px-2 h-5 ${
                        isPresente
                          ? "bg-emerald-500/15 text-emerald-400"
                          : isJustificado
                          ? "bg-amber-500/15 text-amber-400"
                          : "bg-red-500/15 text-red-400"
                      }`}
                    >
                      {isPresente ? "Presente" : isJustificado ? "Justificado" : "Ausente"}
                    </Badge>
                    <Badge
                      className={`border-none font-bold text-[8px] uppercase px-2 h-4 ${
                        session.session_type === "live"
                          ? "bg-purple-500/10 text-purple-400"
                          : "bg-blue-500/10 text-blue-400"
                      }`}
                    >
                      {session.session_type === "live" ? "Live" : "Presencial"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Anti-fraud Dialog ── */}
      <Dialog
        open={impactOpen}
        onOpenChange={(v) => { if (!v) { setImpactOpen(false); setConfirmoInput(""); } }}
      >
        <DialogContent className="sm:max-w-lg rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-[#131316]">
          <DialogHeader className="p-6 pb-4 border-b border-red-500/20 bg-red-500/5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                <ShieldAlert className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-red-400 leading-none italic uppercase tracking-tighter">
                  Aviso de Fraude
                </DialogTitle>
                <DialogDescription className="text-[10px] mt-0.5 font-bold text-red-400/60">
                  Leia com atenção antes de confirmar
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-500/8 border border-red-500/15 rounded-2xl">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-300 text-xs font-bold leading-relaxed">
                O token só pode ser digitado por você, fisicamente dentro da sala de aula.
              </p>
            </div>

            <ul className="space-y-2 text-white/50 text-xs font-medium">
              {[
                "Compartilhar o token com colegas que faltaram caracteriza fraude documental.",
                "Alunos detectados em fraude perdem a vaga no cursinho imediatamente.",
                "A lista de papel é cruzada com os check-ins do app pela secretaria.",
                "Divergências entre lista física e app geram auditoria.",
              ].map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-red-500 font-black shrink-0">·</span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="space-y-1.5 pt-1">
              <Label className="text-[10px] font-black uppercase text-white/30 tracking-widest ml-1">
                Digite <span className="text-red-400">CONFIRMO</span> para prosseguir
              </Label>
              <input
                type="text"
                placeholder="CONFIRMO"
                value={confirmoInput}
                onChange={(e) => setConfirmoInput(e.target.value.toUpperCase())}
                autoComplete="off"
                className="w-full h-12 bg-white/5 border-2 border-red-500/20 focus:border-red-500/50 rounded-xl px-4 text-center text-lg font-black tracking-[0.3em] text-white placeholder:text-white/20 outline-none transition-all"
              />
              <p className="text-[10px] text-white/25 font-medium text-center">
                Esta ação é registrada e seu nome ficará vinculado a este check-in.
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                onClick={() => { setImpactOpen(false); setConfirmoInput(""); }}
                className="flex-1 h-12 rounded-2xl font-black text-xs bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmedCheckin}
                disabled={checkingIn || confirmoInput.trim().toUpperCase() !== "CONFIRMO"}
                className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl border-none text-xs disabled:opacity-40 shadow-lg shadow-red-500/20"
              >
                {checkingIn ? (
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Registrar ({checkinCode})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
