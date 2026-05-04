
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  AlertCircle, 
  UserCircle, 
  Send, 
  ShieldCheck, 
  Loader2, 
  Mail,
  ArrowUpRight,
  Filter,
  Clock
} from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";
import { formatDistanceToNow, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

export default function TeacherStudentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "at_risk" | "financial_aid" | "etec" | "enem">("all");
  const [filterInstitution, setFilterInstitution] = useState<string>("all");
  const [filterCourse, setFilterCourse] = useState<string>("all");
  const [displayCount, setDisplayCount] = useState(50);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStudents() {
      if (!user) return;
      setLoading(true);
      try {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'student')
          .order('name')
          .limit(5000);

        if (error) throw error;

        const studentProfiles = profiles || [];

        const { data: progressData } = await supabase
          .from('user_progress')
          .select('user_id, percentage');

        const mapped = studentProfiles.map(s => {
          const userProg = progressData?.filter(p => p.user_id === s.id) || [];
          const avg = userProg.length > 0 
            ? Math.round(userProg.reduce((acc, curr) => acc + curr.percentage, 0) / userProg.length)
            : 0;
          
          return { ...s, progress: avg };
        });

        setStudents(mapped);
      } catch (err: any) {
        toast({ title: "Falha na Sincronização", description: err.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, [user, toast]);

  const filteredStudents = students.filter(student => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (student.name || '').toLowerCase().includes(searchLower) || 
      (student.email || '').toLowerCase().includes(searchLower) ||
      (student.institution || '').toLowerCase().includes(searchLower);
    
    const matchesInstitution = filterInstitution === "all" || student.institution === filterInstitution;
    const matchesCourse = filterCourse === "all" || student.course === filterCourse;

    const baseMatches = matchesSearch && matchesInstitution && matchesCourse;
    
    if (activeFilter === "at_risk") {
      const sevenDaysAgo = subDays(new Date(), 7);
      const isInactive = !student.last_access || new Date(student.last_access) < sevenDaysAgo;
      return baseMatches && isInactive;
    }
    if (activeFilter === "financial_aid") {
      return baseMatches && student.is_financial_aid_eligible === true;
    }
    if (activeFilter === "etec") {
      return baseMatches && (student.exam_target || '').toLowerCase().includes('etec');
    }
    if (activeFilter === "enem") {
      return baseMatches && (student.exam_target || '').toLowerCase().includes('enem');
    }
    return baseMatches;
  });

  const institutions = Array.from(new Set(students.map(s => s.institution).filter(Boolean)));
  const courses = Array.from(new Set(students.map(s => s.course).filter(Boolean)));

  const formatTime = (seconds: number) => {
    if (!seconds) return "0h";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 px-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-primary italic leading-none uppercase tracking-tighter">Gestão de Rede</h1>
          <p className="text-muted-foreground font-medium text-lg italic">Monitoramento estratégico do corpo discente em tempo real.</p>
        </div>
        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
          <Input 
            placeholder="Pesquisar por nome, email ou polo..." 
            className="pl-12 h-14 bg-white border-none shadow-xl rounded-2xl italic font-medium focus-visible:ring-accent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-primary/40 ml-2">Filtrar por Instituição/Escola</label>
            <Select value={filterInstitution} onValueChange={setFilterInstitution}>
                <SelectTrigger className="h-12 rounded-xl bg-white border-none shadow-md font-bold italic">
                    <SelectValue placeholder="Todas as Instituições" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl">
                    <SelectItem value="all">Todas as Instituições</SelectItem>
                    {institutions.map(inst => (
                        <SelectItem key={inst as string} value={inst as string}>{inst as string}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-primary/40 ml-2">Filtrar por Carreira/Curso</label>
            <Select value={filterCourse} onValueChange={setFilterCourse}>
                <SelectTrigger className="h-12 rounded-xl bg-white border-none shadow-md font-bold italic">
                    <SelectValue placeholder="Todas as Carreiras" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl">
                    <SelectItem value="all">Todas as Carreiras</SelectItem>
                    {courses.map(c => (
                        <SelectItem key={c as string} value={c as string}>{c as string}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={() => setActiveFilter("all")} variant={activeFilter === "all" ? "default" : "outline"} className={`h-12 md:h-16 flex-1 min-w-[140px] rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-lg transition-all ${activeFilter === 'all' ? 'bg-primary scale-105 shadow-primary/20' : 'bg-white border-none'}`}>
          <UserCircle className="h-5 w-5 md:mr-2" /> <span className="hidden md:inline">Total Rede ({students.length})</span>
        </Button>
        <Button onClick={() => setActiveFilter("etec")} variant={activeFilter === "etec" ? "default" : "outline"} className={`h-12 md:h-16 flex-1 min-w-[140px] rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-lg transition-all ${activeFilter === 'etec' ? 'bg-indigo-600 scale-105 text-white' : 'bg-white text-indigo-600 border-none'}`}>
          <Filter className="h-5 w-5 md:mr-2" /> Turma ETEC
        </Button>
        <Button onClick={() => setActiveFilter("enem")} variant={activeFilter === "enem" ? "default" : "outline"} className={`h-12 md:h-16 flex-1 min-w-[140px] rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-lg transition-all ${activeFilter === 'enem' ? 'bg-purple-600 scale-105 text-white' : 'bg-white text-purple-600 border-none'}`}>
          <Filter className="h-5 w-5 md:mr-2" /> Turma ENEM
        </Button>
        <Button onClick={() => setActiveFilter("at_risk")} variant={activeFilter === "at_risk" ? "default" : "outline"} className={`h-12 md:h-16 flex-1 min-w-[140px] rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-lg transition-all ${activeFilter === 'at_risk' ? 'bg-red-600 scale-105 text-white' : 'bg-white text-red-600 border-none'}`}>
          <AlertCircle className="h-5 w-5 md:mr-2" /> Alunos em Risco
        </Button>
        <Button onClick={() => setActiveFilter("financial_aid")} variant={activeFilter === "financial_aid" ? "default" : "outline"} className={`h-12 md:h-16 flex-1 min-w-[140px] rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-lg transition-all ${activeFilter === 'financial_aid' ? 'bg-green-600 scale-105 text-white' : 'bg-white text-green-600 border-none'}`}>
          <ShieldCheck className="h-5 w-5 md:mr-2" /> Isenção Social
        </Button>
      </div>

      <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin h-12 w-12 text-accent" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Sincronizando Banco de Identidades...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 border-b border-muted/10">
                  <TableRow className="border-none h-16">
                    <TableHead className="px-8 font-black uppercase text-[10px] tracking-widest text-primary/40">Estudante</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/40">Instituição / Polo</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/40">Último Acesso</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/40">Tempo na Platforma</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/40">Evolução</TableHead>
                    <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest text-primary/40">Ações de Apoio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.slice(0, displayCount).map((student) => {
                    const isInactive = !student.last_access || new Date(student.last_access) < subDays(new Date(), 7);
                    
                    return (
                      <TableRow key={student.id} className="border-b last:border-0 hover:bg-accent/5 transition-all group h-24">
                        <TableCell className="px-8">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center font-black italic shadow-lg group-hover:scale-110 transition-transform">
                              {(student.name || 'A').charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-black text-primary text-sm italic">{student.name}</span>
                              <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                                @{student.username || 'aluno'}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-black text-primary/70">{student.institution || 'Não Informado'}</span>
                            <Badge className="w-fit bg-primary/5 text-primary border-none text-[7px] font-black uppercase px-2">
                              {student.exam_target || 'student'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <Badge className={`border-none font-black text-[8px] uppercase h-6 px-3 w-fit ${isInactive ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {isInactive ? 'Risco Detectado' : 'Ativo'}
                            </Badge>
                            <span className="text-[9px] font-bold text-muted-foreground mt-1 px-1">
                              {student.last_access 
                                ? formatDistanceToNow(new Date(student.last_access), { addSuffix: true, locale: ptBR })
                                : 'Nunca acessou'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-accent opacity-40" />
                            <span className="text-sm font-black text-primary italic">
                              {formatTime(student.total_time_spent)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="w-24 space-y-1.5">
                            <div className="flex justify-between text-[8px] font-black text-primary/40 uppercase">
                              <span>Progresso</span>
                              <span>{student.progress}%</span>
                            </div>
                            <Progress value={student.progress} className="h-1.5 w-full bg-slate-100" />
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-8">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 text-accent hover:bg-accent/10" asChild title="Abrir Chat">
                              <Link href={`/dashboard/chat/${student.id}`}><Send className="h-4 w-4" /></Link>
                            </Button>
                            <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 text-primary hover:bg-primary/5" asChild title="Ver Analíticos">
                              <Link href={`/dashboard/teacher/analytics?user=${student.id}`}><ArrowUpRight className="h-4 w-4" /></Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              
              {displayCount < filteredStudents.length && (
                <div className="p-12 flex justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => setDisplayCount(prev => prev + 100)}
                    className="rounded-[2rem] border-dashed border-primary/20 font-black italic px-16 hover:bg-primary/5 h-16 shadow-xl"
                  >
                    Carregar Mais Alunos (+100)
                  </Button>
                </div>
              )}
            </div>
          )}

          {!loading && filteredStudents.length === 0 && (
            <div className="py-32 text-center border-4 border-dashed rounded-[3rem] m-8 opacity-20">
              <UserCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="font-black italic text-xl text-primary uppercase tracking-widest">Nenhum registro localizado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
