
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
  Video,
  History as HistoryIcon
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* HEADER */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-2xl border-b border-muted/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-white p-1 shadow-lg border border-muted/10">
              <Image 
                src="https://upload.wikimedia.org/wikipedia/commons/7/77/Santana_Parna%C3%ADba.PNG" 
                alt="Prefeitura de Santana de Parnaíba" 
                fill 
                unoptimized
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black italic tracking-tighter text-primary leading-none">
                Compro<span className="text-accent">misso</span>
              </span>
              <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mt-1">Educação Inteligente</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-xs font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors">Ecossistema</Link>
            <Link href="#impact" className="text-xs font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors">Impacto</Link>
            <Button asChild variant="ghost" className="text-xs font-black uppercase tracking-widest text-primary">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild className="bg-primary text-white font-black px-8 h-12 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all">
              <Link href="/register">Começar Agora</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 pt-20">
        {/* HERO SECTION - Degradê Azul maestro para branco */}
        <section className="relative py-24 md:py-40 overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-white">
          <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-accent/10 rounded-full blur-[150px] -z-10 translate-x-1/2 -translate-y-1/2" />
          
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-10 animate-in fade-in slide-in-from-left-8 duration-1000">
              <div className="flex items-center gap-3 bg-accent/10 text-accent border border-accent/20 font-black px-5 py-2 uppercase text-[10px] tracking-[0.3em] rounded-full w-fit shadow-inner">
                <Sparkles className="h-4 w-4" />
                Tecnologia Municipal de Alta Performance
              </div>
              <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter text-primary leading-[0.85]">
                Sua Aprovação <br />
                <span className="text-accent drop-shadow-sm">é o nosso Compromisso.</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground font-medium italic leading-relaxed max-w-xl border-l-4 border-accent/30 pl-6">
                A plataforma oficial de Santana de Parnaíba que utiliza IA para monitorar e acelerar a jornada pedagógica de cada aluno.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 pt-4">
                <Button asChild size="lg" className="h-20 px-12 bg-primary text-white font-black text-xl rounded-[2rem] shadow-[0_20px_50px_-10px_rgba(26,44,75,0.4)] hover:scale-105 active:scale-95 transition-all group border-none">
                  <Link href="/register" className="flex items-center gap-4">
                    Iniciar Jornada <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-20 px-12 border-4 border-primary/10 rounded-[2rem] font-black text-primary hover:bg-primary hover:text-white transition-all text-xl shadow-xl">
                  <Link href="/login">Portal do Aluno</Link>
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-8 pt-10 border-t border-muted/20">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 shadow-sm"><ShieldCheck className="h-6 w-6" /></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">Padrão ENEM Santana</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm"><Globe className="h-6 w-6" /></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">Rede Educacional 360</span>
                </div>
              </div>
            </div>
            
            <div className="relative animate-in fade-in zoom-in-95 duration-1000 delay-300">
              <div className="relative aspect-[4/5] md:aspect-square rounded-[4rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] border-[12px] border-white group">
                <Image 
                  src="https://i.postimg.cc/QMnBTzsK/4.jpg" 
                  alt="Educação Santana de Parnaíba" 
                  fill 
                  className="object-cover group-hover:scale-110 transition-transform duration-1000"
                  data-ai-hint="classroom students lecture"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent" />
                <div className="absolute top-10 right-10 p-8 bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/20 animate-bounce">
                  <Zap className="h-10 w-10 text-accent fill-accent" />
                </div>
                <div className="absolute bottom-10 left-10 right-10 p-8 bg-primary/80 backdrop-blur-xl rounded-[2.5rem] text-white border border-white/10 shadow-2xl">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Status: Rede Ativa</span>
                  </div>
                  <p className="text-lg font-black italic">"A educação de Santana de Parnaíba evolui com inteligência e compromisso real."</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PILARES SECTION */}
        <section id="features" className="py-32 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-24 space-y-6">
              <div className="h-1 w-20 bg-accent mx-auto rounded-full" />
              <h2 className="text-5xl md:text-6xl font-black italic tracking-tighter uppercase leading-none">Ecossistema <span className="text-accent">Compromisso 360</span></h2>
              <p className="text-slate-400 font-medium text-lg italic">A face moderna da educação para alunos e mentores parnaibanos.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {/* JORNADA DO ALUNO */}
              <Card className="border-none shadow-2xl rounded-[3rem] bg-slate-800/50 backdrop-blur-xl p-12 space-y-10 hover:bg-slate-800 transition-all duration-500 hover:-translate-y-4 group ring-1 ring-white/5">
                <div className="h-20 w-20 rounded-3xl bg-blue-600 text-white flex items-center justify-center shadow-[0_20px_40px_-10px_rgba(37,99,235,0.5)] group-hover:rotate-6 transition-all duration-500">
                  <GraduationCap className="h-10 w-10" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-3xl font-black italic text-white leading-none">Jornada do Aluno</h3>
                  <p className="text-slate-400 font-medium leading-relaxed italic">Trilhas de estudo adaptativas e correção de redação pela Aurora IA.</p>
                </div>
                <ul className="space-y-4 pt-6 border-t border-white/5">
                  {["Aurora IA 24/7", "Central de Redação", "Checklist SiSU/ProUni"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-xs font-black uppercase text-slate-300 tracking-widest">
                      <CheckCircle2 className="h-4 w-4 text-accent" /> {item}
                    </li>
                  ))}
                </ul>
              </Card>

              {/* STUDIO MASTER */}
              <Card className="border-none shadow-2xl rounded-[3rem] bg-slate-800/50 backdrop-blur-xl p-12 space-y-10 hover:bg-slate-800 transition-all duration-500 hover:-translate-y-4 group ring-1 ring-white/5">
                <div className="h-20 w-20 rounded-3xl bg-orange-600 text-white flex items-center justify-center shadow-[0_20px_40px_-10px_rgba(234,88,12,0.5)] group-hover:rotate-6 transition-all duration-500">
                  <School className="h-10 w-10" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-3xl font-black italic text-white leading-none">Studio do Mentor</h3>
                  <p className="text-slate-400 font-medium leading-relaxed italic">Ambiente de autoria para os mentores da rede pública.</p>
                </div>
                <ul className="space-y-4 pt-6 border-t border-white/5">
                  {["Autoria de Trilhas", "Banco de Questões", "Console de Transmissão"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-xs font-black uppercase text-slate-300 tracking-widest">
                      <CheckCircle2 className="h-4 w-4 text-accent" /> {item}
                    </li>
                  ))}
                </ul>
              </Card>

              {/* GABINETE DE GESTÃO */}
              <Card className="border-none shadow-2xl rounded-[3rem] bg-slate-800/50 backdrop-blur-xl p-12 space-y-10 hover:bg-slate-800 transition-all duration-500 hover:-translate-y-4 group ring-1 ring-white/5">
                <div className="h-20 w-20 rounded-3xl bg-white text-primary flex items-center justify-center shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)] group-hover:rotate-6 transition-all duration-500">
                  <BarChart3 className="h-10 w-10" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-3xl font-black italic text-white leading-none">Gestão de Dados</h3>
                  <p className="text-slate-400 font-medium leading-relaxed italic">Inteligência municipal para monitorar o sucesso discente.</p>
                </div>
                <ul className="space-y-4 pt-6 border-t border-white/5">
                  {["Analytics em Tempo Real", "Auditoria de Rede", "Gestão de Isenções"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-xs font-black uppercase text-slate-300 tracking-widest">
                      <CheckCircle2 className="h-4 w-4 text-accent" /> {item}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </section>

        {/* EXEMPLOS ESCOLARES SECTION */}
        <section className="py-32 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row items-end justify-between mb-20 gap-8">
              <div className="space-y-4 max-w-2xl">
                <h2 className="text-5xl font-black text-primary italic tracking-tighter uppercase leading-none">Ambiente de <span className="text-accent">Alta Performance</span></h2>
                <p className="text-slate-500 font-medium italic text-lg">Veja como nossa tecnologia transforma o cotidiano parnaibano.</p>
              </div>
              <Button asChild variant="outline" className="h-14 px-8 rounded-2xl border-2 border-primary/10 text-primary font-black uppercase text-xs tracking-widest hover:bg-slate-50">
                <Link href="/register">Ver Demonstração Completa</Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: "Salas Inteligentes", hint: "modern school classroom", icon: School },
                { title: "Laboratórios Digitais", hint: "science lab education", icon: ShieldCheck },
                { title: "Estúdios de Live", hint: "video broadcast studio", icon: Video },
                { title: "Espaços de Mentoria", hint: "co-working study space", icon: HistoryIcon },
              ].map((item, i) => (
                <div key={i} className="group relative aspect-[3/4] rounded-[2.5rem] overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-700">
                  <Image 
                    src={`https://picsum.photos/seed/school-${i}/600/800`} 
                    alt={item.title} 
                    fill 
                    className="object-cover group-hover:scale-110 transition-transform duration-1000"
                    data-ai-hint={item.hint}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-8 left-8 right-8">
                    <p className="text-[10px] font-black text-accent uppercase tracking-[0.3em] mb-2">INFRAESTRUTURA</p>
                    <h4 className="text-xl font-black text-white italic">{item.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-950 py-20 text-white relative border-t border-white/5 overflow-hidden">
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 relative z-10">
          <div className="space-y-6 col-span-1 lg:col-span-2">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-white p-2 shadow-2xl">
                <Image 
                  src="https://upload.wikimedia.org/wikipedia/commons/7/77/Santana_Parna%C3%ADba.PNG" 
                  alt="Logo Santana de Parnaíba" 
                  fill 
                  unoptimized
                  className="object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-black italic tracking-tighter uppercase">Compromisso</span>
                <span className="text-[10px] font-black uppercase text-accent tracking-[0.3em]">Educação Inteligente</span>
              </div>
            </div>
            <p className="text-white/40 font-medium italic text-lg max-w-sm">
              Transformando a gestão educacional de Santana de Parnaíba através de dados e inteligência artificial de ponta.
            </p>
          </div>
          <div className="space-y-6">
            <h5 className="font-black uppercase text-[10px] tracking-[0.4em] text-accent">Links Rápidos</h5>
            <ul className="space-y-4 text-white/60 font-bold text-sm">
              <li><Link href="/login" className="hover:text-white transition-colors">Acesso Restrito</Link></li>
              <li><Link href="/register" className="hover:text-white transition-colors">Novo Cadastro</Link></li>
              <li><Link href="#features" className="hover:text-white transition-colors">Metodologia</Link></li>
            </ul>
          </div>
          <div className="space-y-6">
            <h5 className="font-black uppercase text-[10px] tracking-[0.4em] text-accent">Atendimento</h5>
            <ul className="space-y-4 text-white/60 font-bold text-sm">
              <li>contato@compromisso.edu.br</li>
              <li>Polo Central - SP</li>
              <li>Suporte 24/7</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">© 2024 Prefeitura de Santana de Parnaíba • Tecnologia Industrial</p>
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
