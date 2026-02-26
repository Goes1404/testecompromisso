
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
  Trash2
} from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import Link from "next/link";

export default function AdminStudentsPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [newCohort, setNewCohort] = useState({ name: "", description: "" });

  async function fetchCohorts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) setCohorts(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchCohorts();
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

      // Log de Auditoria
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
      toast({ title: "Turma Criada!", description: "O novo cohort já está disponível para matrícula." });
    } catch (e: any) {
      toast({ title: "Erro ao criar", description: e.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCohort = async (id: string) => {
    const { error } = await supabase.from('classes').delete().eq('id', id);
    if (!error) {
      setCohorts(cohorts.filter(c => c.id !== id));
      toast({ title: "Turma removida." });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-primary italic leading-none">Gestão de Cohorts</h1>
          <p className="text-muted-foreground font-medium italic">Administração de turmas e matrículas estratégicas.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl md:rounded-2xl h-14 bg-accent text-accent-foreground font-black px-8 shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3">
              <Users className="h-5 w-5" />
              <span>Criar Nova Turma</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2.5rem] p-10 bg-white max-w-lg border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black italic text-primary">Configurar Turma</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase opacity-40 ml-2">Identificação da Turma</Label>
                <Input 
                  placeholder="Ex: Turma A - Engenharia 2024" 
                  value={newCohort.name} 
                  onChange={(e) => setNewCohort({...newCohort, name: e.target.value})} 
                  className="h-14 rounded-xl bg-muted/30 border-none font-bold italic"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase opacity-40 ml-2">Descrição / Meta Pedagógica</Label>
                <Input 
                  placeholder="Ex: Reforço focado em FATEC e ETEC" 
                  value={newCohort.description} 
                  onChange={(e) => setNewCohort({...newCohort, description: e.target.value})} 
                  className="h-14 rounded-xl bg-muted/30 border-none font-medium italic"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateCohort} disabled={isSubmitting || !newCohort.name.trim()} className="w-full h-16 bg-primary text-white font-black text-lg rounded-2xl shadow-xl">
                {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <PlusCircle className="h-6 w-6 mr-2" />}
                Registrar Turma
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
            <Card key={cohort.id} className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden group hover:shadow-2xl transition-all relative">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div className="p-4 rounded-2xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                    <GraduationCap className="h-8 w-8" />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteCohort(cohort.id)} className="h-8 w-8 rounded-full text-muted-foreground hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-6 space-y-2">
                  <p className="text-xl font-black text-primary italic leading-none group-hover:text-accent transition-colors">{cohort.name}</p>
                  <p className="text-[10px] text-muted-foreground font-medium italic line-clamp-1">{cohort.description || "Sem descrição disponível."}</p>
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-muted/10">
                    <Badge variant="secondary" className="bg-green-100 text-green-700 font-black text-[8px] px-3">ATIVO</Badge>
                    <Button variant="ghost" size="sm" className="h-8 rounded-lg font-bold text-accent hover:bg-accent/5 px-3">
                      Visualizar <ArrowUpRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card className="border-none shadow-2xl rounded-3xl bg-white overflow-hidden">
        <CardHeader className="p-8 border-b border-muted/10 flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-black text-primary italic">Lista Mestra de Alunos</CardTitle>
          <div className="relative w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
            <Input 
              placeholder="Pesquisar aluno..." 
              className="pl-10 h-11 bg-muted/30 border-none rounded-xl font-medium italic"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-muted/5">
              <TableRow className="border-none h-16">
                <TableHead className="px-8 font-black uppercase text-[10px] tracking-widest text-primary/40">Estudante</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/40">Turma Vinculada</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/40">Engajamento</TableHead>
                <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest text-primary/40">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { name: "Ana Beatriz", cohort: "Turma A", engagement: "92%", status: "high" },
                { name: "Marcos Silva", cohort: "Pendente", engagement: "45%", status: "low" },
                { name: "Julia Costa", cohort: "Turma A", engagement: "78%", status: "medium" },
              ].map((student, i) => (
                <TableRow key={i} className="border-b last:border-0 hover:bg-accent/5 transition-colors group h-20">
                  <TableCell className="px-8">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center font-black italic shadow-md">{student.name.charAt(0)}</div>
                      <span className="font-black text-primary text-sm italic">{student.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-bold text-muted-foreground italic">{student.cohort}</TableCell>
                  <TableCell>
                    <Badge className={`border-none font-black text-[8px] uppercase px-3 ${student.status === 'high' ? 'bg-green-100 text-green-700' : student.status === 'low' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {student.engagement}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right px-8">
                    <Button variant="ghost" size="icon" className="rounded-xl text-accent hover:bg-accent/10"><Send className="h-4 w-4" /></Button>
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
