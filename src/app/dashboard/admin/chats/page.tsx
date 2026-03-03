
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Search, 
  Eye, 
  Loader2, 
  MessageSquare, 
  ShieldCheck, 
  User, 
  History,
  Calendar,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

interface Conversation {
  u1_id: string;
  u2_id: string;
  u1_name: string;
  u2_name: string;
  u1_type: string;
  u2_type: string;
  last_message: string;
  last_date: string;
}

export default function AdminChatAuditPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<Conversation[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchThreads() {
      setLoading(true);
      try {
        // 1. Busca mensagens recentes
        const { data: messages, error: mError } = await supabase
          .from('direct_messages')
          .select('*')
          .order('created_at', { ascending: false });

        if (mError) throw mError;

        if (!messages || messages.length === 0) {
          setThreads([]);
          return;
        }

        // 2. Extrair IDs únicos de usuários envolvidos
        const userIds = Array.from(new Set(messages.flatMap(m => [m.sender_id, m.receiver_id])));

        // 3. Buscar perfis desses usuários
        const { data: profiles, error: pError } = await supabase
          .from('profiles')
          .select('id, name, profile_type')
          .in('id', userIds);

        if (pError) throw pError;

        const profileMap = new Map(profiles?.map(p => [p.id, p]));

        // 4. Agrupar por pares únicos de usuários (Threads)
        const threadMap = new Map();
        
        messages.forEach(msg => {
          const ids = [msg.sender_id, msg.receiver_id].sort();
          const key = ids.join(':');
          
          if (!threadMap.has(key)) {
            const u1 = profileMap.get(ids[0]);
            const u2 = profileMap.get(ids[1]);

            threadMap.set(key, {
              u1_id: ids[0],
              u2_id: ids[1],
              u1_name: u1?.name || 'Usuário Externo',
              u2_name: u2?.name || 'Usuário Externo',
              u1_type: u1?.profile_type || 'student',
              u2_type: u2?.profile_type || 'student',
              last_message: msg.content,
              last_date: msg.created_at
            });
          }
        });

        setThreads(Array.from(threadMap.values()));
      } catch (err: any) {
        console.error("Erro detalhado ao auditar chats:", err);
        toast({
          title: "Erro de Sincronização",
          description: "Não foi possível carregar os logs. Verifique se a tabela 'direct_messages' existe.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }

    fetchThreads();
  }, [toast]);

  const filteredThreads = threads.filter(t => 
    t.u1_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.u2_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-primary italic leading-none">Auditoria de Chats</h1>
            <ShieldCheck className="h-6 w-6 text-accent" />
          </div>
          <p className="text-muted-foreground font-medium italic">Monitoramento ético e supervisão de interações na rede.</p>
        </div>
        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
          <Input 
            placeholder="Buscar por nome..." 
            className="pl-12 h-14 bg-white border-none shadow-xl rounded-2xl italic font-medium focus-visible:ring-accent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-accent" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Sincronizando Logs de Conversa...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 border-b border-muted/10">
                  <TableRow className="border-none h-16">
                    <TableHead className="px-8 font-black uppercase text-[10px] tracking-widest text-primary/40">Participantes</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/40">Última Interação</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/40">Status</TableHead>
                    <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest text-primary/40">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredThreads.map((thread, i) => (
                    <TableRow key={i} className="border-b last:border-0 hover:bg-accent/5 transition-colors group h-24">
                      <TableCell className="px-8">
                        <div className="flex items-center gap-4">
                          <div className="flex -space-x-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 border-2 border-white flex items-center justify-center font-bold text-primary text-xs shadow-sm" title={thread.u1_name}>{thread.u1_name?.charAt(0)}</div>
                            <div className="h-10 w-10 rounded-full bg-accent/10 border-2 border-white flex items-center justify-center font-bold text-accent text-xs shadow-sm" title={thread.u2_name}>{thread.u2_name?.charAt(0)}</div>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-primary text-sm italic group-hover:text-accent transition-colors">
                              {thread.u1_name} + {thread.u2_name}
                            </span>
                            <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">
                              {thread.u1_type?.toUpperCase()} / {thread.u2_type?.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-primary/70 line-clamp-1 max-w-[200px]">"{thread.last_message}"</span>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1 mt-1">
                            <Calendar className="h-2.5 w-2.5" /> {format(new Date(thread.last_date), "dd/MM HH:mm")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-700 border-none font-black text-[8px] uppercase gap-1.5 px-3">
                          <ShieldCheck className="h-2.5 w-2.5" /> Arquivado
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right px-8">
                        <Button className="bg-primary text-white font-black text-[10px] uppercase h-10 px-6 rounded-xl shadow-lg hover:scale-105 transition-all" asChild>
                          <Link href={`/dashboard/admin/chats/audit?u1=${thread.u1_id}&u2=${thread.u2_id}`}>
                            <History className="h-3.5 w-3.5 mr-2" /> Abrir Log
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredThreads.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-64 text-center py-20">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/20" />
                        <p className="font-black italic text-xl text-primary/40 uppercase tracking-widest">Nenhuma conversa registrada</p>
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
