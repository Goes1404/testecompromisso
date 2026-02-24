
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, PlayCircle, TrendingUp, Bell, ArrowRight, Loader2, AlertCircle, ShieldAlert } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";

export default function TeacherHomePage() {
  const { profile, loading: isUserLoading } = useAuth();
  const { toast } = useToast();
  const [diagLoading, setDiagLoading] = useState(false);

  const runDiagnostic = async () => {
    setDiagLoading(true);
    try {
      const response = await fetch('/api/health');
      
      // Proteção contra respostas vazias ou erro 500
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Falha na resposta do diagnóstico.');
      }
      
      const data = await response.json();
      
      if (response.status === 200) {
        toast({ 
          title: "Sistema Operacional", 
          description: "Supabase e IA Aurora estão conectados com sucesso! ✅" 
        });
      } else {
        const errorMsg = data?.supabase?.status !== 'ok' ? `Supabase: ${data?.supabase?.details}` : `IA: ${data?.genkit?.details}`;
        toast({ 
          title: "Alerta de Rede", 
          description: errorMsg, 
          variant: "destructive" 
        });
      }
    } catch (err: any) {
      console.error("Erro diagnóstico:", err);
      toast({ 
        title: "Erro de Comunicação", 
        description: "Não foi possível contatar a API de diagnóstico ou o servidor retornou um erro.", 
        variant: "destructive" 
      });
    } finally {
      setDiagLoading(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
        <p className="text-muted-foreground font-black uppercase text-[10px] tracking-widest animate-pulse">Sincronizando Gestão...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-primary italic">Painel de Gestão Docente</h1>
          <p className="text-muted-foreground font-medium">Controle pedagógico do Compromisso em tempo real.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={runDiagnostic} 
            disabled={diagLoading}
            className="rounded-xl h-11 border-dashed border-accent/40 bg-white hover:bg-accent/5 text-accent"
          >
            {diagLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldAlert className="h-4 w-4 mr-2" />}
            Diagnóstico de Rede
          </Button>
          <Button className="rounded-xl h-11 bg-accent text-accent-foreground font-black hover:bg-accent/90 shadow-xl" asChild>
            <Link href="/dashboard/teacher/trails">Nova Trilha de Estudo</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Alunos", value: 150, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Apoio Social", value: 25, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
          { label: "Minhas Trilhas", value: 12, icon: PlayCircle, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Alunos em Risco", value: 18, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-xl overflow-hidden group hover:shadow-2xl transition-all rounded-[2rem] bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110 shadow-sm`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-widest bg-muted/30">Atualizado</Badge>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-black text-primary leading-none">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-2">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
          <CardHeader className="p-8 pb-0">
            <CardTitle className="text-xl font-black text-primary italic">Engajamento de Rede</CardTitle>
            <CardDescription className="font-medium">Atividade dos estudantes baseada no último acesso.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: "Ativos", value: 132 },
                  { name: "Inativos (+7d)", value: 18 },
                ]}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="value" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} barSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-2xl bg-primary text-primary-foreground rounded-[2.5rem] overflow-hidden relative">
            <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-accent/20 rounded-full blur-2xl" />
            <CardHeader className="pb-2 p-8">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
                <Bell className="h-4 w-4 text-accent" />
                Busca Ativa (Social)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-4">
              {[
                { name: 'Ana Silva', label: 'Elegível Isenção' },
                { name: 'Carlos Souza', label: 'Elegível Isenção' },
              ].map((aluno, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white/10 border border-white/10">
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-xs font-black truncate max-w-[120px] italic">{aluno.name}</span>
                    <span className="text-[8px] font-black text-accent uppercase tracking-widest">{aluno.label}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase text-accent hover:bg-white hover:text-primary transition-all px-3 rounded-lg shrink-0" asChild>
                    <Link href="/dashboard/teacher/students">Orientar</Link>
                  </Button>
                </div>
              ))}
              <Button asChild variant="secondary" className="w-full h-11 rounded-xl bg-accent text-accent-foreground font-black text-[10px] uppercase shadow-lg">
                <Link href="/dashboard/teacher/students">Ver Todos os Alunos</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
