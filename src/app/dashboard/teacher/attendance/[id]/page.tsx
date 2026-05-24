
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, ClipboardCheck, Loader2, RefreshCw, Copy, X,
  MonitorPlay, Users, CheckCircle2, XCircle, AlertCircle,
  UserPlus, UserMinus, Search, UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const CHECKIN_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode() {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += CHECKIN_CHARSET[Math.floor(Math.random() * CHECKIN_CHARSET.length)];
  }
  return code;
}

// Token expira às 17h00 do dia da sessão (deadline da chamada via app).
function expiryFor(sessionDateISO: string): string {
  const base = new Date(sessionDateISO + "T00:00:00");
  base.setHours(17, 0, 0, 0);
  return base.toISOString();
}

type AttendanceStatus = "presente" | "ausente" | "justificado";

export default function AttendanceSessionPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();

  const [session, setSession] = useState<any>(null);
  // allStudents: todos os perfis de aluno — fonte para o painel de busca
  const [allStudents, setAllStudents] = useState<any[]>([]);
  // records: apenas os alunos explicitamente na chamada desta sessão
  const [records, setRecords] = useState<Record<string, { status: AttendanceStatus; justification: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // painel "Adicionar Aluno"
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingAll, setAddingAll] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [sessionRes, studentsRes, recordsRes] = await Promise.all([
        supabase.from("class_sessions").select("*").eq("id", id).single(),
        supabase
          .from("profiles")
          .select("id, name, institution, exam_target")
          .eq("profile_type", "student")
          .order("name"),
        supabase.from("attendance_records").select("*").eq("session_id", id),
      ]);

      if (sessionRes.data) {
        setSession(sessionRes.data);
        if (sessionRes.data.checkin_code_expires_at) {
          const remaining = Math.max(
            0,
            Math.floor(
              (new Date(sessionRes.data.checkin_code_expires_at).getTime() - Date.now()) / 1000
            )
          );
          setCountdown(remaining);
        }
      }

      if (studentsRes.data) setAllStudents(studentsRes.data);

      // Roster: apenas alunos que já têm registro nesta sessão
      if (recordsRes.data) {
        const initial: Record<string, { status: AttendanceStatus; justification: string }> = {};
        recordsRes.data.forEach((r: any) => {
          initial[r.student_id] = { status: r.status, justification: r.justification || "" };
        });
        setRecords(initial);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (countdown <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [countdown]);

  // ── Código de check-in ─────────────────────────────────────────────────────
  async function handleGenerateCode() {
    if (!session) return;
    setGeneratingCode(true);
    const code = generateCode();
    const expiresAt = expiryFor(session.session_date);
    const remainingSec = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
    if (remainingSec <= 0) {
      toast({
        title: "Janela encerrada",
        description: "A janela de check-in via app vai até as 17h00 do dia da aula.",
        variant: "destructive",
      });
      setGeneratingCode(false);
      return;
    }
    const { error } = await supabase
      .from("class_sessions")
      .update({ checkin_code: code, checkin_code_expires_at: expiresAt })
      .eq("id", session.id);
    if (error) {
      toast({ title: "Erro ao gerar código", description: error.message, variant: "destructive" });
    } else {
      setSession((prev: any) => ({ ...prev, checkin_code: code, checkin_code_expires_at: expiresAt }));
      setCountdown(remainingSec);
      toast({ title: `Token ${code}`, description: "Válido até as 17h00 do dia da aula." });
    }
    setGeneratingCode(false);
  }

  async function handleInvalidateCode() {
    if (!session) return;
    const { error } = await supabase
      .from("class_sessions")
      .update({ checkin_code: null, checkin_code_expires_at: null })
      .eq("id", session.id);
    if (!error) {
      setSession((prev: any) => ({ ...prev, checkin_code: null, checkin_code_expires_at: null }));
      setCountdown(0);
    }
  }

  // ── Adicionar/Remover alunos da chamada ────────────────────────────────────
  async function handleAddStudent(studentId: string) {
    setAddingId(studentId);
    const { error } = await supabase.from("attendance_records").insert({
      session_id: id,
      student_id: studentId,
      status: "ausente",
    });
    if (error) {
      toast({ title: "Erro ao adicionar aluno", description: error.message, variant: "destructive" });
    } else {
      setRecords((prev) => ({ ...prev, [studentId]: { status: "ausente", justification: "" } }));
    }
    setAddingId(null);
  }

  async function handleRemoveStudent(studentId: string) {
    setRemovingId(studentId);
    const { error } = await supabase
      .from("attendance_records")
      .delete()
      .eq("session_id", id)
      .eq("student_id", studentId);
    if (error) {
      toast({ title: "Erro ao remover aluno", description: error.message, variant: "destructive" });
    } else {
      setRecords((prev) => {
        const { [studentId]: _, ...rest } = prev;
        return rest;
      });
    }
    setRemovingId(null);
  }

  async function handleAddAll() {
    const toAdd = allStudents.filter((s) => !records[s.id]);
    if (toAdd.length === 0) {
      toast({ title: "Todos os alunos já estão na lista." });
      return;
    }
    setAddingAll(true);
    const payload = toAdd.map((s) => ({ session_id: id, student_id: s.id, status: "ausente" }));
    const { error } = await supabase
      .from("attendance_records")
      .upsert(payload, { onConflict: "session_id,student_id" });
    if (error) {
      toast({ title: "Erro ao adicionar todos", description: error.message, variant: "destructive" });
    } else {
      setRecords((prev) => {
        const next = { ...prev };
        toAdd.forEach((s) => { next[s.id] = { status: "ausente", justification: "" }; });
        return next;
      });
      toast({ title: `${toAdd.length} alunos adicionados à chamada.` });
      setShowAddPanel(false);
    }
    setAddingAll(false);
  }

  // ── Status / Justificação ──────────────────────────────────────────────────
  function setStatus(studentId: string, status: AttendanceStatus) {
    setRecords((prev) => ({ ...prev, [studentId]: { ...prev[studentId], status } }));
  }

  function setJustification(studentId: string, text: string) {
    setRecords((prev) => ({ ...prev, [studentId]: { ...prev[studentId], justification: text } }));
  }

  async function handleSaveAll() {
    if (!session) return;
    setSaving(true);
    const payload = Object.entries(records).map(([studentId, rec]) => ({
      session_id: session.id,
      student_id: studentId,
      status: rec.status,
      justification: rec.justification || null,
    }));
    if (payload.length === 0) {
      toast({ title: "A lista está vazia.", variant: "destructive" });
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from("attendance_records")
      .upsert(payload, { onConflict: "session_id,student_id" });
    if (error) {
      toast({ title: "Erro ao salvar chamada", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Chamada salva!", description: "Frequência registrada com sucesso." });
    }
    setSaving(false);
  }

  // ── Derivações ─────────────────────────────────────────────────────────────
  const rosterStudents = allStudents.filter((s) => records[s.id] !== undefined);
  const availableStudents = allStudents.filter(
    (s) =>
      records[s.id] === undefined &&
      (!addSearch || s.name?.toLowerCase().includes(addSearch.toLowerCase()))
  );

  const stats = {
    presentes: Object.values(records).filter((r) => r.status === "presente").length,
    ausentes: Object.values(records).filter((r) => r.status === "ausente").length,
    justificados: Object.values(records).filter((r) => r.status === "justificado").length,
    total: rosterStudents.length,
  };
  const pct = stats.total > 0 ? Math.round((stats.presentes / stats.total) * 100) : 0;

  const codeActive = session?.checkin_code && countdown > 0;
  const countdownHr = Math.floor(countdown / 3600);
  const countdownMin = Math.floor((countdown % 3600) / 60);
  const countdownSec = countdown % 60;
  const countdownLabel = countdownHr > 0
    ? `${countdownHr}h ${String(countdownMin).padStart(2, "0")}min restantes`
    : countdownMin > 0
      ? `${countdownMin}min ${String(countdownSec).padStart(2, "0")}s restantes`
      : `${countdownSec}s restantes`;

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Sessão não encontrada.</p>
        <Link href="/dashboard/teacher/attendance">
          <Button variant="link">Voltar</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/dashboard/teacher/attendance">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-black italic truncate">{session.title}</h1>
            <Badge
              variant="secondary"
              className={
                session.session_type === "live"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-blue-100 text-blue-700"
              }
            >
              {session.session_type === "live" ? "Live" : "Presencial"}
            </Badge>
            {session.subject && <Badge variant="outline">{session.subject}</Badge>}
            {session.class_label && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-black">
                Turma {session.class_label}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(new Date(session.session_date + "T12:00:00"), "EEEE, dd 'de' MMMM 'de' yyyy", {
              locale: ptBR,
            })}
            {session.start_time && ` — ${session.start_time.slice(0, 5)}`}
          </p>
        </div>
        {session.live_id && (
          <Link href={`/dashboard/teacher/live/${session.live_id}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <MonitorPlay className="h-4 w-4" />
              Abrir Live
            </Button>
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="rounded-[2rem] shadow-md border-none bg-green-50">
          <CardContent className="pt-5 pb-5 text-center">
            <p className="text-2xl font-black text-green-700">{stats.presentes}</p>
            <p className="text-xs text-green-600 font-medium">Presentes</p>
          </CardContent>
        </Card>
        <Card className="rounded-[2rem] shadow-md border-none bg-red-50">
          <CardContent className="pt-5 pb-5 text-center">
            <p className="text-2xl font-black text-red-700">{stats.ausentes}</p>
            <p className="text-xs text-red-600 font-medium">Ausentes</p>
          </CardContent>
        </Card>
        <Card className="rounded-[2rem] shadow-md border-none bg-yellow-50">
          <CardContent className="pt-5 pb-5 text-center">
            <p className="text-2xl font-black text-yellow-700">{stats.justificados}</p>
            <p className="text-xs text-yellow-600 font-medium">Justificados</p>
          </CardContent>
        </Card>
        <Card className="rounded-[2rem] shadow-md border-none bg-blue-50">
          <CardContent className="pt-5 pb-5 text-center">
            <p className="text-2xl font-black text-blue-700">{pct}%</p>
            <p className="text-xs text-blue-600 font-medium">Frequência</p>
          </CardContent>
        </Card>
      </div>

      {/* Código de check-in */}
      <Card className="rounded-[2.5rem] shadow-2xl border-none">
        <CardHeader>
          <CardTitle className="font-black italic flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-orange-500" />
            Código de Auto Check-in
          </CardTitle>
        </CardHeader>
        <CardContent>
          {codeActive ? (
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl px-8 py-4 text-center">
                <p className="text-5xl font-black tracking-[0.4em] text-orange-600 font-mono">
                  {session.checkin_code}
                </p>
                <p className="text-xs text-orange-500 mt-2 font-bold uppercase tracking-widest">
                  Encerra às 17h00 · {countdownLabel}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    navigator.clipboard.writeText(session.checkin_code);
                    toast({ title: "Código copiado!" });
                  }}
                >
                  <Copy className="h-4 w-4" />
                  Copiar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-destructive"
                  onClick={handleInvalidateCode}
                >
                  <X className="h-4 w-4" />
                  Invalidar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleGenerateCode}
                  disabled={generatingCode}
                >
                  <RefreshCw className="h-4 w-4" />
                  Novo
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                {session.checkin_code && countdown === 0
                  ? "Código expirado."
                  : "Gere um código para os alunos confirmarem presença pelo celular."}
              </p>
              <Button
                onClick={handleGenerateCode}
                disabled={generatingCode}
                size="sm"
                className="gap-2 shrink-0"
              >
                {generatingCode ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ClipboardCheck className="h-4 w-4" />
                )}
                Gerar Código
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de Alunos */}
      <Card className="rounded-[2.5rem] shadow-2xl border-none">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="font-black italic flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Lista de Alunos ({rosterStudents.length})
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mr-1 hidden sm:flex">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />P
                </span>
                <span className="flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-red-500" />A
                </span>
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-yellow-500" />J
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => { setShowAddPanel((v) => !v); setAddSearch(""); }}
              >
                <UserPlus className="h-4 w-4" />
                Adicionar Aluno
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Painel de busca para adicionar alunos */}
          {showAddPanel && (
            <div className="border rounded-2xl p-4 bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  Adicionar à chamada
                  {availableStudents.length < allStudents.filter((s) => !records[s.id]).length && (
                    <span className="text-muted-foreground font-normal"> — {availableStudents.length} resultado(s)</span>
                  )}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-2 text-muted-foreground"
                  onClick={handleAddAll}
                  disabled={addingAll || allStudents.filter((s) => !records[s.id]).length === 0}
                >
                  {addingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UsersRound className="h-3.5 w-3.5" />}
                  Adicionar todos ({allStudents.filter((s) => !records[s.id]).length})
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar aluno pelo nome..."
                  value={addSearch}
                  onChange={(e) => setAddSearch(e.target.value)}
                  autoFocus
                />
              </div>
              {allStudents.filter((s) => !records[s.id]).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">
                  Todos os alunos já estão na lista.
                </p>
              ) : availableStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">
                  Nenhum aluno encontrado para "{addSearch}".
                </p>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-1">
                  {availableStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-background transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">{student.name || "Sem nome"}</p>
                        <p className="text-xs text-muted-foreground">
                          {student.institution || student.exam_target || "—"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 h-8"
                        onClick={() => handleAddStudent(student.id)}
                        disabled={addingId === student.id}
                      >
                        {addingId === student.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserPlus className="h-3.5 w-3.5" />
                        )}
                        Adicionar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Roster */}
          {rosterStudents.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3 text-muted-foreground border-2 border-dashed rounded-2xl">
              <Users className="h-10 w-10 opacity-30" />
              <p className="font-semibold">Nenhum aluno na lista ainda</p>
              <p className="text-sm">Use "Adicionar Aluno" para montar a chamada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rosterStudents.map((student) => {
                const rec = records[student.id];
                return (
                  <div
                    key={student.id}
                    className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-xl border transition-colors ${
                      rec.status === "presente"
                        ? "bg-green-50 border-green-200"
                        : rec.status === "justificado"
                        ? "bg-yellow-50 border-yellow-200"
                        : "bg-muted/30 border-transparent"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {student.name || "Aluno sem nome"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {student.institution || student.exam_target || "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Toggle P / A / J */}
                      <div className="flex rounded-lg overflow-hidden border">
                        {(["presente", "ausente", "justificado"] as AttendanceStatus[]).map((s) => (
                          <button
                            key={s}
                            onClick={() => setStatus(student.id, s)}
                            className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                              rec.status === s
                                ? s === "presente"
                                  ? "bg-green-500 text-white"
                                  : s === "justificado"
                                  ? "bg-yellow-500 text-white"
                                  : "bg-red-500 text-white"
                                : "bg-white hover:bg-muted text-muted-foreground"
                            }`}
                          >
                            {s === "presente" ? "P" : s === "ausente" ? "A" : "J"}
                          </button>
                        ))}
                      </div>
                      {/* Campo de justificativa */}
                      {rec.status === "justificado" && (
                        <Input
                          className="h-8 text-xs w-36"
                          placeholder="Motivo..."
                          value={rec.justification}
                          onChange={(e) => setJustification(student.id, e.target.value)}
                        />
                      )}
                      {/* Remover da chamada */}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Remover da chamada"
                        onClick={() => handleRemoveStudent(student.id)}
                        disabled={removingId === student.id}
                      >
                        {removingId === student.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserMinus className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Salvar */}
      <div className="flex justify-end pb-6">
        <Button
          onClick={handleSaveAll}
          disabled={saving || rosterStudents.length === 0}
          size="lg"
          className="gap-2 px-8"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ClipboardCheck className="h-5 w-5" />
          )}
          Salvar Chamada
        </Button>
      </div>
    </div>
  );
}
