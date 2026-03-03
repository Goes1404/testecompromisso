
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Search, 
  Gavel, 
  Trash2, 
  Loader2, 
  MessageSquare, 
  ShieldAlert, 
  Eye, 
  Calendar,
  User,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
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

export default function AdminForumModerationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [forums, setForums] = useState<any[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchForums = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('forums')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setForums(data || []);
    } catch (err) {
      console.error("Erro moderação:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForums();
  }, []);

  const handleDeleteForum = async (id: string, name: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from('forums').delete().eq('id', id);
      if (error) throw error;

      await supabase.from('activity_logs').insert({
        user_id: user?.id,
        user_name: 'Administrador',
        action: `Moderou e removeu o tópico de fórum: ${name}`,
        entity_type: 'forum',
        entity_id: id
      });

      setForums(prev => prev.filter(f => f.id !== id));
      toast({ title: "Tópico Removido", description: "O debate e todas as suas mensagens foram excluídos." });
    } catch (err: any) {
      toast({ title: "Erro na Moderação", description: err.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = forums.filter(f => 
    f.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.author_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 px-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-primary italic leading-none">Moderação de Comunidade</h1>
            <Gavel className="h-6 w-6 text-accent" />
          </div>
          <p className="text-muted-foreground font-medium italic">Supervisão ética e limpeza de conteúdo nos fóruns.</p>
        </div>
        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors" />
          <Input 
            placeholder="Pesquisar tópico ou autor..." 
            className="pl-12 h-14 bg-white border-none shadow-xl rounded-2xl italic font-medium focus-visible:ring-accent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-xl bg-primary text-white rounded-[2.5rem] p-8 overflow-hidden relative group">
          <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-accent/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <div className="relative z-10 space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center shadow-lg"><ShieldAlert className="h-6 w-6 text-accent" /></div>
            <h3 className="text-xl font-black italic uppercase tracking-widest">Protocolo de Segurança</h3>
            <p className="text-xs opacity-70 font-medium italic leading-relaxed">
              Como administrador, você tem poder total para remover interações inapropriadas. Lembre-se que esta ação é irreversível e remove todo o histórico do debate.
            </p>
          </div>
        </Card>

        <Card className="border-none shadow-xl bg-white rounded-[2.5rem] p-8 flex items-center justify-between group">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Discussões Ativas</p>
            <p className="text-4xl font-black text-primary italic">{forums.length}</p>
          </div>
          <div className="h-16 w-16 rounded-[2rem] bg-accent/10 text-accent flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
            <MessageSquare className="h-8 w-8" />
          </div>
        </Card>
      </div>

      <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-accent" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Escaneando Redes de Debate...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 border-b border-muted/10">
                  <TableRow className="border-none h-16">
                    <TableHead className="px-8 font-black uppercase text-[10px] tracking-widest text-primary/40">Tópico / Discussão</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/40">Autor</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/40">Data de Criação</TableHead>
                    <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest text-primary/40">Ações de Limpeza</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((f) => (
                    <TableRow key={f.id} className="border-b last:border-0 hover:bg-accent/5 transition-colors group h-24">
                      <TableCell className="px-8">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center shadow-inner">
                            <MessageSquare className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-primary text-sm italic group-hover:text-accent transition-colors">{f.name}</span>
                            <Badge className="w-fit bg-muted/50 text-[7px] font-black uppercase text-primary/40 border-none mt-1">{f.category}</Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs font-bold text-primary/70">{f.author_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">{format(new Date(f.created_at), "dd/MM/yyyy")}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-8">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 text-primary" asChild>
                            <Link href={`/dashboard/forum/${f.id}`} target="_blank"><ExternalLink className="h-4 w-4" /></Link>
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 text-red-400 hover:text-red-600 hover:bg-red-50">
                                {deletingId === f.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-10 max-w-sm">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-2xl font-black italic text-primary">Banir Tópico?</AlertDialogTitle>
                                <AlertDialogDescription className="font-medium text-sm">
                                  Você está prestes a remover o debate <strong className="text-red-600">"{f.name}"</strong>. Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="gap-3 mt-6">
                                <AlertDialogCancel className="rounded-xl font-bold border-none bg-muted/30">Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteForum(f.id, f.name)} 
                                  className="rounded-xl font-black bg-red-600 hover:bg-red-700 text-white px-8"
                                >
                                  Remover Agora
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-64 text-center py-20">
                        <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" />
                        <p className="font-black italic text-xl text-primary/40 uppercase tracking-widest">Nenhuma discussão localizada</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
