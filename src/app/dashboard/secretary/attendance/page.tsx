"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ClipboardCheck,
  Loader2,
  Search,
  PlusCircle,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserPlus,
  UserMinus,
  BookOpen,
  Users,
  X,
  FileText,
  UserCheck,
  Camera,
  ImageIcon,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/app/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type AttendanceStatus = "presente" | "ausente" | "justificado";
type AttendanceMethod = "app" | "manual" | "override";
interface AttendanceCell { status: AttendanceStatus; justification: string; method: AttendanceMethod; }

export default function SecretaryAttendancePage() {
  const { toast } = useToast();
  const { user, profile } = useAuth();

  // Lista de sessões e professores
  const [sessions, setSessions] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Loading
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [savingSession, setSavingSession] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Diálogos / Estados
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [classFilter, setClassFilter] = useState("all");

  // Formulário Nova Sessão
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newClassLabel, setNewClassLabel] = useState("");
  const [newDate, setNewDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newType, setNewType] = useState("presencial");
  const [newTeacherId, setNewTeacherId] = useState("");

  // Estado da Chamada
  const [records, setRecords] = useState<Record<string, AttendanceCell>>({});
  // Snapshot do estado inicial para detectar sobrescritas em check-ins via app
  const [originals, setOriginals] = useState<Record<string, { status: AttendanceStatus; method: AttendanceMethod }>>({});
  const [searchStudent, setSearchStudent] = useState("");

  // Upload de foto da chamada em papel
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Diálogo de confirmação para sobrescritas (audit)
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [pendingOverrides, setPendingOverrides] = useState<string[]>([]); // student ids

  // Busca inicial: sessões, professores e alunos
  const fetchData = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const [sessionsRes, teachersRes, studentsRes] = await Promise.all([
        supabase.from("class_sessions").select("*").order("session_date", { ascending: false }),
        supabase.from("profiles").select("id, name").in("profile_type", ["teacher", "admin"]),
        supabase.from("profiles").select("id, name, course, institution").eq("profile_type", "student").order("name"),
      ]);

      setSessions(sessionsRes.data || []);
      setTeachers(teachersRes.data || []);
      setStudents(studentsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Criação de nova sessão
  const handleCreateSession = async () => {
    if (!newTitle.trim() || !newTeacherId || !newClassLabel) {
      toast({ title: "Erro", description: "Título, professor e sala/turma são obrigatórios.", variant: "destructive" });
      return;
    }
    setSavingSession(true);
    try {
      const teacher = teachers.find(t => t.id === newTeacherId);
      const payload = {
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        subject: newSubject.trim() || null,
        class_label: newClassLabel,
        session_date: newDate,
        session_type: newType,
        teacher_id: newTeacherId,
        teacher_name: teacher ? teacher.name : "Professor",
      };

      const { data, error } = await supabase.from("class_sessions").insert(payload).select().single();
      if (error) throw error;

      toast({ title: "Sessão de Aula Criada!" });
      setSessions(prev => [data, ...prev]);
      setCreateOpen(false);

      // Abre automaticamente a chamada para a sessão criada
      handleOpenAttendance(data);
    } catch (err: any) {
      toast({ title: "Erro ao criar", description: err.message, variant: "destructive" });
    } finally {
      setSavingSession(false);
    }
  };

  // Abre os detalhes da chamada de uma sessão
  const handleOpenAttendance = async (sessionItem: any) => {
    setSelectedSession(sessionItem);
    setLoadingDetails(true);
    setRecords({});
    setOriginals({});
    try {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("student_id, status, justification, method")
        .eq("session_id", sessionItem.id);

      if (error) throw error;

      const initial: Record<string, AttendanceCell> = {};
      const snap: Record<string, { status: AttendanceStatus; method: AttendanceMethod }> = {};

      // Popula com o que já foi salvo
      data.forEach((r: any) => {
        const cell: AttendanceCell = {
          status: r.status,
          justification: r.justification || "",
          method: (r.method as AttendanceMethod) || "manual",
        };
        initial[r.student_id] = cell;
        snap[r.student_id] = { status: cell.status, method: cell.method };
      });

      // Pré-carrega alunos da mesma turma da sessão (se houver) como "ausente" para facilitar bulk
      const sessionClass = sessionItem.class_label;
      const rosterPool = sessionClass
        ? students.filter(s => (s.course || "").trim() === sessionClass)
        : students;

      rosterPool.forEach(s => {
        if (!initial[s.id]) {
          initial[s.id] = { status: "ausente", justification: "", method: "manual" };
        }
      });

      setRecords(initial);
      setOriginals(snap);
    } catch (err: any) {
      toast({ title: "Erro ao carregar detalhes", description: err.message, variant: "destructive" });
    } finally {
      setLoadingDetails(false);
    }
  };

  // Atualiza presença localmente
  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setRecords(prev => ({ ...prev, [studentId]: { ...prev[studentId], status } }));
  };

  const setJustification = (studentId: string, text: string) => {
    setRecords(prev => ({ ...prev, [studentId]: { ...prev[studentId], justification: text } }));
  };

  // Detecta sobrescritas de check-ins originados no app (method='app')
  const computeOverrides = (): string[] => {
    return Object.entries(records)
      .filter(([studentId, rec]) => {
        const orig = originals[studentId];
        if (!orig || orig.method !== "app") return false;
        return orig.status !== rec.status;
      })
      .map(([studentId]) => studentId);
  };

  // Passo 1 do save: se há sobrescritas de app, exige justificativa via dialog
  const handleSaveAttendance = () => {
    if (!selectedSession) return;
    const overrides = computeOverrides();
    if (overrides.length > 0) {
      setPendingOverrides(overrides);
      setOverrideReason("");
      setOverrideOpen(true);
      return;
    }
    persistAttendance([]);
  };

  // Passo 2: executa o upsert e, se houver overrides, registra audit log
  const persistAttendance = async (overrideIds: string[]) => {
    if (!selectedSession || !user) return;
    if (overrideIds.length > 0 && !overrideReason.trim()) {
      toast({ title: "Motivo obrigatório", description: "Justifique a sobrescrita para registrar no audit log.", variant: "destructive" });
      return;
    }
    setSavingAttendance(true);
    try {
      const overrideSet = new Set(overrideIds);
      const payload = Object.entries(records).map(([studentId, rec]) => {
        const orig = originals[studentId];
        let method: AttendanceMethod;
        if (overrideSet.has(studentId)) {
          method = "override";
        } else if (orig?.method === "app") {
          method = "app"; // não foi tocado, mantém origem
        } else {
          method = "manual";
        }
        return {
          session_id: selectedSession.id,
          student_id: studentId,
          status: rec.status,
          justification: rec.justification || null,
          method,
        };
      });

      const { data: upserted, error } = await supabase
        .from("attendance_records")
        .upsert(payload, { onConflict: "session_id,student_id" })
        .select("id, student_id, status, method");
      if (error) throw error;

      // Audit log para sobrescritas de app
      if (overrideIds.length > 0 && upserted) {
        const lookup: Record<string, { id: string; status: string; method: string }> = {};
        upserted.forEach((r: any) => { lookup[r.student_id] = r; });
        const auditPayload = overrideIds.map(studentId => {
          const rec = lookup[studentId];
          const orig = originals[studentId];
          return {
            attendance_record_id: rec.id,
            session_id: selectedSession.id,
            student_id: studentId,
            changed_by: user.id,
            changed_by_name: profile?.name || profile?.full_name || null,
            previous_status: orig?.status || null,
            new_status: rec.status,
            previous_method: orig?.method || null,
            new_method: rec.method,
            reason: overrideReason.trim(),
          };
        });
        const { error: auditErr } = await supabase.from("attendance_audit").insert(auditPayload);
        if (auditErr) throw auditErr;
      }

      toast({
        title: "Frequência atualizada!",
        description: overrideIds.length > 0
          ? `${overrideIds.length} sobrescrita${overrideIds.length > 1 ? "s" : ""} registrada${overrideIds.length > 1 ? "s" : ""} no audit log.`
          : undefined,
      });
      setOverrideOpen(false);
      setOverrideReason("");
      setPendingOverrides([]);
      setSelectedSession(null);
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSavingAttendance(false);
    }
  };

  // Upload da foto da chamada em papel
  const handleUploadPhoto = async (file: File) => {
    if (!selectedSession || !user) return;
    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `attendance-photos/${selectedSession.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("learning-contents")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage
        .from("learning-contents")
        .getPublicUrl(path);
      const { error: updateErr } = await supabase
        .from("class_sessions")
        .update({ paper_photo_url: urlData.publicUrl })
        .eq("id", selectedSession.id);
      if (updateErr) throw updateErr;
      setSelectedSession((prev: any) => ({ ...prev, paper_photo_url: urlData.publicUrl }));
      setSessions(prev => prev.map(s => s.id === selectedSession.id ? { ...s, paper_photo_url: urlData.publicUrl } : s));
      toast({ title: "Foto da chamada salva!" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar foto", description: err.message, variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Filtra alunos na lista de chamada
  const filteredStudents = students.filter(s => {
    if (!records[s.id]) return false; // apenas na chamada
    return (s.name || "").toLowerCase().includes(searchStudent.toLowerCase());
  });

  // Turmas distintas extraídas das sessões (consistente com o filtro visibleSessions)
  const classOptions = Array.from(
    new Set(sessions.map(s => (s.class_label || "").trim()).filter(Boolean))
  ).sort();

  // Sessões visíveis após o filtro de turma
  const visibleSessions = classFilter === "all"
    ? sessions
    : sessions.filter(s => s.class_label === classFilter);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 px-1">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-primary italic leading-none">
            Diário de Classe & Chamadas
          </h1>
          <p className="text-muted-foreground font-medium italic text-sm">
            Agende aulas, defina professores responsáveis e gerencie o histórico de faltas/presenças.
          </p>
        </div>
        <Button
          onClick={() => {
            setNewTitle("");
            setNewDesc("");
            setNewSubject("");
            setNewTeacherId("");
            setCreateOpen(true);
          }}
          className="bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 h-12 px-6 gap-2 hover:scale-[1.02] active:scale-95 transition-all border-none shrink-0"
        >
          <PlusCircle className="h-4 w-4" /> Nova Aula / Sessão
        </Button>
      </div>

      {/* Lista de Sessões */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-primary italic leading-none flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" /> Histórico de Aulas
            </h2>
            <Badge className="bg-primary/5 text-primary border-none font-bold text-[10px] px-3">{visibleSessions.length} / {sessions.length}</Badge>
          </div>

          {/* Filtro por turma */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Filtrar por Sala / Turma</Label>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-none font-bold text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-2xl">
                <SelectItem value="all" className="font-bold text-xs">Todas as turmas</SelectItem>
                {classOptions.map(c => (
                  <SelectItem key={c} value={c} className="font-bold text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loadingSessions ? (
            <div className="py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : visibleSessions.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground italic text-xs">Nenhuma aula nesta turma.</p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {visibleSessions.map(s => (
                <div
                  key={s.id}
                  onClick={() => handleOpenAttendance(s)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center group ${
                    selectedSession?.id === s.id
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="font-bold text-sm text-slate-800 leading-none group-hover:text-primary transition-colors">{s.title}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[9px] font-black uppercase text-slate-400">
                        {format(new Date(s.session_date + "T12:00:00"), "dd 'de' MMM", { locale: ptBR })}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400">•</span>
                      <span className="text-[9px] font-black uppercase text-slate-400">{s.teacher_name}</span>
                      {s.class_label && (
                        <Badge className="text-[8px] font-black border-none uppercase bg-emerald-50 text-emerald-700">
                          {s.class_label}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge className={`text-[8px] font-black border-none uppercase ${s.session_type === 'live' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                    {s.session_type}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Lançamento / Detalhes de Chamada */}
        <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden p-6 flex flex-col min-h-[400px]">
          {selectedSession ? (
            <div className="space-y-5 flex-1 flex flex-col min-h-0">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <span className="text-[9px] uppercase font-black tracking-wider text-slate-400">Lançamento de Presença</span>
                  <h3 className="font-extrabold text-slate-800 text-lg leading-snug truncate italic">{selectedSession.title}</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">
                    {format(new Date(selectedSession.session_date + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} • {selectedSession.teacher_name}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => setSelectedSession(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Foto da Chamada em Papel */}
              <div className="p-3 rounded-2xl border border-amber-200 bg-amber-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-[10px] font-black uppercase text-amber-700 tracking-widest">Chamada em Papel</span>
                    {selectedSession.paper_photo_url && (
                      <span className="text-[8px] font-black uppercase bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Enviada</span>
                    )}
                  </div>
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="h-7 px-3 text-[10px] font-black rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0"
                  >
                    {uploadingPhoto ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                    {selectedSession.paper_photo_url ? "Trocar" : "Enviar Foto"}
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadPhoto(f);
                      e.target.value = "";
                    }}
                  />
                </div>
                {selectedSession.paper_photo_url ? (
                  <a href={selectedSession.paper_photo_url} target="_blank" rel="noopener noreferrer" title="Abrir em tamanho real">
                    <img
                      src={selectedSession.paper_photo_url}
                      alt="Lista de presença em papel"
                      className="w-full rounded-xl object-cover max-h-40 border border-amber-200 hover:opacity-90 transition-opacity cursor-zoom-in"
                    />
                  </a>
                ) : (
                  <p className="text-[9px] text-amber-600/80 font-medium italic">
                    Fotografe a lista de presença em papel e envie para arquivamento. Será cruzada com os check-ins do app.
                  </p>
                )}
              </div>

              {loadingDetails ? (
                <div className="py-20 flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : (
                <div className="space-y-4 flex-1 flex flex-col min-h-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input 
                      placeholder="Filtrar aluno..." 
                      className="h-9 pl-9 pr-3 rounded-xl bg-slate-50 border-none text-xs" 
                      value={searchStudent}
                      onChange={e => setSearchStudent(e.target.value)}
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 max-h-[300px] pr-1">
                    {filteredStudents.length === 0 ? (
                      <p className="text-center py-10 text-xs text-muted-foreground italic">Nenhum aluno encontrado.</p>
                    ) : (
                      filteredStudents.map(student => {
                        const rec = records[student.id];
                        const orig = originals[student.id];
                        const checkedInViaApp = orig?.method === "app";
                        const isOverriding = checkedInViaApp && orig.status !== rec.status;
                        return (
                          <div
                            key={student.id}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl border transition-all ${
                              isOverriding
                                ? 'bg-red-50 border-red-300 ring-2 ring-red-200'
                                : rec.status === 'presente'
                                ? 'bg-green-50 border-green-200'
                                : rec.status === 'justificado'
                                ? 'bg-amber-50 border-amber-200'
                                : 'bg-slate-50/50 border-slate-100'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-xs text-slate-800 leading-tight truncate">{student.name}</p>
                                {checkedInViaApp && (
                                  <Badge className="bg-emerald-600 text-white border-none font-black text-[8px] uppercase px-1.5 h-4 shrink-0" title="Aluno fez check-in pelo app">
                                    App ✓
                                  </Badge>
                                )}
                                {isOverriding && (
                                  <Badge className="bg-red-600 text-white border-none font-black text-[8px] uppercase px-1.5 h-4 shrink-0">
                                    Sobrescrita
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[9px] font-black uppercase text-slate-400 mt-0.5">{student.course || 'Sem Turma'}</p>
                            </div>

                            <div className="flex items-center gap-2">
                              {rec.status === 'justificado' && (
                                <Input 
                                  placeholder="Justificativa..." 
                                  value={rec.justification} 
                                  onChange={e => setJustification(student.id, e.target.value)}
                                  className="h-7 text-[10px] w-24 rounded-lg bg-white"
                                />
                              )}
                              <div className="flex rounded-lg overflow-hidden border">
                                {(["presente", "ausente", "justificado"] as AttendanceStatus[]).map((s) => (
                                  <button
                                    key={s}
                                    onClick={() => setStatus(student.id, s)}
                                    className={`px-2.5 py-1 text-[10px] font-black transition-colors ${
                                      rec.status === s
                                        ? s === "presente"
                                          ? "bg-green-500 text-white"
                                          : s === "justificado"
                                          ? "bg-amber-500 text-white"
                                          : "bg-red-500 text-white"
                                        : "bg-white hover:bg-slate-100 text-slate-400"
                                    }`}
                                  >
                                    {s === "presente" ? "P" : s === "ausente" ? "A" : "J"}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <Button 
                    onClick={handleSaveAttendance} 
                    disabled={savingAttendance}
                    className="w-full h-12 bg-primary text-white font-black text-xs uppercase shadow-lg border-none mt-auto"
                  >
                    {savingAttendance ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserCheck className="mr-2" />}
                    Confirmar Presenças
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-40">
              <ClipboardCheck className="h-14 w-14 text-slate-400 mb-4" />
              <p className="font-bold text-slate-500 text-sm">Nenhuma aula selecionada</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[240px]">Escolha uma aula no histórico à esquerda para lançar ou retificar a chamada.</p>
            </div>
          )}
        </Card>
      </div>

      {/* Diálogo Criar Sessão */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden max-w-md">
          <DialogHeader className="p-8 pb-4 bg-primary/5 border-b border-primary/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center font-black text-white shadow shrink-0">
                <PlusCircle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black italic text-primary leading-none uppercase tracking-tight">
                  Agendar Aula
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5 font-medium text-muted-foreground">
                  Crie uma nova sessão no diário de classe.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-8 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-primary/40 tracking-widest ml-1">Título da Aula *</Label>
              <Input 
                value={newTitle} 
                onChange={e => setNewTitle(e.target.value)} 
                placeholder="Ex: Revisão - Funções Quadráticas" 
                className="h-12 bg-muted/30 border-none rounded-xl font-bold text-sm" 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-primary/40 tracking-widest ml-1">Matéria (Opcional)</Label>
                <Input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Ex: Matemática" className="h-12 bg-muted/30 border-none rounded-xl font-medium text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-primary/40 tracking-widest ml-1">Tipo</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-2xl">
                    <SelectItem value="presencial" className="font-bold text-xs">Presencial</SelectItem>
                    <SelectItem value="live" className="font-bold text-xs">Live / Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-primary/40 tracking-widest ml-1">Data da Aula</Label>
                <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="h-12 bg-muted/30 border-none rounded-xl font-bold text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-primary/40 tracking-widest ml-1">Mentor / Professor *</Label>
                <Select value={newTeacherId} onValueChange={setNewTeacherId}>
                  <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none font-bold">
                    <SelectValue placeholder="Escolha" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-2xl">
                    {teachers.map(t => (
                      <SelectItem key={t.id} value={t.id} className="font-bold text-xs">{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-primary/40 tracking-widest ml-1">Sala / Turma *</Label>
              <Select value={newClassLabel} onValueChange={setNewClassLabel}>
                <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none font-bold">
                  <SelectValue placeholder="Selecionar turma..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  {classOptions.length === 0 ? (
                    <SelectItem value="__none__" disabled className="font-bold text-xs">Nenhuma turma cadastrada</SelectItem>
                  ) : (
                    classOptions.map(c => (
                      <SelectItem key={c} value={c} className="font-bold text-xs">{c}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleCreateSession} disabled={savingSession} className="w-full h-14 bg-primary hover:bg-primary/95 text-white font-black rounded-2xl shadow-xl mt-4 border-none">
              {savingSession ? <Loader2 className="animate-spin mr-2" /> : <ClipboardCheck className="mr-2" />}
              Confirmar e Salvar no Diário
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Sobrescrita (Audit) */}
      <Dialog open={overrideOpen} onOpenChange={(v) => { if (!v) { setOverrideOpen(false); setOverrideReason(""); } }}>
        <DialogContent className="rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden max-w-md">
          <DialogHeader className="p-8 pb-4 bg-red-50 border-b-2 border-red-200">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-200">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-red-700 italic uppercase tracking-tighter leading-none">
                  Sobrescrever Check-in via App
                </DialogTitle>
                <DialogDescription className="text-xs mt-1 font-bold text-red-600">
                  {pendingOverrides.length} aluno{pendingOverrides.length > 1 ? "s" : ""} com check-in digital ser{pendingOverrides.length > 1 ? "ão" : "á"} alterado{pendingOverrides.length > 1 ? "s" : ""}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-8 space-y-5">
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl">
              <p className="text-xs font-bold text-red-700 leading-relaxed">
                Estes alunos registraram presença pelo app com o token. Sua alteração será registrada no <strong>audit log</strong> com seu nome, data e motivo.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
                Motivo da sobrescrita *
              </Label>
              <Input
                placeholder="Ex: lista de papel da sala confirma ausência"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="h-12 bg-muted/30 border-none rounded-xl font-medium text-sm"
              />
              <p className="text-[10px] text-slate-400 font-medium">
                Mínimo 5 caracteres. Será visível para auditoria.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => { setOverrideOpen(false); setOverrideReason(""); setPendingOverrides([]); }}
                className="flex-1 h-12 rounded-2xl font-black text-xs border-slate-200"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => persistAttendance(pendingOverrides)}
                disabled={savingAttendance || overrideReason.trim().length < 5}
                className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-lg shadow-red-200 border-none text-xs"
              >
                {savingAttendance ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                Confirmar Sobrescrita
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
