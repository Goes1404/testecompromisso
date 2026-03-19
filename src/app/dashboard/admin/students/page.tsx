
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
  Trash2,
  Settings2,
  Building2,
  X,
  Sparkles,
  MapPin,
  Layers,
  ExternalLink,
  GitMerge
} from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
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

export default function AdminStudentsPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [poloForums, setPoloForums] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [newCohort, setNewCohort] = useState({ name: "", description: "" });
  
  const [sourceCohortId, setSourceCohortId] = useState<string>("");
  const [destCohortId, setDestCohortId] = useState<string>("");

  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null);
  const [selectedPoloName, setSelectedPoloName] = useState<string | null>(null);

  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [newInstitution, setNewInstitution] = useState("");

  async function fetchData() {
    setLoading(true);
    try {
      const { data: classData } = await supabase
        .from('classes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (classData) setCohorts(classData);

      const { data: forumsData } = await supabase
        .from('forums')
        .select('*')
        .eq('category', 'Polos')
        .order('name');
      
      if (forumsData) setPoloForums(forumsData);

      const { data: allProfiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .order('name');

      if (pError) throw pError;

      const studentKeywords = ['etec', 'uni', 'enem', 'cpop', 'student', 'aluno'];
      const studentProfiles = allProfiles?.filter(p => {
        const type = (p.profile_type || '').toLowerCase().trim();
        return studentKeywords.some(key => type.includes(key)) || type === '';
      }) || [];

      const { data: progressData } = await supabase
        .from('user_progress')
        .select('user_id, percentage');

      const mapped = studentProfiles.map(s => {
        const userProgress = progressData?.filter(p => p.user_id === s.id) || [];
        const avgProgress = userProgress.length > 0 
          ? Math.round(userProgress.reduce((acc, curr) => acc + curr.percentage, 0) / userProgress.length)
          : 0;
        
        const cohort = cohorts.find(c => c.id === s.class_id)?.name || 'Pendente';
        
        return {
          ...s,
          engagement: `${avgProgress}%`,
          cohort,
          status: avgProgress > 70 ? 'high' : avgProgress > 30 ? 'medium' : 'low'
        };
      });
      setStudents(mapped);

    } catch (e) {
      console.error("Erro buscar alunos:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [user]);

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
        user_name: profile?.name || 'Administrador',
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

  const handleMergeCohorts = async () => {
    if (!sourceCohortId || !destCohortId || sourceCohortId === destCohortId || !user) {
      toast({ title: "Seleção Inválida", description: "Selecione duas turmas diferentes.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: moveError } = await supabase
        .from('profiles')
        .update({ class_id: destCohortId })
        .eq('class_id', sourceCohortId);

      if (moveError) throw moveError;

      const sourceName = cohorts.find(c => c.id === sourceCohortId)?.name;
      const destName = cohorts.find(c => c.id === destCohortId)?.name;

      const { error: deleteError } = await supabase
        .from('classes')
        .delete()
        .eq('id', sourceCohortId);

      if (deleteError) throw deleteError;

      await supabase.from('activity_logs').insert({
        user_id: user.id,
        user_name: profile?.name || 'Administrador',
        action: `Mesclou a turma ${sourceName} na turma ${destName}`,
        entity_type: 'class_merge'
      });

      toast({ title: "Turmas Mescladas!", description: `Todos os alunos de ${sourceName} agora pertencem a ${destName}.` });
      
      setIsMergeOpen(false);
      setSourceCohortId("");
      setDestCohortId("");
      fetchData();
    } catch (e: any) {
      toast({ title: "Falha na Mesclagem", description: e.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStudentForum = async () => {
    const institutionClean = newInstitution.trim();
    if (!editingStudent || !institutionClean) return;
    
    setIsSubmitting(true);
    try {
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ institution: institutionClean })
        .eq('id', editingStudent.id);

      if (profileErr) throw profileErr;

      const forumName = `Comunidade: ${institutionClean}`;
      
      const { data: existingForum } = await supabase
        .from('forums')
        .select('id')
        .ilike('name', forumName)
        .maybeSingle();

      if (!existingForum) {
        await supabase.from('forums').insert({
          name: forumName,
          description: `Espaço oficial de debate e avisos para a unidade: ${institutionClean}.`,
          category: "Polos",
          author_id: user?.id,
          author_name: "Gabinete de Gestão",
          is_teacher_only: false
        });
      }

      toast({ 
        title: "Unidade Atualizada!", 
        description: `${editingStudent.name} foi movido para o Polo ${institutionClean}.` 
      });
      
      setEditingStudent(null);
      fetchData();
    } catch (e: any) {
      toast({ title: "Erro ao transferir", description: e.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;

      await supabase.from('activity_logs').insert({
        user_id: user?.id,
        user_name: profile?.name || 'Administrador',
        action: `Removeu o estudante ${name} da rede.`,
        entity_type: 'user',
        entity_id: id
      });

      setStudents(prev => prev.filter(s => s.id !== id));
      toast({ title: "Registro Removido" });
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCohort = !selectedCohortId || s.class_id === selectedCohortId;
    const matchesPolo = !selectedPoloName || (s.institution || '').toLowerCase().includes(selectedPoloName.toLowerCase());
    return matchesSearch && matchesCohort && matchesPolo;
  });

  const clearFilters = () => {
    setSelectedCohortId(null);
    setSelectedPoloName(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 px-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-primary italic leading-none">Gestão de Turmas & Comunidades</h1>
          <p className="text-muted-foreground font-medium italic">Administração centralizada de Cohorts acadêmicos e Polos regionais.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {(selectedCohortId || selectedPoloName) && (
            <Button variant="ghost" onClick={clearFilters} className="h-14 rounded-2xl font-black text-red-500 uppercase text-[10px] gap-2">
              <X className="h-4 w-4" /> Limpar Filtros
            </Button>
          )}

          <Dialog open={isMergeOpen} onOpenChange={setIsMergeOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-2xl h-14 border-dashed border-primary/20 text-primary font-black px-6 hover:bg-primary/5 transition-all flex items-center justify-center gap-3">
                <GitMerge className="h-5 w-5 text-accent" />
                <span>Mesclar Turmas</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] p-10 bg-white max-w-lg border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black italic text-primary">Mesclar Cohorts</DialogTitle>
                <DialogDescription className="italic">Isso moverá todos os alunos de uma turma para outra e apagará o registro de origem.</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase opacity-40 ml-2">Turma de Origem (Será removida)</Label>
                  <Select value={sourceCohortId} onValueChange={setSourceCohortId}>
                    <SelectTrigger className="h-14 rounded-xl bg-muted/30 border-none font-bold italic">
                      <SelectValue placeholder="Selecione a origem..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl">
                      {cohorts.map(c => (
                        <SelectItem key={c.id} value={c.id} className="font-bold italic">{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-center">
                  <GitMerge className="h-6 w-6 text-accent animate-pulse" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase opacity-40 ml-2">Turma de Destino (Receberá os alunos)</Label>
                  <Select value={destCohortId} onValueChange={setDestCohortId}>
                    <SelectTrigger className="h-14 rounded-xl bg-muted/30 border-none font-bold italic">
                      <SelectValue placeholder="Selecione o destino..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl">
                      {cohorts.map(c => (
                        <SelectItem key={c.id} value={c.id} className="font-bold italic" disabled={c.id === sourceCohortId}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleMergeCohorts} 
                  disabled={isSubmitting || !sourceCohortId || !destCohortId} 
                  className="w-full h-16 bg-primary text-white font-black rounded-2xl shadow-xl"
                >
                  {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : "Unificar e Sincronizar Alunos"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
                  {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : "Registrar Turma"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <Layers className="h-4 w-4 text-accent" />
          <h2 className="text-[10px] font-black uppercase tracking-widest text-primary/40">Agrupamentos Disponíveis</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            <div className="col-span-full py-10 flex justify-center"><Loader2 className="animate-spin h-10 w-10 text-accent" /></div>
          ) : (
            <>
              {cohorts.map((cohort) => (
                <Card 
                  key={cohort.id} 
                  className={`border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden group hover:shadow-2xl transition-all cursor-pointer ${
                    selectedCohortId === cohort.id ? 'ring-4 ring-primary' : ''
                  }`}
                  onClick={() => { clearFilters(); setSelectedCohortId(cohort.id); }}
                >
                  <CardContent className="p-8">
                    <div className={`p-4 w-fit rounded-2xl transition-all shadow-inner ${
                      selectedCohortId === cohort.id ? 'bg-primary text-white' : 'bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white'
                    }`}>
                      <GraduationCap className="h-6 w-6" />
                    </div>
                    <div className="mt-6 space-y-1">
                      <p className="text-lg font-black text-primary italic leading-none group-hover:text-accent transition-colors">{cohort.name}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">COHORT ACADÊMICO</p>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {poloForums.map((forum) => {
                const poloName = forum.name.replace('Comunidade: ', '');
                return (
                  <Card 
                    key={forum.id} 
                    className={`border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden group hover:shadow-2xl transition-all cursor-pointer ${
                      selectedPoloName === poloName ? 'ring-4 ring-accent' : ''
                    }`}
                    onClick={() => { clearFilters(); setSelectedPoloName(poloName); }}
                  >
                    <CardContent className="p-8">
                      <div className={`p-4 w-fit rounded-2xl transition-all shadow-inner ${
                        selectedPoloName === poloName ? 'bg-accent text-accent-foreground' : 'bg-accent/5 text-accent group-hover:bg-accent group-hover:text-white'
                      }`}>
                        <MapPin className="h-6 w-6" />
                      </div>
                      <div className="mt-6 space-y-1">
                        <p className="text-lg font-black text-primary italic leading-none group-hover:text-accent transition-colors truncate">{poloName}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">COMUNIDADE REGIONAL</p>
                      </div>
                      {selectedPoloName === poloName && (
                        <div className="mt-4 animate-in slide-in-from-top-2">
                          <Button asChild variant="outline" className="w-full h-10 rounded-xl border-accent text-accent font-black text-[10px] uppercase hover:bg-accent hover:text-white transition-all">
                            <Link href={`/dashboard/forum/${forum.id}`}>
                              Entrar no Fórum <ExternalLink className="ml-2 h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      </div>

      <Card className="border-none shadow-2xl rounded-3xl bg-white overflow-hidden">
        <CardHeader className="p-8 border-b border-muted/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-xl font-black text-primary italic">
            Lista Mestra de Alunos ({filteredStudents.length})
            {(selectedCohortId || selectedPoloName) && (
              <Badge className="ml-3 bg-accent text-accent-foreground font-black italic">Visualização Filtrada</Badge>
            )}
          </CardTitle>
          <div className="relative w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-accent" />
            <Input placeholder="Pesquisar..." className="pl-10 h-11 bg-muted/30 border-none rounded-xl font-medium italic" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-muted/5">
              <TableRow className="border-none h-16">
                <TableHead className="px-8 font-black uppercase text-[10px] tracking-widest text-primary/40">Estudante</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/40">Unidade / Fórum</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/40">Turma</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/40">Engajamento</TableHead>
                <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest text-primary/40">Ações de Gestão</TableHead>
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
                    <Badge className="bg-blue-50 text-blue-700 border-none font-black text-[8px] uppercase px-3 flex items-center gap-1.5 w-fit">
                      <Building2 className="h-2.5 w-2.5" /> {student.institution || 'Sem Polo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-bold text-muted-foreground italic">{student.cohort}</TableCell>
                  <TableCell>
                    <Badge className={`border-none font-black text-[8px] uppercase px-3 ${student.status === 'high' ? 'bg-green-100 text-green-700' : student.status === 'low' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {student.engagement}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right px-8">
                    <div className="flex items-center justify-end gap-2">
                      
                      <Dialog open={editingStudent?.id === student.id} onOpenChange={(open) => !open && setEditingStudent(null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-xl text-primary" onClick={() => { setEditingStudent(student); setNewInstitution(student.institution || ""); }}>
                            <Settings2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-[2.5rem] p-10 bg-white max-sm border-none shadow-2xl">
                          <DialogHeader>
                            <DialogTitle className="text-xl font-black italic text-primary">Alterar Polo / Fórum</DialogTitle>
                            <DialogDescription className="text-xs italic">Isso moverá o aluno para a nova comunidade do polo instantaneamente.</DialogDescription>
                          </DialogHeader>
                          <div className="py-6 space-y-4">
                            <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase opacity-40 ml-2">Nova Instituição (Polo)</Label>
                              <Input value={newInstitution} onChange={(e) => setNewInstitution(e.target.value)} placeholder="Ex: ETEC Jorge Street" className="h-14 rounded-xl bg-muted/30 border-none font-bold italic" />
                            </div>
                            <div className="bg-accent/5 p-4 rounded-xl border border-accent/10 flex items-start gap-3">
                              <Sparkles className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                              <p className="text-[10px] font-medium italic text-primary/70 leading-relaxed">
                                A Aurora criará o fórum do polo se ele ainda não existir.
                              </p>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={handleUpdateStudentForum} disabled={isSubmitting} className="w-full h-14 bg-primary text-white font-black rounded-xl shadow-xl">
                              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Transferir e Sincronizar"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Button variant="ghost" size="icon" className="rounded-xl text-accent" asChild>
                        <Link href={`/dashboard/chat/${student.id}`}><Send className="h-4 w-4" /></Link>
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50">
                            {deletingId === student.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-10 max-w-sm">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-2xl font-black italic text-primary">Excluir Registro?</AlertDialogTitle>
                            <AlertDialogDescription className="font-medium text-sm">
                              Esta ação removerá o perfil de <strong className="text-red-600">{student.name}</strong> da rede. Esta ação é irreversível.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="gap-3 mt-6">
                            <AlertDialogCancel className="rounded-xl font-bold border-none bg-muted/30">Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteStudent(student.id, student.name)} 
                              className="rounded-xl font-black bg-red-600 hover:bg-red-700 text-white px-8"
                            >
                              Confirmar Exclusão
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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
