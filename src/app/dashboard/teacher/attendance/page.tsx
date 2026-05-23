
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Plus, Eye, Trash2, Loader2, CalendarDays, Users, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TeacherAttendancePage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [totalStudents, setTotalStudents] = useState(0);

  async function fetchData() {
    if (!user) return;
    setLoading(true);
    try {
      const [sessionsRes, studentsRes] = await Promise.all([
        supabase
          .from("class_sessions")
          .select("*, attendance_records(status)")
          .eq("teacher_id", user.id)
          .order("session_date", { ascending: false }),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "student"),
      ]);

      if (sessionsRes.data) setSessions(sessionsRes.data);
      if (studentsRes.count !== null) setTotalStudents(studentsRes.count);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [user]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    const { error } = await supabase.from("class_sessions").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sessão excluída com sucesso." });
      setSessions((prev) => prev.filter((s) => s.id !== id));
    }
    setDeletingId(null);
  }

  function getSessionStats(session: any) {
    const records: any[] = session.attendance_records || [];
    const presentes = records.filter((r) => r.status === "presente").length;
    const total = totalStudents || records.length;
    const pct = total > 0 ? Math.round((presentes / total) * 100) : 0;
    return { presentes, total, pct };
  }

  const now = new Date();
  const thisMonth = sessions.filter((s) => {
    const d = new Date(s.session_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const avgPct =
    sessions.length > 0
      ? Math.round(
          sessions.reduce((acc, s) => acc + getSessionStats(s).pct, 0) / sessions.length
        )
      : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-xl">
            <ClipboardCheck className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black italic">Chamadas</h1>
            <p className="text-sm text-muted-foreground">Gerencie a frequência dos alunos</p>
          </div>
        </div>
        <Link href="/dashboard/teacher/attendance/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Sessão
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-[2.5rem] shadow-2xl border-none">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <CalendarDays className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-black">{sessions.length}</p>
              <p className="text-sm text-muted-foreground">Total de Sessões</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[2.5rem] shadow-2xl border-none">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-black">{avgPct}%</p>
              <p className="text-sm text-muted-foreground">Taxa Média de Presença</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[2.5rem] shadow-2xl border-none">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-xl">
              <Users className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-black">{thisMonth.length}</p>
              <p className="text-sm text-muted-foreground">Sessões Este Mês</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[2.5rem] shadow-2xl border-none">
        <CardHeader>
          <CardTitle className="font-black italic">Histórico de Sessões</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground border-2 border-dashed rounded-2xl">
              <ClipboardCheck className="h-12 w-12 opacity-30" />
              <p className="font-semibold">Nenhuma sessão criada ainda</p>
              <p className="text-sm">Clique em "Nova Sessão" para começar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-3 px-2 font-semibold">Data</th>
                    <th className="text-left py-3 px-2 font-semibold">Título</th>
                    <th className="text-left py-3 px-2 font-semibold">Matéria</th>
                    <th className="text-left py-3 px-2 font-semibold">Tipo</th>
                    <th className="text-left py-3 px-2 font-semibold">Presença</th>
                    <th className="text-right py-3 px-2 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => {
                    const stats = getSessionStats(session);
                    return (
                      <tr key={session.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-2 whitespace-nowrap">
                          {format(new Date(session.session_date), "dd/MM/yyyy", { locale: ptBR })}
                        </td>
                        <td className="py-3 px-2 font-medium max-w-[200px] truncate">{session.title}</td>
                        <td className="py-3 px-2 text-muted-foreground">{session.subject || "—"}</td>
                        <td className="py-3 px-2">
                          <Badge
                            variant="secondary"
                            className={session.session_type === "live" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}
                          >
                            {session.session_type === "live" ? "Live" : "Presencial"}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <span
                            className={`font-semibold ${stats.pct >= 75 ? "text-green-600" : stats.pct > 0 ? "text-yellow-600" : "text-muted-foreground"}`}
                          >
                            {stats.presentes}/{stats.total}
                            {stats.total > 0 && <span className="text-xs ml-1">({stats.pct}%)</span>}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2 justify-end">
                            <Link href={`/dashboard/teacher/attendance/${session.id}`}>
                              <Button variant="ghost" size="icon" title="Ver chamada">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Excluir sessão"
                              onClick={() => handleDelete(session.id)}
                              disabled={deletingId === session.id}
                              className="text-destructive hover:text-destructive"
                            >
                              {deletingId === session.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
