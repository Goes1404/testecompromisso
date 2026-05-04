"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Search,
  Loader2,
  Send,
  Ban,
  CheckCircle2,
  UserPlus,
  KeyRound,
  Copy,
  Check,
  Clock,
  RefreshCw,
  AlertCircle,
  Link2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

// ────────────────────────────────────────────────
// Modal de Gerar Link de Convite (Cadastro em Massa)
// ────────────────────────────────────────────────

function InviteLinkModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expiryDays, setExpiryDays] = useState(7);

  const generateInvite = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/generate-registration-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterPassword: 'compromisso2026',
          expiryDays: expiryDays,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLink(data.link);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: 'Link de convite copiado!' });
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-8 pb-4 bg-orange-50 border-b border-orange-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-12 w-12 rounded-2xl bg-orange-500/10 flex items-center justify-center">
              <Link2 className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-orange-700 leading-none italic uppercase tracking-tighter">
                Link de Convite
              </DialogTitle>
              <DialogDescription className="text-xs mt-1 font-medium text-orange-600/60">
                Cadastro em massa para novos alunos
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-6">
          {!link ? (
            <div className="space-y-6">
              <p className="text-sm text-slate-500 leading-relaxed font-medium">
                Este link permite que novos alunos se cadastrem sozinhos na plataforma. 
                Eles serão registrados automaticamente como <strong className="text-primary italic uppercase">Estudantes</strong>.
              </p>
              
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Validade do Link (Dias)</Label>
                <div className="flex gap-2">
                  {[1, 3, 7, 15, 30].map(d => (
                    <Button
                      key={d}
                      type="button"
                      variant={expiryDays === d ? 'default' : 'outline'}
                      onClick={() => setExpiryDays(d)}
                      className={`flex-1 h-11 rounded-xl font-black text-xs transition-all ${expiryDays === d ? 'bg-orange-600 shadow-lg shadow-orange-200 border-none' : 'bg-white border-slate-100 text-slate-400'}`}
                    >
                      {d}d
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                onClick={generateInvite}
                disabled={loading}
                className="w-full h-14 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-2xl shadow-xl shadow-orange-200 uppercase tracking-widest text-xs transition-all active:scale-95"
              >
                {loading ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Gerar Link de Cadastro
              </Button>
            </div>
          ) : (
            <div className="space-y-6 animate-in zoom-in-95 duration-500">
              <div className="bg-slate-50 border border-slate-100 rounded-[1.5rem] p-5 space-y-4">
                <div className="flex items-center justify-between">
                   <Badge className="bg-emerald-500 text-white border-none font-black text-[9px] uppercase px-3">Link Ativo</Badge>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expira em {expiryDays} dias</span>
                </div>
                <p className="text-xs font-mono text-slate-400 break-all bg-white p-3 rounded-xl border border-slate-50">
                  {link}
                </p>
                <Button
                  onClick={handleCopy}
                  className="w-full h-12 bg-primary text-white font-black rounded-xl shadow-lg shadow-primary/20 gap-2"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copiado para o Clip!' : 'Copiar Link agora'}
                </Button>
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100 text-blue-700">
                <AlertCircle size={20} className="shrink-0" />
                <p className="text-[10px] font-bold leading-tight uppercase tracking-tight">
                  Envie este link para os grupos de WhatsApp. O aluno preencherá o próprio nome e curso.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────────
// Modal de Reset de Senha
// ────────────────────────────────────────────────

interface ResetModalProps {
  user: { id: string; name: string; email: string } | null;
  open: boolean;
  onClose: () => void;
}

function ResetPasswordModal({ user, open, onClose }: ResetModalProps) {
  const { toast } = useToast();
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Limpa estado ao abrir um novo usuário
  useEffect(() => {
    if (open) {
      setLink(null);
      setError(null);
      setCopied(false);
    }
  }, [open, user?.id]);

  const generateLink = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterPassword: 'compromisso2026',
          email: user.email,
          type: 'recovery',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLink(data.link);
    } catch (err: any) {
      setError(err.message || 'Falha ao gerar link. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: 'Link copiado para a área de transferência!' });
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-primary leading-none">
                Resetar Senha
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {user?.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* E-mail do usuário */}
          <div className="flex items-center gap-2.5 bg-slate-50 rounded-xl border border-slate-200 px-4 py-3">
            <Link2 size={15} className="text-muted-foreground shrink-0" />
            <span className="text-xs font-mono font-bold text-primary truncate">{user?.email}</span>
          </div>

          {/* Estado: sem link ainda */}
          {!link && !loading && !error && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Clique em <strong>Gerar Link</strong> para criar um link temporário de reset de senha.
                O link expira em <strong>1 hora</strong> e funciona uma única vez.
              </p>
              <Button
                onClick={generateLink}
                className="w-full h-11 bg-primary text-white font-bold rounded-2xl border-none shadow-md"
              >
                <KeyRound size={16} className="mr-2" />
                Gerar Link de Reset
              </Button>
            </div>
          )}

          {/* Estado: carregando */}
          {loading && (
            <div className="py-6 flex items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm font-medium">Gerando link seguro...</span>
            </div>
          )}

          {/* Estado: erro */}
          {error && !loading && (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {error}
              </div>
              <Button
                variant="outline"
                onClick={generateLink}
                className="w-full h-10 rounded-xl font-bold border-muted/30 gap-2"
              >
                <RefreshCw size={14} />
                Tentar novamente
              </Button>
            </div>
          )}

          {/* Estado: link gerado */}
          {link && !loading && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-1 rounded-full text-xs font-bold">
                  <Clock size={11} />
                  Expira em 1 hora
                </span>
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold">
                  <CheckCircle2 size={11} />
                  Link gerado
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-3">
                <p className="text-[10px] font-mono text-slate-500 break-all leading-relaxed line-clamp-3">
                  {link}
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCopy}
                    className="flex-1 h-10 rounded-xl font-bold text-xs gap-2 bg-primary text-white border-none"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copiado!' : 'Copiar Link'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={generateLink}
                    disabled={loading}
                    title="Gerar novo link"
                    className="h-10 px-3 rounded-xl border-muted/30"
                  >
                    <RefreshCw size={14} />
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                Envie este link ao usuário via WhatsApp ou outro canal seguro. Ele será redirecionado
                para criar uma nova senha.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────────
// Página Principal
// ────────────────────────────────────────────────

export default function AdminUserDirectoryPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [users, setUsers] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Estado do modal de reset e convite
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string; email: string } | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('name');
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error("Erro diretório:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    if (id === currentUser?.id) {
      toast({ title: "Ação Negada", description: "Você não pode suspender sua própria conta.", variant: "destructive" });
      return;
    }
    setProcessingId(id);
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: newStatus } : u));
      toast({ title: newStatus === 'active' ? 'Acesso reativado' : 'Usuário suspenso' });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const openResetModal = (u: any) => {
    if (!u.email) {
      toast({ title: "Sem e-mail cadastrado", description: "Este usuário não possui e-mail vinculado.", variant: "destructive" });
      return;
    }
    setResetTarget({ id: u.id, name: u.name, email: u.email });
    setResetOpen(true);
  };

  const filtered = users.filter(u => {
    const matchesSearch =
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchTerm.toLowerCase());

    const pType = (u.profile_type || '').toLowerCase();
    const isStaff = u.role === 'admin' || u.role === 'teacher' ||
      ['admin', 'staff', 'teacher', 'tecnico', 'técnico', 'coord', 'prof',
        'psicóloga', 'apoio', 'assessor', 'secretaria', 'videomaker',
        'administrador', 'agente'].some(k => pType.includes(k));

    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'staff' && isStaff) ||
      (roleFilter === 'student' && !isStaff);

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && u.status !== 'suspended') ||
      (statusFilter === 'suspended' && u.status === 'suspended');

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 px-1">

      {/* ── Cabeçalho ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-primary italic leading-none">
            Diretório de Usuários
            <span className="text-lg font-bold text-muted-foreground ml-2 not-italic">
              ({filtered.length})
            </span>
          </h1>
          <p className="text-muted-foreground font-medium italic text-sm">
            Gestão completa de identidades e acessos da rede.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            onClick={() => setInviteOpen(true)}
            className="bg-white text-orange-600 border border-orange-100 font-black rounded-2xl shadow-md h-12 px-6 gap-2 hover:bg-orange-50 transition-all"
          >
            <Link2 className="h-4 w-4" />
            Link de Convite
          </Button>
          <Button
            asChild
            className="bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 h-12 px-6 gap-2 hover:scale-[1.02] active:scale-95 transition-all border-none"
          >
            <Link href="/dashboard/admin/users/new">
              <UserPlus className="h-4 w-4" />
              Novo Usuário
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            className="pl-11 h-12 bg-white border-none shadow-md rounded-2xl font-medium"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] font-black uppercase text-primary/40 px-1 tracking-widest">Papel</Label>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-12 rounded-xl bg-white border-none shadow-md font-bold">
              <SelectValue placeholder="Papel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="student">Estudantes</SelectItem>
              <SelectItem value="staff">Equipe Profissional</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] font-black uppercase text-primary/40 px-1 tracking-widest">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-12 rounded-xl bg-white border-none shadow-md font-bold">
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

      {/* ── Tabela ── */}
      <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-accent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground italic text-sm">
              Nenhum usuário encontrado com os filtros atuais.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="h-14">
                    <TableHead className="px-6 font-black uppercase text-[10px] tracking-widest">Identidade</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">E-mail</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Cargo</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                    <TableHead className="text-right px-6 font-black uppercase text-[10px] tracking-widest">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(u => {
                    const pType = (u.profile_type || '').toLowerCase();
                    const isStaff = u.role === 'admin' || u.role === 'teacher' ||
                      ['admin', 'staff', 'teacher', 'tecnico', 'técnico', 'coord', 'prof',
                        'psicóloga', 'apoio', 'assessor', 'secretaria', 'videomaker',
                        'administrador', 'agente'].some(k => pType.includes(k));
                    const isSuspended = u.status === 'suspended';
                    const isProcessing = processingId === u.id;

                    return (
                      <TableRow
                        key={u.id}
                        className="h-16 hover:bg-muted/10 border-b last:border-0 transition-colors"
                      >
                        {/* Identidade */}
                        <TableCell className="px-6">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-black text-sm shadow-sm ${isStaff ? 'bg-accent text-white' : 'bg-primary text-white'}`}>
                              {u.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className={`font-bold text-sm ${isSuspended ? 'line-through opacity-40 text-slate-400' : 'text-primary italic'}`}>
                                {u.name || '—'}
                              </p>
                              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                                @{u.username || 'user'}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* E-mail */}
                        <TableCell>
                          <span className="text-xs font-mono text-muted-foreground truncate max-w-[180px] block">
                            {u.email || '—'}
                          </span>
                        </TableCell>

                        {/* Cargo */}
                        <TableCell>
                          <Badge className={`border-none font-bold text-[9px] uppercase px-2.5 h-5 ${
                            isStaff
                              ? pType.includes('admin') ? 'bg-indigo-100 text-indigo-700'
                              : pType.includes('teacher') ? 'bg-purple-100 text-purple-700'
                              : 'bg-orange-100 text-orange-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {u.profile_type || (u.role === 'admin' ? 'Coordenação' : u.role === 'teacher' ? 'Professor' : 'Estudante')}
                          </Badge>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge variant="outline" className={`font-bold text-[9px] uppercase px-2.5 h-5 ${isSuspended ? 'text-red-500 border-red-200 bg-red-50' : 'text-emerald-600 border-emerald-200 bg-emerald-50'}`}>
                            {isSuspended ? 'Suspenso' : 'Ativo'}
                          </Badge>
                        </TableCell>

                        {/* Ações */}
                        <TableCell className="text-right px-6">
                          <div className="flex items-center justify-end gap-1">
                            {/* Reset de Senha */}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Gerar link de reset de senha"
                              onClick={() => openResetModal(u)}
                              className="h-8 w-8 rounded-lg hover:bg-amber-50 hover:text-amber-600 transition-colors"
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>

                            {/* Suspender / Reativar */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={isProcessing || u.id === currentUser?.id}
                                  title={isSuspended ? 'Reativar acesso' : 'Suspender acesso'}
                                  className={`h-8 w-8 rounded-lg transition-colors ${isSuspended ? 'hover:bg-emerald-50 hover:text-emerald-600' : 'hover:bg-amber-50 hover:text-amber-600'}`}
                                >
                                  {isProcessing
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : isSuspended
                                      ? <CheckCircle2 className="h-4 w-4" />
                                      : <Ban className="h-4 w-4" />
                                  }
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="font-black text-primary">
                                    {isSuspended ? 'Reativar acesso?' : 'Suspender acesso?'}
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {isSuspended
                                      ? `${u.name} voltará a ter acesso à plataforma normalmente.`
                                      : `${u.name} não conseguirá mais fazer login. Esta ação pode ser revertida.`
                                    }
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleToggleStatus(u.id, u.status)}
                                    className={`rounded-xl font-bold border-none ${isSuspended ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'}`}
                                  >
                                    {isSuspended ? 'Reativar' : 'Suspender'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>

                            {/* Chat */}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Enviar mensagem"
                              asChild
                              className="h-8 w-8 rounded-lg hover:bg-accent/10 hover:text-accent transition-colors"
                            >
                              <Link href={`/dashboard/chat/${u.id}`}>
                                <Send className="h-4 w-4" />
                              </Link>
                            </Button>
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

      {/* ── Modal de Convite ── */}
      <InviteLinkModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />

      {/* ── Modal de Reset ── */}
      <ResetPasswordModal
        user={resetTarget}
        open={resetOpen}
        onClose={() => { setResetOpen(false); setResetTarget(null); }}
      />
    </div>
  );
}
