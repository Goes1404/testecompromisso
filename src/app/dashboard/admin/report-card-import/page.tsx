"use client";

import { useCallback, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle,
  Loader2, ArrowRight, RotateCcw, Users, GraduationCap, ChevronRight, FileCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import Link from "next/link";
import type { ReportCardImportRow, ReportCardMatchResult, ReportCardPreviewResponse, ReportCardApplyResponse, ReportCardTrack } from "@/app/api/admin/report-card-import/route";
import { parseReportCardSheet, templateColumns } from "./report-card-import-lib";

type Step = "upload" | "preview" | "done";

export default function ReportCardImportPage() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [track, setTrack] = useState<ReportCardTrack>("enem");
  const [subtrack, setSubtrack] = useState<ReportCardTrack>("etec");
  const [semester, setSemester] = useState<1 | 2>(1);

  const [step, setStep] = useState<Step>("upload");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ReportCardImportRow[]>([]);
  const [matches, setMatches] = useState<ReportCardMatchResult[]>([]);
  const [result, setResult] = useState<ReportCardApplyResponse | null>(null);

  const reset = () => {
    setStep("upload");
    setRows([]);
    setMatches([]);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const parseExcel = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        const parsed = parseReportCardSheet(raw, track);
        if (parsed.length === 0) {
          toast({ title: "Planilha vazia ou sem coluna de nome reconhecida", variant: "destructive" });
          return;
        }
        setRows(parsed);
        toast({ title: `${parsed.length} alunos carregados da planilha`, description: "Clique em Verificar para continuar." });
      } catch {
        toast({ title: "Erro ao ler planilha", variant: "destructive" });
      }
    };
    reader.readAsBinaryString(file);
  }, [toast, track]);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) parseExcel(file);
  }, [parseExcel]);

  const handlePreview = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/report-card-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview", rows, track }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: ReportCardPreviewResponse = await res.json();
      setMatches(data.matches);
      setStep("preview");
    } catch (err: any) {
      toast({ title: "Erro ao verificar", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/report-card-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply", matches, track, subtrack, semester }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: ReportCardApplyResponse = await res.json();
      setResult(data);
      setStep("done");
      toast({ title: `✅ ${data.imported + data.updated} boletins enviados para aprovação!` });
    } catch (err: any) {
      toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const highCount = matches.filter((m) => m.confidence === "high").length;
  const lowCount = matches.filter((m) => m.confidence === "low").length;
  const noneCount = matches.filter((m) => m.confidence === "none").length;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 px-1">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-primary italic leading-none">Importar Boletim</h1>
          <p className="text-muted-foreground font-medium italic text-sm">
            Carregue a planilha de notas. Os boletins entram como <strong>pendentes</strong> e só
            ficam visíveis ao aluno depois de aprovados em Boletins Pendentes.
          </p>
        </div>
        <Button variant="outline" asChild className="rounded-xl font-black text-xs uppercase border-slate-200 shrink-0">
          <Link href="/dashboard/admin/report-card-approvals">
            <FileCheck className="h-4 w-4 mr-2" /> Ver Boletins Pendentes
          </Link>
        </Button>
      </div>

      {step === "upload" && (
        <div className="space-y-6">
          {/* Configuração do lote */}
          <Card className="border-none shadow-sm rounded-2xl bg-slate-50">
            <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vestibulinho</p>
                <div className="flex rounded-xl border border-slate-200 bg-white p-1">
                  {(["enem", "etec"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setTrack(t); setRows([]); }}
                      className={`flex-1 rounded-lg px-3 py-2 text-xs font-black uppercase transition-all ${track === t ? "bg-primary text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}
                    >
                      {t === "enem" ? "ENEM" : "ETEC"}
                    </button>
                  ))}
                </div>
              </div>

              {track === "etec" && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Formato da Redação</p>
                  <div className="flex rounded-xl border border-slate-200 bg-white p-1">
                    {(["etec", "enem"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSubtrack(t)}
                        className={`flex-1 rounded-lg px-3 py-2 text-[11px] font-black uppercase transition-all ${subtrack === t ? "bg-primary text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}
                      >
                        {t === "enem" ? "Com redação" : "Sem redação"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Semestre</p>
                <div className="flex rounded-xl border border-slate-200 bg-white p-1">
                  {([1, 2] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSemester(s)}
                      className={`flex-1 rounded-lg px-3 py-2 text-xs font-black uppercase transition-all ${semester === s ? "bg-primary text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}
                    >
                      {s}º Semestre
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Drop zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-primary/30 hover:border-primary/60 bg-primary/2 hover:bg-primary/5 rounded-[2.5rem] p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all group"
          >
            <div className="h-16 w-16 rounded-2xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-black text-primary italic text-lg">Arraste o arquivo Excel aqui</p>
              <p className="text-sm font-medium text-muted-foreground mt-1">
                ou clique para selecionar · .xlsx / .xls
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) parseExcel(e.target.files[0]); }}
            />
          </div>

          {/* Formato esperado */}
          <Card className="border-none shadow-sm rounded-2xl bg-slate-50">
            <CardContent className="p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Colunas Reconhecidas ({track === "enem" ? "ENEM" : "ETEC"})</p>
              <div className="flex flex-wrap gap-2">
                {templateColumns(track).map((h) => (
                  <span key={h} className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 rounded-lg px-2.5 py-1">{h}</span>
                ))}
              </div>
              <p className="text-[11px] font-medium text-slate-400 mt-3">
                A primeira linha precisa ser o cabeçalho. Colunas não reconhecidas ficam em branco no boletim.
              </p>
            </CardContent>
          </Card>

          {rows.length > 0 && (
            <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-black text-primary italic">{rows.length} alunos carregados</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Prontos para verificação</p>
                </div>
              </div>
              <Button
                onClick={handlePreview}
                disabled={loading}
                className="h-11 px-6 bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase rounded-xl shadow-lg shadow-primary/30"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                Verificar Correspondências
              </Button>
            </div>
          )}
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-2xl font-black text-emerald-700 leading-none">{highCount}</p>
                <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-wide mt-0.5">Match certeiro</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-2xl font-black text-amber-700 leading-none">{lowCount}</p>
                <p className="text-[10px] font-bold text-amber-600/70 uppercase tracking-wide mt-0.5">Match parcial</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl">
              <XCircle className="h-5 w-5 text-red-600 shrink-0" />
              <div>
                <p className="text-2xl font-black text-red-700 leading-none">{noneCount}</p>
                <p className="text-[10px] font-bold text-red-600/70 uppercase tracking-wide mt-0.5">Não encontrado</p>
              </div>
            </div>
          </div>

          <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr className="h-11">
                      {["Planilha", "Aluno no Sistema", "Classificatória", "Redação", "Status"].map((h) => (
                        <th key={h} className="px-4 text-left font-black text-[10px] uppercase tracking-widest text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((m, i) => (
                      <tr key={i} className={`h-14 border-b border-slate-50 last:border-0 ${
                        m.confidence === "none" ? "bg-red-50/40" :
                        m.confidence === "low" ? "bg-amber-50/40" : ""
                      }`}>
                        <td className="px-4">
                          <p className="font-bold text-sm text-slate-800 truncate max-w-[200px]">{m.row.name}</p>
                        </td>
                        <td className="px-4">
                          {m.profileName ? (
                            <p className="font-semibold text-sm text-slate-600 truncate max-w-[200px] italic">{m.profileName}</p>
                          ) : (
                            <span className="text-xs font-bold text-red-400 italic">Não encontrado</span>
                          )}
                        </td>
                        <td className="px-4">
                          <Badge className="font-black bg-primary/10 text-primary border-none text-xs">
                            {m.row.classificatoria_score ?? "--"}{m.row.classificatoria_max ? `/${m.row.classificatoria_max}` : ""}
                          </Badge>
                        </td>
                        <td className="px-4">
                          <span className="text-xs font-bold text-slate-500">{m.row.redacao_score ?? "--"}</span>
                        </td>
                        <td className="px-4">
                          {m.confidence === "high" && <Badge className="bg-emerald-100 text-emerald-700 border-none font-bold text-[9px] uppercase">✓ Confirmado</Badge>}
                          {m.confidence === "low" && <Badge className="bg-amber-100 text-amber-700 border-none font-bold text-[9px] uppercase">⚠ Parcial</Badge>}
                          {m.confidence === "none" && <Badge className="bg-red-100 text-red-700 border-none font-bold text-[9px] uppercase">✗ Ignorado</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {noneCount > 0 && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p className="text-xs font-bold">
                {noneCount} aluno(s) não foram encontrados no sistema e serão ignorados.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={reset} className="h-12 px-6 rounded-xl font-black text-xs uppercase border-slate-200">
              <RotateCcw className="h-4 w-4 mr-2" /> Recomeçar
            </Button>
            <Button
              onClick={handleApply}
              disabled={loading || highCount + lowCount === 0}
              className="flex-1 h-12 bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase rounded-xl shadow-lg shadow-primary/30"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
              Enviar {highCount + lowCount} Boletins para Aprovação
            </Button>
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div className="space-y-5">
          <div className="relative bg-[#0d0d0f] rounded-[2.5rem] p-8 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 30% 50%, rgba(255,107,0,0.25) 0%, transparent 65%)" }} />
            <div className="relative z-10 flex items-center gap-5">
              <div className="h-16 w-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Importação Concluída</p>
                <h2 className="text-3xl font-black italic text-white leading-none">
                  {result.imported + result.updated} <span className="text-primary">boletins</span> pendentes
                </h2>
                <p className="text-sm font-medium text-white/60 mt-1">
                  {result.imported} novos · {result.updated} atualizados · {result.skipped} ignorados · {result.errors.length} erros
                </p>
              </div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <Card className="border-none shadow-sm rounded-2xl bg-red-50 border border-red-100">
              <CardContent className="p-5 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-400">Erros</p>
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs font-medium text-red-700">{e}</p>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <p className="font-black text-emerald-700">Próximo passo</p>
            </div>
            <p className="ml-7 text-xs text-emerald-700 font-medium">
              Os boletins ficam pendentes até serem revisados. Acesse{" "}
              <Link href="/dashboard/admin/report-card-approvals" className="underline font-bold">Boletins Pendentes</Link>{" "}
              para aprovar ou rejeitar antes que fiquem visíveis aos alunos.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={reset} variant="outline" className="h-12 px-8 rounded-xl font-black text-xs uppercase border-slate-200">
              <Upload className="h-4 w-4 mr-2" /> Importar Outra Planilha
            </Button>
            <Button asChild className="h-12 px-8 rounded-xl font-black text-xs uppercase bg-primary text-white shadow-lg shadow-primary/30">
              <Link href="/dashboard/admin/report-card-approvals">
                <FileCheck className="h-4 w-4 mr-2" /> Ir para Boletins Pendentes
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
