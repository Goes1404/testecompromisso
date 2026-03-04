
"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Shield, 
  TrendingUp, 
  BookOpen, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Users, 
  BarChart3, 
  Zap,
  Globe,
  LayoutDashboard
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* HEADER */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-muted/20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-accent shadow-lg shadow-primary/20">
              <Shield className="h-6 w-6" />
            </div>
            <span className="text-2xl font-black italic tracking-tighter text-primary">
              Compro<span className="text-accent">misso</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors">Pilares</Link>
            <Link href="#impact" className="text-sm font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors">Impacto</Link>
            <Button asChild variant="ghost" className="text-sm font-black uppercase tracking-widest text-primary">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild className="bg-primary text-white font-black px-8 rounded-xl shadow-xl hover:scale-105 transition-all">
              <Link href="/register">Começar Agora</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 pt-20">
        {/* HERO SECTION */}
        <section className="relative py-24 md:py-32 overflow-hidden">
          <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-accent/5 rounded-full blur-[120px] -z-10 translate-x-1/2 -translate-y-1/2" />
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
              <Badge className="bg-accent/10 text-accent border-none font-black px-4 py-1.5 uppercase tracking-[0.2em] rounded-full">
                Tecnologia Industrial na Educação
              </Badge>
              <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-primary leading-[0.9]">
                Sua Aprovação é o nosso <span className="text-accent">Compromisso.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground font-medium italic leading-relaxed max-w-xl">
                Plataforma 360º que integra Inteligência Artificial (Aurora IA), gestão de dados e trilhas de alta performance para estudantes e educadores.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button asChild size="lg" className="h-16 px-10 bg-primary text-white font-black text-lg rounded-2xl shadow-2xl hover:scale-105 transition-all group">
                  <Link href="/register">
                    Iniciar Jornada <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-16 px-10 border-2 rounded-2xl font-black text-primary hover:bg-muted/50">
                  <Link href="/login">Acessar Portal</Link>
                </Button>
              </div>
              <div className="flex items-center gap-6 pt-8 border-t border-muted/20 opacity-60">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-accent" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Padrão INEP/ENEM</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-accent" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Rede Nacional</span>
                </div>
              </div>
            </div>
            <div className="relative animate-in fade-in zoom-in-95 duration-1000 delay-300">
              <div className="relative aspect-square md:aspect-video rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white group">
                <Image 
                  src="https://picsum.photos/seed/compromisso/1200/800" 
                  alt="Compromisso Dashboard" 
                  fill 
                  className="object-cover group-hover:scale-105 transition-transform duration-1000"
                  data-ai-hint="educational technology"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent" />
                <div className="absolute bottom-10 left-10 p-6 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 animate-bounce">
                  <Zap className="h-8 w-8 text-accent fill-accent" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PILARES SECTION */}
        <section id="features" className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
              <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-primary uppercase">Ecossistema 360º</h2>
              <p className="text-muted-foreground font-medium italic">Ferramentas profissionais para todos os níveis da gestão educacional.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* JORNADA DO ALUNO */}
              <Card className="border-none shadow-xl rounded-[2.5rem] bg-white p-10 space-y-8 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 group">
                <div className="h-16 w-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <TrendingUp className="h-8 w-8" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-black italic text-primary">Jornada do Aluno</h3>
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed italic">Trilhas de estudo adaptativas, simulados técnicos e correção de redação assistida pela Aurora IA.</p>
                </div>
                <ul className="space-y-3 pt-4 border-t border-muted/10">
                  {["Aurora IA 24/7", "Central de Redação", "Checklist SiSU/ProUni"].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-[10px] font-black uppercase text-primary/60 tracking-widest">
                      <CheckCircle2 className="h-3 w-3 text-accent" /> {item}
                    </li>
                  ))}
                </ul>
              </Card>

              {/* STUDIO MASTER */}
              <Card className="border-none shadow-xl rounded-[2.5rem] bg-white p-10 space-y-8 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 group">
                <div className="h-16 w-16 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-inner group-hover:bg-orange-600 group-hover:text-white transition-all">
                  <LayoutDashboard className="h-8 w-8" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-black italic text-primary">Studio do Mentor</h3>
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed italic">Ambiente de autoria para mentores. Crie trilhas, gerencie bancos de questões e monitore lives em tempo real.</p>
                </div>
                <ul className="space-y-3 pt-4 border-t border-muted/10">
                  {["Autoria de Trilhas", "Banco de Questões", "Console de Transmissão"].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-[10px] font-black uppercase text-primary/60 tracking-widest">
                      <CheckCircle2 className="h-3 w-3 text-accent" /> {item}
                    </li>
                  ))}
                </ul>
              </Card>

              {/* GABINETE DE GESTÃO */}
              <Card className="border-none shadow-xl rounded-[2.5rem] bg-white p-10 space-y-8 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 group">
                <div className="h-16 w-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-inner group-hover:bg-accent transition-all">
                  <BarChart3 className="h-8 w-8" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-black italic text-primary">Gabinete de Gestão</h3>
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed italic">Inteligência de rede para administradores. Dashboards de BI, auditoria de chats e supervisão ética.</p>
                </div>
                <ul className="space-y-3 pt-4 border-t border-muted/10">
                  {["Analytics em Tempo Real", "Auditoria de Mensagens", "Gestão de Matrículas"].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-[10px] font-black uppercase text-primary/60 tracking-widest">
                      <CheckCircle2 className="h-3 w-3 text-accent" /> {item}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-primary py-12 text-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-accent" />
            <span className="text-xl font-black italic tracking-tighter">Compromisso</span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">© 2024 Compromisso Smart Education • Tecnologia Industrial</p>
          <div className="flex gap-6">
            <Link href="/login" className="text-[10px] font-black uppercase tracking-widest hover:text-accent transition-colors">Acesso Restrito</Link>
            <Link href="/register" className="text-[10px] font-black uppercase tracking-widest hover:text-accent transition-colors">Novo Cadastro</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${className}`}>
      {children}
    </div>
  );
}
