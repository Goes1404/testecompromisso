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
  LayoutDashboard,
  Sparkles,
  GraduationCap,
  School,
  Building2,
  Video,
  History as HistoryIcon
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  const logoUrl = "https://upload.wikimedia.org/wikipedia/commons/7/77/Santana_Parna%C3%ADba.PNG";
  const bgUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Centro_Hist%C3%B3rico_de_Santana_de_Parna%C3%ADba_-_SP.jpg/1280px-Centro_Hist%C3%B3rico_de_Santana_de_Parna%C3%ADba_-_SP.jpg";

  return (
    <div className="flex min-h-screen flex-col bg-white relative">
      {/* Background Histórico (Ponto 1: Centro) */}
      <div 
        className="bg-santana-fixed" 
        style={{ backgroundImage: `url('${bgUrl}')` }} 
      />
      
      {/* HEADER */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-2xl border-b border-muted/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden">
              <Image 
                src={logoUrl} 
                alt="Logo Santana de Parnaíba" 
                fill 
                unoptimized
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black italic tracking-tighter text-primary leading-none uppercase">
                Compro<span className="text-accent">misso</span>
              </span>
              <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mt-1">Educação Inteligente</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-xs font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors">Pilares</Link>
            <Button asChild variant="ghost" className="text-xs font-black uppercase tracking-widest text-primary">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild className="bg-primary text-white font-black px-8 h-12 rounded-xl shadow-xl hover:scale-105 active:scale-95 transition-all border-none">
              <Link href="/register">Começar Agora</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 pt-20">
        {/* HERO SECTION - Degrade do Azul Royal institucional para o Branco */}
        <section className="relative py-24 md:py-40 overflow-hidden bg-gradient-to-b from-primary/10 via-primary/5 to-white">
          <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-accent/5 rounded-full blur-[150px] -z-10 translate-x-1/2 -translate-y-1/2 animate-pulse" />
          
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-10 animate-in fade-in slide-in-from-left-8 duration-1000">
              <div className="flex items-center gap-3 bg-accent/10 text-accent border border-accent/20 font-black px-5 py-2 uppercase text-[10px] tracking-[0.3em] rounded-full w-fit shadow-inner">
                <Sparkles className="h-4 w-4" />
                Tecnologia Oficial na Educação
              </div>
              <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter text-primary leading-[0.85] uppercase">
                Sua Aprovação <br />
                <span className="text-accent drop-shadow-sm">é o nosso Compromisso.</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground font-medium italic leading-relaxed max-w-xl border-l-4 border-accent/30 pl-6">
                Plataforma de alta performance de Santana de Parnaíba que integra Inteligência Artificial e dados para acelerar o aprendizado.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 pt-4">
                <Button asChild size="lg" className="h-20 px-12 bg-primary text-white font-black text-xl rounded-2xl shadow-[0_20px_50px_-10px_rgba(0,71,171,0.4)] hover:scale-105 active:scale-95 transition-all group border-none">
                  <Link href="/register" className="flex items-center gap-4">
                    Iniciar Jornada <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform text-accent" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-20 px-12 border-4 border-primary/10 rounded-2xl font-black text-primary hover:bg-primary hover:text-white transition-all text-xl shadow-xl">
                  <Link href="/login">Acessar Portal</Link>
                </Button>
              </div>
            </div>
            
            <div className="relative animate-in fade-in zoom-in-95 duration-1000 delay-300">
              <div className="relative aspect-[4/5] md:aspect-square rounded-[3rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] border-[12px] border-white group">
                <Image 
                  src="https://picsum.photos/seed/santana-edu/1000/1200" 
                  alt="Educação Santana" 
                  fill 
                  className="object-cover group-hover:scale-110 transition-transform duration-1000"
                  data-ai-hint="modern student"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent" />
                <div className="absolute bottom-10 left-10 right-10 p-8 bg-white/90 backdrop-blur-xl rounded-[2rem] text-primary border border-white/10 shadow-2xl">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Status: Ambiente de Estudo Ativo</span>
                  </div>
                  <p className="text-lg font-black italic uppercase leading-tight">"A história de Santana de Parnaíba é o alicerce para o conhecimento do futuro."</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PILARES SECTION */}
        <section id="features" className="py-32 bg-gradient-to-b from-primary to-slate-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Centro_Hist%C3%B3rico_de_Santana_de_Parna%C3%ADba_-_SP.jpg/1280px-Centro_Hist%C3%B3rico_de_Santana_de_Parna%C3%ADba_-_SP.jpg')] bg-cover bg-center grayscale" />
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-24 space-y-6">
              <div className="h-1.5 w-24 bg-accent mx-auto rounded-full" />
              <h2 className="text-5xl md:text-6xl font-black italic tracking-tighter uppercase leading-none">Ecossistema <span className="text-accent">Compromisso 360</span></h2>
              <p className="text-white/60 font-medium text-lg italic">Inteligência municipal a serviço da rede de ensino.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white/10 backdrop-blur-xl p-12 space-y-8 hover:bg-white/20 transition-all duration-500 group ring-1 ring-white/10">
                <div className="h-20 w-20 rounded-2xl bg-accent text-primary flex items-center justify-center shadow-2xl group-hover:rotate-6 transition-all duration-500">
                  <GraduationCap className="h-10 w-10" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-3xl font-black italic text-white leading-none uppercase">Jornada do Aluno</h3>
                  <p className="text-white/70 font-medium leading-relaxed italic">Trilhas adaptativas e simulados com auditoria Aurora IA para acelerar sua aprovação.</p>
                </div>
              </Card>

              <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white/10 backdrop-blur-xl p-12 space-y-8 hover:bg-white/20 transition-all duration-500 group ring-1 ring-white/10">
                <div className="h-20 w-20 rounded-2xl bg-white text-primary flex items-center justify-center shadow-2xl group-hover:rotate-6 transition-all duration-500">
                  <School className="h-10 w-10" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-3xl font-black italic text-white leading-none uppercase">Studio Master</h3>
                  <p className="text-white/70 font-medium leading-relaxed italic">Ambiente de autoria para mentores. Gestão de lives e criação de conteúdos exclusivos.</p>
                </div>
              </Card>

              <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white/10 backdrop-blur-xl p-12 space-y-8 hover:bg-white/20 transition-all duration-500 group ring-1 ring-white/10">
                <div className="h-20 w-20 rounded-2xl bg-accent text-primary flex items-center justify-center shadow-2xl group-hover:rotate-6 transition-all duration-500">
                  <BarChart3 className="h-10 w-10" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-3xl font-black italic text-white leading-none uppercase">Gestão de Dados</h3>
                  <p className="text-white/70 font-medium leading-relaxed italic">Inteligência analítica para administradores. Supervisão ética e dashboards de BI.</p>
                </div>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER - TEMA ESCURO INDUSTRIAL COM GRADIENTE DE TRANSIÇÃO */}
      <footer className="bg-gradient-to-b from-slate-900 to-black py-20 text-white relative border-t border-white/5 overflow-hidden">
        {/* Glow de Profundidade */}
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
        
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 relative z-10">
          <div className="space-y-6 col-span-1 lg:col-span-2">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 overflow-hidden bg-white/10 rounded-xl p-2 backdrop-blur-sm shadow-xl">
                <Image 
                  src={logoUrl} 
                  alt="Logo Santana de Parnaíba" 
                  fill 
                  unoptimized
                  className="object-contain"
                />
              </div>
              <span className="text-3xl font-black italic tracking-tighter uppercase text-white">Compromisso</span>
            </div>
            <p className="text-white/40 font-medium italic text-lg max-w-sm">
              Transformando a educação de Santana de Parnaíba através de dados e IA de ponta.
            </p>
          </div>
          <div className="space-y-6">
            <h5 className="font-black uppercase text-[10px] tracking-[0.4em] text-accent">Links Rápidos</h5>
            <ul className="space-y-4 text-white/60 font-bold text-sm">
              <li><Link href="/login" className="hover:text-accent transition-colors">Acesso Restrito</Link></li>
              <li><Link href="/register" className="hover:text-accent transition-colors">Novo Cadastro</Link></li>
            </ul>
          </div>
          <div className="space-y-6">
            <h5 className="font-black uppercase text-[10px] tracking-[0.4em] text-accent">Atendimento</h5>
            <ul className="space-y-4 text-white/60 font-bold text-sm italic">
              <li>contato@compromisso.edu.br</li>
              <li>Polo Central - Santana de Parnaíba</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 italic">© 2024 Prefeitura de Santana de Parnaíba • Tecnologia Industrial na Educação</p>
          <div className="flex gap-8 opacity-40">
            <Globe className="h-5 w-5" />
            <ShieldCheck className="h-5 w-5" />
            <Zap className="h-5 w-5" />
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
