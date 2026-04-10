
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
  
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
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
      toast({ title: "Ação Negada", variant: "destructive" });
      return;
    }
    setProcessingId(id);
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: newStatus } : u));
      toast({ title: "Status Atualizado" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = users.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.username?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const pType = (u.profile_type || '').toLowerCase();
    const isStaff = ['admin', 'staff', 'teacher', 'tecnico', 'técnico', 'coord'].some(k => pType.includes(k));
    
    const matchesRole = roleFilter === 'all' || 
                       (roleFilter === 'staff' && isStaff) || 
                       (roleFilter === 'student' && !isStaff);

    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && u.status !== 'suspended') ||
                         (statusFilter === 'suspended' && u.status === 'suspended');

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 px-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-primary italic leading-none">Diretório de Usuários ({filtered.length})</h1>
          <p className="text-muted-foreground font-medium italic">Gestão completa de identidades e acessos da rede.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input placeholder="Buscar por nome..." className="pl-12 h-14 bg-white border-none shadow-xl rounded-2xl italic font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-primary/40 px-2 tracking-widest">Papel na Rede</Label>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-12 rounded-xl bg-white border-none shadow-md font-bold italic">
              <SelectValue placeholder="Cargo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="student">Estudantes</SelectItem>
              <SelectItem value="staff">Equipe Profissional</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-primary/40 px-2 tracking-widest">Status de Acesso</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-12 rounded-xl bg-white border-none shadow-md font-bold italic">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="suspended">Suspensos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4"><Loader2 className="h-12 w-12 animate-spin text-accent" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="h-16">
                    <TableHead className="px-8 font-black uppercase text-[10px]">Identidade</TableHead>
                    <TableHead className="font-black uppercase text-[10px]">Cargo</TableHead>
                    <TableHead className="font-black uppercase text-[10px]">Status</TableHead>
                    <TableHead className="text-right px-8 font-black uppercase text-[10px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => {
                    const pType = (u.profile_type || '').toLowerCase();
                    const isStaff = ['admin', 'staff', 'teacher', 'tecnico', 'técnico', 'coord'].some(k => pType.includes(k));
                    const isSuspended = u.status === 'suspended';
                    
                    return (
                      <TableRow key={u.id} className="h-20 hover:bg-muted/10 border-b last:border-0">
                        <TableCell className="px-8">
                          <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black italic shadow-md ${isStaff ? 'bg-accent text-white' : 'bg-primary text-white'}`}>{u.name?.charAt(0)}</div>
                            <div className="flex flex-col">
                              <span className={`font-black text-sm italic ${isSuspended ? 'line-through opacity-40' : 'text-primary'}`}>{u.name}</span>
                              <span className="text-[8px] font-black uppercase opacity-40">@{u.username || 'user'}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`border-none font-black text-[8px] uppercase px-3 h-6 ${
                            isStaff ? (pType.includes('admin') ? 'bg-indigo-100 text-indigo-700' : pType.includes('teacher') ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700') : 'bg-blue-100 text-blue-700'
                          }`}>
                            {pType.includes('admin') ? 'Coordenação' : pType.includes('teacher') ? 'Professor' : isStaff ? 'Equipe Técnica' : 'Estudante'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`font-black text-[8px] uppercase px-3 ${isSuspended ? 'text-red-500 border-red-200 bg-red-50' : 'text-green-500 border-green-200 bg-green-50'}`}>
                            {isSuspended ? 'Suspenso' : 'Ativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right px-8 space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => handleToggleStatus(u.id, u.status, u.name)}>{isSuspended ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Ban className="h-4 w-4 text-amber-500" />}</Button>
                          <Button variant="ghost" size="icon" className="text-accent" asChild><Link href={`/dashboard/chat/${u.id}`}><Send className="h-4 w-4" /></Link></Button>
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
