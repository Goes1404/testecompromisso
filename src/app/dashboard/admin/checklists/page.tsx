
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Search, 
  FileCheck, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Send,
  Users
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import Link from "next/link";

interface StudentProgress {
  id: string;
  name: string;
  email: string;
  count: number;
  total: number;
  status: 'low' | 'medium' | 'high';
}

export default function AdminChecklistAuditPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentProgress[]>([]);

  const TOTAL_REQUIRED_DOCS = 12;

  useEffect(() => {
    async function fetchChecklists() {
      setLoading(true);
      try {
        // Busca todos os perfis que não são professores nem admin (pegando todos os tipos de alunos)
        const { data: profiles, error: pError } = await supabase
          .from('profiles')
          .select('id, name, email')
          .not('profile_type', 'in', '("teacher","admin")')
          .order('name');

        if (pError) throw pError;

        const { data: checklists, error: cError } = await supabase
          .from('student_checklists')
          .select('user_id');

        if (cError) throw cError;

        const progressMap = (profiles || []).map(p => {
          const count = (checklists || []).filter(c => c.user_id === p.id).length;
          const percent = (count / TOTAL_REQUIRED_DOCS) * 100;
          return {
            id: p.id,
            name: p.name || 'Estudante',
            email: p.email,
            count,
            total: TOTAL_REQUIRED_DOCS,
            status: percent < 30 ? 'low' : percent < 80 ? 'medium' : 'high'
          } as StudentProgress;
        });

        setStudents(progressMap);
      } catch (err) {
        console.error("Erro auditoria documentos:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchChecklists();
  }, []);

  const filtered = students.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 px-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-primary italic leading-none">Auditoria de Documentos</h1>
            <FileCheck className="h-6 w-6 text-accent" />
          </div>
          <p className="text-muted-foreground font-medium italic">Supervisão da prontidão documental para vestibulares.</p>
        </div>
        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
          <Input 
            placeholder="Buscar por aluno..." 
            className="pl-12 h-14 bg-white border-none shadow-xl rounded-2xl italic font-medium focus-visible:ring-accent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Em Risco", count: students.filter(s => s.status === 'low').length, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
          { label: "Em Progresso", count: students.filter(s => s.status === 'medium').length, icon: Loader2, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Prontos", count: students.filter(s => s.status === 'high').length, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-lg rounded-3xl bg-white overflow-hidden p-6">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center shadow-inner`}>
                <stat.icon className={`h-6 w-6 ${stat.icon === Loader2 ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <p className="text-2xl font-black text-primary">{stat.count}</p>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-accent" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Analisando Arquivos de Rede...</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50 border-b border-muted/10">
                <TableRow className="border-none h-16">
                  <TableHead className="px-8 font-black uppercase text-[10px] tracking-widest text-primary/40">Estudante</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/40">Status do Checklist</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/40">Prontidão</TableHead>
                  <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest text-primary/40">Intervenção</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((student) => {
                  const percent = Math.round((student.count / student.total) * 100);
                  return (
                    <TableRow key={student.id} className="border-b last:border-0 hover:bg-accent/5 transition-all group h-24">
                      <TableCell className="px-8">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center font-black italic shadow-md">{student.name.charAt(0)}</div>
                          <div className="flex flex-col">
                            <span className="font-black text-primary text-sm italic">{student.name}</span>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">{student.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-center w-32 text-[8px] font-black uppercase">
                            <span className="text-primary/40">Itens: {student.count}/{student.total}</span>
                            <span className={student.status === 'low' ? 'text-red-500' : student.status === 'medium' ? 'text-amber-500' : 'text-green-500'}>{percent}%</span>
                          </div>
                          <div className="h-1.5 w-32 bg-muted rounded-full overflow-hidden border">
                            <div className={`h-full transition-all duration-1000 ${
                              student.status === 'low' ? 'bg-red-500' : student.status === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                            }`} style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`border-none font-black text-[8px] uppercase px-3 h-6 ${
                          student.status === 'low' ? 'bg-red-100 text-red-700' : student.status === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {student.status === 'low' ? 'Crítico' : student.status === 'medium' ? 'Em progresso' : 'Pronto'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right px-8">
                        <Button className="bg-primary text-white font-black text-[10px] uppercase h-10 px-6 rounded-xl shadow-lg hover:scale-105 transition-all" asChild>
                          <Link href={`/dashboard/chat/${student.id}`}>
                            <Send className="h-3.5 w-3.5 mr-2" /> Cobrar Apoio
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-64 text-center py-20">
                      <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/20" />
                      <p className="font-black italic text-xl text-primary/40 uppercase tracking-widest">Nenhum estudante rastreado</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
