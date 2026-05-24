
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ClipboardCheck, Loader2, CheckCircle2, XCircle, AlertCircle, BarChart3, KeyRound, ShieldAlert, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function StudentAttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<any[]>([]);
  const [myRecords, setMyRecords] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [checkinCode, setCheckinCode] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);

  // Modal de impacto (anti-fraude)
  const [impactOpen, setImpactOpen] = useState(false);
  const [confirmoInput, setConfirmoInput] = useState("");

  async function fetchData() {
    if (!user) return;
    setLoading(true);
    try {
      const [sessionsRes, recordsRes] = await Promise.all([
        supabase
          .from("class_sessions")
          .select("id, title, subject, session_date, session_type, teacher_name")
          .order("session_date", { ascending: false }),
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

  useEffect(() => {
    fetchData();
  }, [user]);

  // Passo 1: valida o tamanho do token e abre o Modal de Impacto (barreira anti-fraude).
  function handleOpenImpact() {
    const code = checkinCode.trim().toUpperCase();
    if (code.length < 4 || code.length > 6) {
      toast({ title: "Código inválido", description: "O token tem 4 caracteres (ex: A7X9).", variant: "destructive" });
      return;
    }
    setConfirmoInput("");
    setImpactOpen(true);
  }

  // Passo 2: chamada à API só ocorre após CONFIRMO ter sido digitado e validado.
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

  function statusBadge(sessionId: string) {
    const status = myRecords[sessionId];
    if (!status || status === "ausente") {
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Ausente</Badge>;
    }
    if (status === "presente") {
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Presente</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Justificado</Badge>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-orange-100 rounded-xl">
          <ClipboardCheck className="h-6 w-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-black italic">Minha Frequência</h1>
          <p className="text-sm text-muted-foreground">Acompanhe sua presença nas aulas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="rounded-[2.5rem] shadow-2xl border-none">
          <CardContent className="pt-5 pb-5 text-center">
            <p className="text-2xl font-black">{totalSessions}</p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">Total de Aulas</p>
          </CardContent>
        </Card>
        <Card className="rounded-[2.5rem] shadow-2xl border-none">
          <CardContent className="pt-5 pb-5 text-center">
            <p className="text-2xl font-black text-green-600">{presentes}</p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">Presente</p>
          </CardContent>
        </Card>
        <Card className="rounded-[2.5rem] shadow-2xl border-none">
          <CardContent className="pt-5 pb-5 text-center">
            <p className="text-2xl font-black text-red-600">{ausentes}</p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">Ausente</p>
          </CardContent>
        </Card>
        <Card className={`rounded-[2.5rem] shadow-2xl border-none ${atRisk ? "bg-red-50" : "bg-green-50"}`}>
          <CardContent className="pt-5 pb-5 text-center">
            <p className={`text-2xl font-black ${atRisk ? "text-red-600" : "text-green-600"}`}>{pct}%</p>
            <p className={`text-xs font-medium mt-0.5 ${atRisk ? "text-red-500" : "text-green-500"}`}>
              {atRisk ? "Em Risco" : "Frequência"}
            </p>
          </CardContent>
        </Card>
      </div>

      {atRisk && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            Sua frequência está abaixo de 75%. Entre em contato com seu professor para regularizar a situação.
          </p>
        </div>
      )}

      <Card className="rounded-[2.5rem] shadow-2xl border-none">
        <CardHeader>
          <CardTitle className="font-black italic flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-orange-500" />
            Check-in da Aula
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            O professor exibirá um token curto (ex: <span className="font-mono font-black">A7X9</span>) na lousa.
            Digite-o aqui até <strong>às 17h00</strong> do dia da aula.
          </p>
          <div className="flex gap-3 items-end">
            <div className="space-y-1">
              <Label htmlFor="checkin-code">Token da aula</Label>
              <Input
                id="checkin-code"
                className="text-center text-2xl font-black tracking-[0.4em] w-44 uppercase font-mono"
                maxLength={6}
                placeholder="A7X9"
                value={checkinCode}
                onChange={(e) => setCheckinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && handleOpenImpact()}
              />
            </div>
            <Button onClick={handleOpenImpact} disabled={checkingIn || checkinCode.length < 4} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Confirmar Presença
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Impacto — Barreira Anti-Fraude */}
      <Dialog open={impactOpen} onOpenChange={(v) => { if (!v) { setImpactOpen(false); setConfirmoInput(""); } }}>
        <DialogContent className="sm:max-w-lg rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-8 pb-4 bg-red-50 border-b-2 border-red-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-14 w-14 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-300">
                <ShieldAlert className="h-7 w-7 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black text-red-700 leading-none italic uppercase tracking-tighter">
                  Aviso de Fraude
                </DialogTitle>
                <DialogDescription className="text-xs mt-1 font-bold text-red-600">
                  Leia com atenção antes de confirmar
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-8 space-y-5">
            <div className="space-y-4 text-sm leading-relaxed">
              <div className="flex items-start gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-2xl">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-red-700 font-bold">
                  Você está prestes a registrar sua <strong>presença em uma aula presencial</strong>. O token só pode ser digitado por <strong>você, dentro da sala</strong>.
                </p>
              </div>

              <ul className="space-y-2 text-slate-700 font-medium text-[13px]">
                <li className="flex gap-2"><span className="text-red-600 font-black">·</span> Compartilhar o token com colegas que faltaram caracteriza <strong>fraude documental</strong>.</li>
                <li className="flex gap-2"><span className="text-red-600 font-black">·</span> Alunos detectados em fraude perdem a vaga no cursinho <strong>imediatamente</strong>.</li>
                <li className="flex gap-2"><span className="text-red-600 font-black">·</span> A lista de papel da sala é cruzada com os check-ins do app pela secretaria.</li>
                <li className="flex gap-2"><span className="text-red-600 font-black">·</span> Divergências entre lista física e app geram <strong>auditoria</strong>.</li>
              </ul>
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="confirmo" className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
                Para prosseguir, digite a palavra <span className="text-red-600 font-black">CONFIRMO</span>
              </Label>
              <Input
                id="confirmo"
                placeholder="CONFIRMO"
                value={confirmoInput}
                onChange={(e) => setConfirmoInput(e.target.value.toUpperCase())}
                className="h-14 text-center text-xl font-black tracking-[0.3em] rounded-2xl border-2 border-red-200 focus:border-red-500 bg-white"
                autoComplete="off"
              />
              <p className="text-[10px] text-muted-foreground font-medium text-center">
                Esta ação é registrada e seu nome ficará vinculado a este check-in.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => { setImpactOpen(false); setConfirmoInput(""); }}
                className="flex-1 h-12 rounded-2xl font-black text-xs border-slate-200"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmedCheckin}
                disabled={checkingIn || confirmoInput.trim().toUpperCase() !== "CONFIRMO"}
                className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-lg shadow-red-200 border-none text-xs disabled:opacity-40"
              >
                {checkingIn ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Registrar Presença ({checkinCode})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="rounded-[2.5rem] shadow-2xl border-none">
        <CardHeader>
          <CardTitle className="font-black italic flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Histórico de Aulas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center py-14 gap-3 text-muted-foreground border-2 border-dashed rounded-2xl">
              <ClipboardCheck className="h-10 w-10 opacity-30" />
              <p className="font-semibold">Nenhuma aula registrada ainda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-3 px-2 font-semibold">Data</th>
                    <th className="text-left py-3 px-2 font-semibold">Aula</th>
                    <th className="text-left py-3 px-2 font-semibold">Matéria</th>
                    <th className="text-left py-3 px-2 font-semibold">Tipo</th>
                    <th className="text-left py-3 px-2 font-semibold">Professor</th>
                    <th className="text-left py-3 px-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-2 whitespace-nowrap">
                        {format(new Date(session.session_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                      </td>
                      <td className="py-3 px-2 font-medium max-w-[180px] truncate">{session.title}</td>
                      <td className="py-3 px-2 text-muted-foreground">{session.subject || "—"}</td>
                      <td className="py-3 px-2">
                        <Badge
                          variant="secondary"
                          className={session.session_type === "live" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}
                        >
                          {session.session_type === "live" ? "Live" : "Presencial"}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">{session.teacher_name || "—"}</td>
                      <td className="py-3 px-2">{statusBadge(session.id)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
