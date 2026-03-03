
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
  Trash2, 
  Loader2, 
  ShieldCheck, 
  UserCircle, 
  Users as UsersIcon,
  Send,
  Ban,
  CheckCircle2,
  Filter,
  Users2,
  UserCog
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  
  // Estados de Filtro
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  
  const [users, setUsers] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

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

  const handleToggleStatus = async (id: string, currentStatus: string, name: string) => {
    if (id === currentUser?.id) {
      toast({ title: "Ação Negada", description: "Você não pode suspender seu próprio acesso.", variant: "destructive" });
      return;
    }

    setProcessingId(id);
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      await supabase.from('activity_logs').insert({
        user_id: currentUser?.id,
        user_name: currentProfile?.name || 'Administrador',
        action: `${newStatus === 'suspended' ? 'Suspendeu' : 'Reativou'} o acesso de: ${name}`,
        entity_type: 'user',
        entity_id: id
      });

      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: newStatus } : u));
      toast({ 
        title: newStatus === 'suspended' ? "Acesso Bloqueado" : "Acesso Restaurado", 
        description: `O status de ${name} foi alterado para ${newStatus}.` 
      });
    } catch (err: any) {
      toast({ title: "Erro na Operação", description: err.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (id === currentUser?.id) {
      toast({ title: "Ação Negada", description: "Você não pode excluir seu próprio perfil.", variant: "destructive" });
      return;
    }

    setProcessingId(id);
    try {
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
      setProcessingId(null);
    }
  };

  const filtered = users.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.username?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const studentKeywords = ['etec', 'uni', 'enem', 'cpop', 'student', 'aluno'];
    const pType = (u.profile_type || '').toLowerCase();
    const isStudent = studentKeywords.some(key => pType.includes(key)) || pType === '';
    const isStaff = !isStudent;

    const matchesRole = roleFilter === 'all' || 
                       (roleFilter === 'staff' && isStaff) || 
                       (roleFilter === 'student' && isStudent);

    const isSuspended = u.status === 'suspended';
    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && !isSuspended) ||
                         (statusFilter === 'suspended' && isSuspended);

    const matchesType = typeFilter === 'all' || u.profile_type === typeFilter;

    return matchesSearch && matchesRole && matchesStatus && matchesType;
  });

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
            placeholder="Buscar por nome ou @username..." 
            className="pl-12 h-14 bg-white border-none shadow-xl rounded-2xl italic font-medium focus-visible:ring-accent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-primary/40 px-2 tracking-widest flex items-center gap-2">
            <UserCog className="h-3 w-3" /> Papel na Rede
          </Label>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-12 rounded-xl bg-white border-none shadow-md font-bold italic">
              <SelectValue placeholder="Filtrar Cargo" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-none shadow-2xl">
              <SelectItem value="all" className="font-bold">Todos os Papéis</SelectItem>
              <SelectItem value="student" className="font-bold">Estudantes</SelectItem>
              <SelectItem value="staff" className="font-bold">Staff / Mentoria</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-primary/40 px-2 tracking-widest flex items-center gap-2">
            <ShieldCheck className="h-3 w-3" /> Status de Acesso
          </Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-12 rounded-xl bg-white border-none shadow-md font-bold italic">
              <SelectValue placeholder="Filtrar Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-none shadow-2xl">
              <SelectItem value="all" className="font-bold">Todos os Status</SelectItem>
              <SelectItem value="active" className="font-bold">Apenas Ativos</SelectItem>
              <SelectItem value="suspended" className="font-bold">Apenas Suspensos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-primary/40 px-2 tracking-widest flex items-center gap-2">
            <Filter className="h-3 w-3" /> Tipo de Ingresso
          </Label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-12 rounded-xl bg-white border-none shadow-md font-bold italic">
              <SelectValue placeholder="Filtrar Categoria" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-none shadow-2xl">
              <SelectItem value="all" className="font-bold">Todas as Categorias</SelectItem>
              <SelectItem value="etec" className="font-bold">ETEC</SelectItem>
              <SelectItem value="enem" className="font-bold">ENEM</SelectItem>
              <SelectItem value="cpop_santana" className="font-bold">CPOP Santana</SelectItem>
              <SelectItem value="cpop_osasco" className="font-bold">CPOP Osasco</SelectItem>
              <SelectItem value="teacher" className="font-bold">Mentoria</SelectItem>
              <SelectItem value="admin" className="font-bold">Administração</SelectItem>
            </SelectContent>
          </Select>
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
                    <TableHead className="px-8 font-black uppercase text-[10px] tracking-widest text-primary/40">Identidade</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/40">Status de Acesso</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/40">Classificação</TableHead>
                    <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest text-primary/40">Gestão de Conta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => {
                    const studentKeywords = ['etec', 'uni', 'enem', 'cpop', 'student', 'aluno'];
                    const pType = (u.profile_type || '').toLowerCase();
                    const isStudent = studentKeywords.some(key => pType.includes(key)) || pType === '';
                    const isStaff = !isStudent;
                    const isSuspended = u.status === 'suspended';
                    
                    return (
                      <TableRow key={u.id} className="border-b last:border-0 hover:bg-accent/5 transition-colors group h-20">
                        <TableCell className="px-8">
                          <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black italic shadow-md transition-all ${
                              isSuspended ? 'bg-slate-400 grayscale text-white' : (isStaff ? 'bg-accent text-white shadow-accent/20' : 'bg-primary text-white shadow-primary/20')
                            }`}>
                              {u.name?.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className={`font-black text-sm italic ${isSuspended ? 'text-muted-foreground line-through opacity-50' : 'text-primary'}`}>{u.name}</span>
                              <span className="text-[8px] font-black uppercase opacity-40">@{u.username || 'user'}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`border-none font-black text-[8px] uppercase px-3 h-6 ${
                            isSuspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {isSuspended ? 'Acesso Bloqueado' : 'Acesso Ativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge className={`border-none font-black text-[8px] uppercase px-3 h-6 w-fit ${
                              isStaff ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {isStaff ? 'Equipe Técnica' : 'Estudante'}
                            </Badge>
                            <span className="text-[7px] font-bold text-muted-foreground uppercase px-1">{u.profile_type || 'Novo Aluno'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-8">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" className="rounded-xl text-accent hover:bg-accent/10" asChild title="Iniciar Chat">
                              <Link href={`/dashboard/chat/${u.id}`}><Send className="h-4 w-4" /></Link>
                            </Button>

                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleToggleStatus(u.id, u.status, u.name)}
                              disabled={processingId === u.id}
                              className={`rounded-xl ${isSuspended ? 'text-green-500 hover:bg-green-50' : 'text-amber-500 hover:bg-amber-50'}`}
                              title={isSuspended ? "Reativar Usuário" : "Suspender Usuário"}
                            >
                              {processingId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : (isSuspended ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />)}
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50" title="Excluir Definitivamente">
                                  {processingId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
          {!loading && filtered.length === 0 && (
            <div className="py-24 text-center">
              <Users2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" />
              <p className="font-black italic text-xl text-primary/40 uppercase tracking-widest">Nenhum usuário localizado</p>
              <p className="text-xs text-muted-foreground mt-2">Tente ajustar os filtros acima.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
