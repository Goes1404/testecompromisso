
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  CheckCircle2, 
  XCircle, 
  Eye, 
  MessageSquare, 
  Loader2, 
  Filter, 
  Search,
  AlertCircle,
  Clock,
  User,
  Layout
} from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/app/lib/supabase";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

export default function TrailApprovalPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [trails, setTrails] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrails() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('trails')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setTrails(data || []);
      } catch (e) {
        console.error("Erro ao buscar trilhas:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchTrails();
  }, []);

  const handleApprove = async (id: string) => {
    if (approvingId) return;
    setApprovingId(id);
    const { error } = await supabase.from('trails').update({ status: 'published' }).eq('id', id);
    if (!error) {
      setTrails(prev => prev.map(t => t.id === id ? { ...t, status: 'published' } : t));
      toast({ title: "Trilha Aprovada!", description: "O conteúdo já está visível para os alunos." });
    } else {
      toast({ title: "Erro na aprovação", description: "Verifique sua conexão.", variant: "destructive" });
    }
    setApprovingId(null);
  };

  const filteredTrails = trails.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return (
    <div className="h-96 flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-12 w-12 animate-spin text-accent" />
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Carregando Controle de Qualidade...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-primary italic leading-none">Controle de Qualidade</h1>
          <p className="text-muted-foreground font-medium italic">Aprovação e Workflow de Conteúdo Pedagógico</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Pesquisar por título ou matéria..." 
            className="pl-12 h-14 bg-white border-none shadow-xl rounded-2xl italic font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="h-14 px-8 rounded-2xl bg-white shadow-xl border-none font-bold gap-2">
          <Filter className="h-4 w-4" /> Filtros
        </Button>
      </div>

      <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/5">
              <TableRow className="border-none h-16">
                <TableHead className="px-8 font-black uppercase text-[10px] tracking-widest">Trilha / Conteúdo</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Professor</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrails.map((trail) => (
                <TableRow key={trail.id} className="border-b last:border-0 hover:bg-accent/5 transition-colors group h-20">
                  <TableCell className="px-8">
                    <div>
                      <p className="font-black text-primary text-sm italic">{trail.title}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter mt-1">{trail.category}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center"><User className="h-4 w-4 text-primary/40" /></div>
                      <span className="text-xs font-bold text-primary/70">{trail.teacher_name || "Mentor"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {trail.status === 'review' || trail.status === 'draft' ? (
                      <Badge className="bg-amber-100 text-amber-700 border-none font-black text-[8px] uppercase gap-1.5">
                        <Clock className="h-2.5 w-2.5" /> Aguardando Revisão
                      </Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-700 border-none font-black text-[8px] uppercase gap-1.5">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Publicada
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right px-8">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" className="rounded-xl" asChild>
                        <Link href={`/dashboard/classroom/${trail.id}`}><Eye className="h-4 w-4" /></Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-xl"><MessageSquare className="h-4 w-4" /></Button>
                      {trail.status !== 'published' && (
                        <Button 
                          onClick={() => handleApprove(trail.id)} 
                          disabled={approvingId === trail.id}
                          className="bg-primary text-white font-black text-[10px] uppercase h-9 px-4 rounded-xl shadow-lg min-w-[80px]"
                        >
                          {approvingId === trail.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Aprovar"}
                        </Button>
                      )}
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
