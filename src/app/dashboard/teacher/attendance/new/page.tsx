
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function NewAttendanceSessionPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lives, setLives] = useState<any[]>([]);
  const [classOptions, setClassOptions] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject: "",
    class_label: "",
    session_date: format(new Date(), "yyyy-MM-dd"),
    start_time: "",
    session_type: "presencial" as "presencial" | "live",
    live_id: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("lives")
      .select("id, title, start_time")
      .eq("teacher_id", user.id)
      .order("start_time", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setLives(data);
      });

    // Carregar lista distinta de turmas a partir de profiles.course
    supabase
      .from("profiles")
      .select("course")
      .eq("profile_type", "student")
      .not("course", "is", null)
      .then(({ data }) => {
        if (!data) return;
        const distinct = Array.from(new Set(data.map(p => (p.course || "").trim()).filter(Boolean))).sort();
        setClassOptions(distinct);
      });
  }, [user]);

  function handleLiveSelect(liveId: string) {
    if (liveId === "none") {
      setFormData((prev) => ({ ...prev, live_id: "" }));
      return;
    }
    const live = lives.find((l) => l.id === liveId);
    if (!live) return;
    const d = new Date(live.start_time);
    setFormData((prev) => ({
      ...prev,
      live_id: liveId,
      title: prev.title || live.title,
      session_date: format(d, "yyyy-MM-dd"),
      start_time: format(d, "HH:mm"),
      session_type: "live",
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title || !formData.session_date || !user) {
      toast({ title: "Dados incompletos", description: "Título e data são obrigatórios.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    if (!formData.class_label) {
      toast({ title: "Selecione uma sala/turma", description: "A chamada precisa estar vinculada a uma turma.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    const { data, error } = await supabase
      .from("class_sessions")
      .insert({
        title: formData.title,
        description: formData.description || null,
        subject: formData.subject || null,
        class_label: formData.class_label,
        session_date: formData.session_date,
        start_time: formData.start_time || null,
        session_type: formData.session_type,
        teacher_id: user.id,
        teacher_name: profile?.full_name || null,
        live_id: formData.live_id || null,
      })
      .select("id")
      .single();

    if (error) {
      toast({ title: "Erro ao criar sessão", description: error.message, variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    toast({ title: "Sessão criada!", description: "Agora você pode registrar a chamada." });
    router.push(`/dashboard/teacher/attendance/${data.id}`);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/teacher/attendance">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-xl">
            <ClipboardCheck className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black italic">Nova Sessão</h1>
            <p className="text-sm text-muted-foreground">Crie uma aula para registrar chamada</p>
          </div>
        </div>
      </div>

      <Card className="rounded-[2.5rem] shadow-2xl border-none">
        <CardHeader>
          <CardTitle className="font-black italic">Detalhes da Aula</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="live_id">Vincular a uma Live (opcional)</Label>
              <Select onValueChange={handleLiveSelect} defaultValue="none">
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar live..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {lives.map((live) => (
                    <SelectItem key={live.id} value={live.id}>
                      {live.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">
                  Título <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Ex: Matemática — Funções"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="session_date">
                  Data <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="session_date"
                  type="date"
                  value={formData.session_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, session_date: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_time">Horário</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData((prev) => ({ ...prev, start_time: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Matéria</Label>
                <Input
                  id="subject"
                  placeholder="Ex: Matemática"
                  value={formData.subject}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="class_label">
                  Sala / Turma <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.class_label}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, class_label: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar turma..." />
                  </SelectTrigger>
                  <SelectContent>
                    {classOptions.length === 0 ? (
                      <SelectItem value="__none__" disabled>Nenhuma turma cadastrada</SelectItem>
                    ) : (
                      classOptions.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground font-medium">
                  A chamada será vinculada à turma — só alunos desta sala poderão usar o token.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="session_type">Tipo</Label>
                <Select
                  value={formData.session_type}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, session_type: v as "presencial" | "live" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="live">Live (Online)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Observações sobre a aula..."
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Link href="/dashboard/teacher/attendance">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Criar Sessão e Registrar Chamada
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
