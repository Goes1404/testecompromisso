
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Search, 
  Send, 
  Loader2, 
  Users,
  GraduationCap,
  ArrowUpRight,
  PlusCircle,
  Database,
  Star,
  Filter
} from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";

export default function AdminStudentsPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [newCohort, setNewCohort] = useState({ name: "", description: "" });

  async function fetchData() {
    setLoading(true);
    try {
      const { data: subjectData } = await supabase.from('subjects').select('name').order('name');
      if (subjectData) setSubjects(subjectData);

      const { data: classData } = await supabase
        .from('classes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (classData) setCohorts(classData);

      const { data: studentData } = await supabase
        .from('profiles')
        .select(`
          id, 
          name, 
          email, 
          profile_type, 
          class_id,
          favorite_subject,
          classes (name)
        `)
        .neq('profile_type', 'teacher')
        .neq('profile_type', 'admin')
        .order('name');

      const { data: progressData } = await supabase
        .from('user_progress')
        .select('user_id, percentage');

      if (studentData) {
        const mapped = studentData.map(s => {
          const userProgress = progressData?.filter(p => p.user_id === s.id) || [];
          const avgProgress = userProgress.length > 0 
            ? Math.round(userProgress.reduce((acc, curr) => acc + curr.percentage, 0) / userProgress.length)
            : 0;
          
          return {
            ...s,
            engagement: `${avgProgress}%`,
            cohort: (s.classes as any)?.name || 'Pendente',
            status: avgProgress > 70 ? 'high' : avgProgress > 30 ? 'medium' : 'low'
          };
        });
        setStudents(mapped);
      }

    } catch (e) {
      console.error("Erro buscar alunos:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCohort = async () => {
    if (!newCohort.name.trim() || !user) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('classes')
        .insert([{
          name: newCohort.name,
          description: newCohort.description,
          coordinator_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      await supabase.from('activity_logs').insert({
        user_id: user.id,
        user_name: profile?.name || user.email,
        action: `Criou a Turma: ${newCohort.name}`,
        entity_type: 'class',
        entity_id: data.id
      });

      setCohorts([data, ...cohorts]);
      setIsCreateOpen(false);
      setNewCohort({ name: "", description: "" });
      toast({ title: "Turma Criada!" });
    } catch (e: any) {
      toast({ title: "Erro ao criar", description: e.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = subjectFilter === "all" || s.favorite_subject === subjectFilter;
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-primary italic leading-none">Gestão de Cohorts</h1>
          <p className="text-muted-foreground font-medium italic">Administração de turmas e matrículas estratégicas.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl h-14 bg-accent text-accent-foreground font-black px-8 shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3">
              <Users className="h-5 w-5" />
              <span>Criar Nova Turma</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2.5rem] p-10 bg-white max-w-lg border-none shadow-2xl">
            <DialogHeader><DialogTitle className="text-2xl font-black italic text-primary">Configurar Turma</DialogTitle></DialogHeader>
            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase opacity-40 ml-2">Identificação</Label>
                <Input value={newCohort.name} onChange={(e) => setNewCohort({...newCohort, name: e.target.value})} className="h-14 rounded-xl bg-muted/30 border-none font-bold italic" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase opacity-40 ml-2">Meta Pedagógica</Label>
                <Input value={newCohort.description} onChange={(e) => setNewCohort({...newCohort, description: e.target.value})} className="h-14 rounded-xl bg-muted/30 border-none font-medium italic" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateCohort} disabled={isSubmitting} className="w-full h-16 bg-primary text-white font-black rounded-2xl shadow-xl">
                {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : "Registrar Turma"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-10 flex justify-center"><Loader2 className="animate-spin h-10 w-10 text-accent" /></div>
        ) : cohorts.length === 0 ? (
          <div className="col-span-full py-20 text-center border-4 border-dashed rounded-[3rem] opacity-30">
            <Database className="h-12 w-12 mx-auto mb-4" />
            <p className="font-black italic">Nenhuma turma cadastrada</p>
          </div>
        ) : (
          cohorts.map((cohort) => (
            <Card key={cohort.id} className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden group hover:shadow-2xl transition-all">
              <CardContent className="p-8">
                <div className="p-4 w-fit rounded-2xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                  <GraduationCap className="h-8 w-8" />
                </div>
                <div className="mt-6 space-y-2">
                  <p className="text-xl font-black text-primary italic leading-none group-hover:text-accent transition-colors">{cohort.name}</p>
                  <p className="text-[10px] text-muted-foreground font-medium italic line-clamp-1">{cohort.description || "Sem descrição."}</p>
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-muted/10">
                    <Badge variant="secondary" className="bg-green-100 text-green-700 font-black text-[8px] px-3">ATIVO</Badge>
                    <Button variant="ghost" size="sm" className="h-8 rounded-lg font-bold text-accent px-3">Visualizar <ArrowUpRight className="h-3 w-3 ml-1" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card className="border-none shadow-2xl rounded-3xl bg-white overflow-hidden">
        <CardHeader className="p-8 border-b border-muted/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-xl font-black text-primary italic">Lista Mestra de Alunos ({filteredStudents.length})</CardTitle>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-40 h-11 bg-muted/30 border-none rounded-xl font-bold">
                <Filter className="h-3 w-3 mr-2 opacity-40" />
                <SelectValue placeholder="Matéria" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-2xl max-h-60">
                <SelectItem value="all" className="font-bold">Todos</SelectItem>
                {subjects.map(s => <SelectItem key={s.name} value={s.name} className="font-bold">{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative w-64 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-accent" />
              <Input placeholder="Pesquisar..." className="pl-10 h-11 bg-muted/30 border-none rounded-xl font-medium italic" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-muted/5">
              <TableRow className="border-none h-16">
                <TableHead className="px-8 font-black uppercase text-[10px] tracking-widest text-primary/40">Estudante</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/40">Interesse</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/40">Turma</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/40">Engajamento</TableHead>
                <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest text-primary/40">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id} className="border-b last:border-0 hover:bg-accent/5 transition-colors group h-20">
                  <TableCell className="px-8">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center font-black italic shadow-md">{student.name?.charAt(0)}</div>
                      <div className="flex flex-col">
                        <span className="font-black text-primary text-sm italic">{student.name}</span>
                        <span className="text-[8px] font-black uppercase opacity-40">{student.profile_type}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {student.favorite_subject ? (
                      <Badge className="bg-accent/10 text-accent border-none font-black text-[8px] uppercase px-3 flex items-center gap-1.5 w-fit">
                        <Star className="h-2.5 w-2.5 fill-accent" /> {student.favorite_subject}
                      </Badge>
                    ) : <span className="text-[10px] opacity-20 italic">Não definido</span>}
                  </TableCell>
                  <TableCell className="text-xs font-bold text-muted-foreground italic">{student.cohort}</TableCell>
                  <TableCell>
                    <Badge className={`border-none font-black text-[8px] uppercase px-3 ${student.status === 'high' ? 'bg-green-100 text-green-700' : student.status === 'low' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {student.engagement}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right px-8">
                    <Button variant="ghost" size="icon" className="rounded-xl text-accent" asChild>
                      <Link href={`/dashboard/chat/${student.id}`}><Send className="h-4 w-4" /></Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
