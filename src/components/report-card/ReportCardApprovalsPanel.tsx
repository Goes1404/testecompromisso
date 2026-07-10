"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, XCircle, Loader2, FileCheck, Clock, GraduationCap, School } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { PendingEntry } from "@/app/api/admin/report-card-approvals/route";

export default function ReportCardApprovalsPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<PendingEntry[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/report-card-approvals");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setEntries(data.entries || []);
    } catch (err: any) {
      toast({ title: "Erro ao carregar boletins pendentes", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDecision = async (entry: PendingEntry, action: "approve" | "reject", reason?: string) => {
    setBusyId(entry.id);
    try {
      const res = await fetch("/api/admin/report-card-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id: entry.id, track: entry.track, reason }),
      });
      if (!res.ok) throw new Error(await res.text());

      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      toast({
        title: action === "approve" ? "Boletim aprovado" : "Boletim rejeitado",
        description: `${entry.student_name} · ${entry.semester}º semestre`,
      });
    } catch (err: any) {
      toast({ title: "Falha ao processar", description: err.message, variant: "destructive" });
    } finally {
      setBusyId(null);
      setRejectReason("");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 px-1">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black text-primary italic leading-none">Boletins Pendentes</h1>
          <FileCheck className="h-6 w-6 text-accent" />
        </div>
        <p className="text-muted-foreground font-medium italic">
          Boletins importados aguardando revisão antes de ficarem visíveis para o aluno.
        </p>
      </div>

      <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Clock className="h-12 w-12 text-accent animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Carregando fila de aprovação...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-center px-6">
              <CheckCircle2 className="h-12 w-12 text-emerald-300" />
              <p className="font-black italic text-xl text-primary/40 uppercase tracking-widest">Nenhum boletim pendente</p>
              <p className="text-sm text-muted-foreground font-medium">Tudo revisado. Novas importações aparecem aqui.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {entries.map((entry) => (
                <div key={entry.id} className="flex flex-col md:flex-row md:items-center gap-4 p-6 hover:bg-accent/5 transition-colors">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shadow-sm shrink-0">
                      {entry.student_name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-primary text-sm italic truncate">{entry.student_name}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] uppercase gap-1">
                          <GraduationCap className="h-2.5 w-2.5" /> {entry.track === "enem" ? "ENEM" : "ETEC"} · {entry.semester}º sem
                        </Badge>
                        {entry.colegio && (
                          <span className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                            <School className="h-2.5 w-2.5" /> {entry.colegio}{entry.sala ? ` · Sala ${entry.sala}` : ""}
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide mt-1">
                        Importado {format(new Date(entry.imported_at), "dd/MM HH:mm")}
                        {entry.imported_by_name ? ` por ${entry.imported_by_name}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-center px-3">
                      <p className="text-[8px] font-black uppercase text-muted-foreground tracking-wide">Classif.</p>
                      <p className="text-sm font-black text-primary">{entry.classificatoria_score ?? "--"}{entry.classificatoria_max ? `/${entry.classificatoria_max}` : ""}</p>
                    </div>
                    <div className="text-center px-3">
                      <p className="text-[8px] font-black uppercase text-muted-foreground tracking-wide">Redação</p>
                      <p className="text-sm font-black text-primary">{entry.redacao_score ?? "--"}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={busyId === entry.id} className="h-10 w-10 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50">
                            {busyId === entry.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-10 max-w-sm bg-white">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-2xl font-black italic text-primary">Rejeitar Boletim?</AlertDialogTitle>
                            <AlertDialogDescription className="font-medium text-sm">
                              O boletim de <strong>{entry.student_name}</strong> não será exibido ao aluno. Descreva o motivo (opcional).
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <Textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Ex: nota da redação divergente da planilha oficial"
                            className="rounded-xl mt-2"
                          />
                          <AlertDialogFooter className="gap-3 mt-6">
                            <AlertDialogCancel onClick={() => setRejectReason("")} className="rounded-xl font-bold border-none bg-muted/30 h-12">Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDecision(entry, "reject", rejectReason)}
                              className="rounded-xl font-black bg-red-600 hover:bg-red-700 text-white h-12 px-8"
                            >
                              Rejeitar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <Button
                        onClick={() => handleDecision(entry, "approve")}
                        disabled={busyId === entry.id}
                        className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase rounded-xl shadow-lg"
                      >
                        {busyId === entry.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-2" />}
                        Aprovar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
