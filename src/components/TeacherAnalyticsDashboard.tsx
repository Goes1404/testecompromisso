
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Users, 
  ShieldCheck, 
  Loader2, 
  ClipboardCheck, 
  BrainCircuit,
  Activity,
  ArrowUpRight
} from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend, CartesianGrid, LineChart, Line } from "recharts";

const COLORS = ["#1a2c4b", "#f59e0b", "#64748b", "#94a3b8", "#cbd5e1"];

const mockPerformanceData = [
  { name: "Redação", performance: 88 },
  { name: "Matemática", performance: 72 },
  { name: "Física", performance: 65 },
  { name: "Linguagens", performance: 91 },
  { name: "Biologia", performance: 78 },
];

const mockCareerInterests = [
  { name: "Engenharia", value: 35 },
  { name: "Medicina", value: 25 },
  { name: "Tecnologia", value: 30 },
  { name: "Humanas", value: 10 },
];

const mockEngagementTrend = [
  { day: "Seg", acessos: 400 },
  { day: "Ter", acessos: 520 },
  { day: "Qua", acessos: 480 },
  { day: "Qui", acessos: 610 },
  { day: "Sex", acessos: 590 },
  { day: "Sáb", acessos: 320 },
  { day: "Dom", acessos: 210 },
];

export default function TeacherAnalyticsDashboard() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simula carregamento de big data
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return (
    <div className="h-96 flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin h-12 w-12 text-accent" />
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Processando Inteligência de Rede...</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-primary italic leading-none">Inteligência Pedagógica (BI)</h1>
          <p className="text-muted-foreground font-medium text-lg italic">Visão térmica de engajamento e performance acadêmica.</p>
        </div>
        <Badge className="bg-accent/10 text-accent font-black px-4 py-2 border-none flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          MODO APRESENTAÇÃO ATIVO
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-xl bg-primary text-white overflow-hidden rounded-[2.5rem] p-8 relative group">
          <div className="absolute top-[-10%] right-[-10%] w-24 h-24 bg-accent/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <div className="flex items-center gap-6 relative z-10">
            <div className="h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center shadow-lg">
              <Users className="h-8 w-8 text-accent" />
            </div>
            <div>
              <p className="text-3xl font-black italic">1.250</p>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Alunos na Rede</p>
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-xl bg-white overflow-hidden rounded-[2.5rem] p-8 group hover:shadow-2xl transition-all duration-500">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center shadow-inner group-hover:bg-accent group-hover:text-white transition-all">
              <ClipboardCheck className="h-8 w-8 text-accent group-hover:text-white" />
            </div>
            <div>
              <p className="text-3xl font-black text-primary italic">8.4</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Média de Acertos (Geral)</p>
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-xl bg-white overflow-hidden rounded-[2.5rem] p-8">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 rounded-2xl bg-green-50 flex items-center justify-center">
              <Activity className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <p className="text-3xl font-black text-primary italic">92%</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Retenção de Conteúdo</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden">
          <CardHeader className="p-10 pb-0">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-black text-primary italic flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-accent" />
                Performance por Matéria
              </CardTitle>
              <Badge className="bg-muted text-primary font-black text-[8px] px-3">SIMULADOS</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-10">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockPerformanceData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} width={100} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="performance" fill="hsl(var(--primary))" radius={[0, 10, 10, 0]} barSize={24}>
                    {mockPerformanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden">
          <CardHeader className="p-10 pb-0">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-black text-primary italic flex items-center gap-3">
                <Activity className="h-5 w-5 text-accent" />
                Engajamento Semanal
              </CardTitle>
              <span className="text-[10px] font-black text-green-600 uppercase">+12% vs Ontem</span>
            </div>
          </CardHeader>
          <CardContent className="p-10">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockEngagementTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="acessos" 
                    stroke="hsl(var(--accent))" 
                    strokeWidth={4} 
                    dot={{ r: 6, fill: "hsl(var(--accent))", strokeWidth: 2, stroke: "#fff" }} 
                    activeDot={{ r: 8, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden">
          <CardHeader className="p-10 pb-0 text-center">
            <CardTitle className="text-xl font-black text-primary italic">Interesses de Carreira</CardTitle>
          </CardHeader>
          <CardContent className="p-10">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={mockCareerInterests} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={70} 
                    outerRadius={100} 
                    paddingAngle={8} 
                    dataKey="value"
                  >
                    {mockCareerInterests.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-2xl bg-accent text-accent-foreground rounded-[3rem] p-10 flex flex-col justify-center items-center text-center space-y-6">
          <div className="h-20 w-20 rounded-[2rem] bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-2xl rotate-3">
            <BrainCircuit className="h-10 w-10 text-white" />
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-black italic italic tracking-tighter uppercase">Insights Aurora</h3>
            <p className="text-sm font-medium leading-relaxed opacity-80 max-w-xs mx-auto">
              "A taxa de acertos em Matemática subiu 15% após a última aula ao vivo. Recomendamos focar o próximo simulado em Geometria Analítica."
            </p>
          </div>
          <button className="h-14 px-8 bg-primary text-white font-black rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 border-none text-xs uppercase tracking-widest">
            Baixar Relatório Executivo <ArrowUpRight className="h-4 w-4" />
          </button>
        </Card>
      </div>
    </div>
  );
}
