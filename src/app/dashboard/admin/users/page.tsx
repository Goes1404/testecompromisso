
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Search, 
  Trash2, 
  Loader2, 
  ShieldCheck, 
  UserCircle, 
  MoreVertical,
  Filter,
  Users as UsersIcon,
  AlertTriangle,
  Send
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
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
import Link from "next/link";

export default function AdminUserDirectoryPage() {
  const { user: currentUser, profile: currentProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error("Erro diretório:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDeleteUser = async (id: string, name: string) => {
    if (id === currentUser?.id) {
      toast({ title: "Ação Negada", description: "Você não pode excluir seu próprio perfil.", variant: "destructive" });
      return;
    }

    setDeletingId(id);
    try {
      // Registrar log antes de excluir
      await supabase.from('activity_logs').insert({
        user_id: currentUser?.id,
        user_name: currentProfile?.name || 'Administrador',
        action: `Excluiu permanentemente o usuário: ${name}`,
        entity_type: 'user',
        entity_id: id
      });

      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;

      setUsers(prev => prev.filter(u => u.id !== id));
      toast({ title: "Usuário Removido", description: "O perfil foi excluído do banco de dados." });
    } catch (err: any) {
      toast({ title: "Erro na Exclusão", description: err.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.profile_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 px-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-primary italic leading-none">Diretório de Usuários</h1>
            <UsersIcon className="h-6 w-6 text-accent" />
          </div>
          <p className="text-muted-foreground font-medium italic">Gestão completa de identidades e acessos da rede.</p>
        </div>
        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors" />
          <Input 
            placeholder="Buscar por nome ou tipo..." 
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
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sincronizando Banco de Identidades...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 border-b border-muted/10">
                  <TableRow className="border-none h-16">
                    <TableHead className="px-8 font-black uppercase text-[10px] tracking-widest text-primary/40">Nome Completo</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/40">Classificação</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/40">Instituição</TableHead>
                    <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest text-primary/40">Ações Críticas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => {
                    const isStaff = !['etec', 'uni', 'enem', 'cpop', 'student', 'aluno'].includes(u.profile_type?.toLowerCase() || '');
                    return (
                      <TableRow key={u.id} className="border-b last:border-0 hover:bg-accent/5 transition-colors group h-20">
                        <TableCell className="px-8">
                          <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black italic shadow-md transition-all ${
                              isStaff ? 'bg-accent text-white' : 'bg-primary text-white'
                            }`}>
                              {u.name?.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-black text-primary text-sm italic">{u.name}</span>
                              <span className="text-[8px] font-black uppercase opacity-40">@{u.username || 'user'}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`border-none font-black text-[8px] uppercase px-3 h-6 ${
                            isStaff ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {isStaff ? 'Staff / Mentor' : 'Estudante'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-bold text-muted-foreground italic truncate max-w-[150px] inline-block">
                            {u.institution || 'Geral'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right px-8">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" className="rounded-xl text-accent" asChild>
                              <Link href={`/dashboard/chat/${u.id}`}><Send className="h-4 w-4" /></Link>
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50">
                                  {deletingId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-10 max-w-sm">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-2xl font-black italic text-primary">Excluir Usuário?</AlertDialogTitle>
                                  <AlertDialogDescription className="font-medium text-sm">
                                    Esta ação removerá permanentemente o perfil de <strong className="text-red-600">{u.name}</strong> do banco de dados. 
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="gap-3 mt-6">
                                  <AlertDialogCancel className="rounded-xl font-bold border-none bg-muted/30">Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteUser(u.id, u.name)} 
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
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
