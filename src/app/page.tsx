
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
  Sparkles,
  GraduationCap,
  School,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import placeholderData from "@/app/lib/placeholder-images.json";

export default function LandingPage() {
  const getPlaceholder = (id: string) => placeholderData.placeholderImages.find(img => img.id === id);
  
  const logoImg = getPlaceholder("prefeitura-logo");
  const heroImg = getPlaceholder("hero-main");

  const galleryItems = [
    { id: "gallery-classroom", title: "Aulas Dinâmicas" },
    { id: "gallery-lab", title: "Inovação no Ensino" },
    { id: "gallery-live", title: "Apoio Remoto" },
    { id: "gallery-mentorship", title: "Espaços de Foco" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* HEADER - AMPLIADO E PROPORCIONAL */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-2xl border-b border-muted/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 rounded-2xl bg-primary flex items-center justify-center text-accent shadow-xl shadow-primary/20 rotate-3 p-2 overflow-hidden">
              {logoImg && (
                <Image 
                  src={logoImg.imageUrl} 
                  alt={logoImg.description} 
                  fill 
                  className="object-contain" 
                  unoptimized 
                  data-ai-hint={logoImg.imageHint}
                />
              )}
            </div>
            <span className="text-3xl font-black italic tracking-tighter text-primary">
              Compro<span className="text-accent">misso</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-10">
            <Link href="#features" className="text-sm font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors">Metodologia</Link>
            <Link href="#impact" className="text-sm font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors">Pólo SP</Link>
            <Button asChild className="bg-primary text-white font-black px-10 h-14 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all border-none text-sm uppercase tracking-wider">
              <Link href="/login">Entrar no Portal</Link>
            </Button>
            <Button asChild variant="ghost" className="text-sm font-black uppercase tracking-widest text-primary">
              <Link href="/register">Nova Matrícula</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 pt-24">
        {/* HERO SECTION */}
        <section className="relative py-24 md:py-40 overflow-hidden bg-gradient-to-br from-white via-blue-50/30 to-white">
          <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-accent/10 rounded-full blur-[150px] -z-10 translate-x-1/2 -translate-y-1/2 animate-pulse" />
          
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-10 animate-in fade-in slide-in-from-left-8 duration-1000">
              <div className="flex items-center gap-3 bg-accent/10 text-accent border border-accent/20 font-black px-5 py-2 uppercase text-[10px] tracking-[0.3em] rounded-full w-fit shadow-inner">
                <Sparkles className="h-4 w-4" />
                Educação de Excelência em Santana de Parnaíba
              </div>
              <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter text-primary leading-[0.85]">
                Sua Aprovação <br />
                <span className="text-accent drop-shadow-sm">é o nosso Compromisso.</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground font-medium italic leading-relaxed max-w-xl border-l-4 border-accent/30 pl-6">
                O curso preparatório oficial que une tradição pedagógica, mentoria especializada e trilhas de alta performance para o seu sucesso acadêmico.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 pt-4">
                <Button asChild size="lg" className="h-20 px-12 bg-primary text-white font-black text-xl rounded-[2rem] shadow-[0_20px_50px_-10px_rgba(26,44,75,0.4)] hover:scale-105 active:scale-95 transition-all group border-none">
                  <Link href="/login" className="flex items-center gap-4">
                    Acessar Meu Portal <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform" />
                  </Link>
                </Button>
              </div>
            </div>
            
            <div className="relative animate-in fade-in zoom-in-95 duration-1000 delay-300">
              <div className="relative aspect-[4/5] md:aspect-square rounded-[4rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] border-[12px] border-white group bg-slate-100">
                {heroImg && (
                  <Image 
                    src={heroImg.imageUrl} 
                    alt={heroImg.description} 
                    fill 
                    className="object-cover group-hover:scale-110 transition-transform duration-1000"
                    data-ai-hint={heroImg.imageHint}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent" />
                <div className="absolute bottom-10 left-10 right-10 p-8 bg-primary/80 backdrop-blur-xl rounded-[2.5rem] text-white border border-white/10 shadow-2xl">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Status: Matrículas Abertas</span>
                  </div>
                  <p className="text-lg font-black italic">"O Curso Compromisso acelera a curva de aprendizado e garante foco total nos seus objetivos."</p>
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
              <h2 className="text-5xl md:text-6xl font-black italic tracking-tighter uppercase leading-none">Diferenciais do <span className="text-accent">Nosso Ensino</span></h2>
              <p className="text-slate-400 font-medium text-lg italic">Metodologia industrial aplicada à educação para alunos, mentores e gestores de Santana de Parnaíba.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {/* JORNADA DO ALUNO */}
              <Card className="border-none shadow-2xl rounded-[3rem] bg-slate-800/50 backdrop-blur-xl p-12 space-y-10 hover:bg-slate-800 transition-all duration-500 hover:-translate-y-4 group ring-1 ring-white/5">
                <div className="h-20 w-20 rounded-3xl bg-blue-600 text-white flex items-center justify-center shadow-[0_20px_40px_-10px_rgba(37,99,235,0.5)] group-hover:rotate-6 transition-all duration-500">
                  <GraduationCap className="h-10 w-10" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-3xl font-black italic text-white leading-none">Jornada de Estudo</h3>
                  <p className="text-slate-400 font-medium leading-relaxed italic">Aulas dinâmicas, material didático atualizado e suporte pedagógico integral para ENEM e ETEC.</p>
                </div>
                <ul className="space-y-4 pt-6 border-t border-white/5">
                  {["Apoio Pedagógico 24/7", "Central de Redação", "Checklist SiSU/ProUni"].map((item, i) => (
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
                  <h3 className="text-3xl font-black italic text-white leading-none">Corpo Docente</h3>
                  <p className="text-slate-400 font-medium leading-relaxed italic">Professores e mentores dedicados, focados no acompanhamento individual e na evolução constante de cada aluno.</p>
                </div>
                <ul className="space-y-4 pt-6 border-t border-white/5">
                  {["Mentoria Especializada", "Banco de Questões", "Aulas de Revisão"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-xs font-black uppercase text-slate-300 tracking-widest">
                      <CheckCircle2 className="h-4 w-4 text-accent" /> {item}
                    </li>
                  ))}
                </ul>
              </Card>

              {/* MONITORAMENTO */}
              <Card className="border-none shadow-2xl rounded-[3rem] bg-slate-800/50 backdrop-blur-xl p-12 space-y-10 hover:bg-slate-800 transition-all duration-500 hover:-translate-y-4 group ring-1 ring-white/5">
                <div className="h-20 w-20 rounded-3xl bg-white text-primary flex items-center justify-center shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)] group-hover:rotate-6 transition-all duration-500">
                  <BarChart3 className="h-10 w-10" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-3xl font-black italic text-white leading-none">Monitoramento</h3>
                  <p className="text-slate-400 font-medium leading-relaxed italic">Acompanhamento de performance baseado em simulados reais e diagnóstico contínuo de aprendizagem.</p>
                </div>
                <ul className="space-y-4 pt-6 border-t border-white/5">
                  {["Simulados Regulares", "Auditoria de Evolução", "Gestão de Matrículas"].map((item, i) => (
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
                <h2 className="text-5xl font-black text-primary italic tracking-tighter uppercase leading-none">Ambiente de <span className="text-accent">Foco Total</span></h2>
                <p className="text-slate-500 font-medium italic text-lg">Veja como nossa infraestrutura transforma o cotidiano dos nossos alunos em Santana de Parnaíba.</p>
              </div>
              <Button asChild variant="outline" className="h-14 px-8 rounded-2xl border-2 border-primary/10 text-primary font-black uppercase text-xs tracking-widest hover:bg-slate-50">
                <Link href="/login">Acessar Meu Portal</Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {galleryItems.map((item, i) => {
                const img = getPlaceholder(item.id);
                return (
                  <div key={i} className="group relative aspect-[3/4] rounded-[2.5rem] overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-700 bg-slate-100">
                    {img && (
                      <Image 
                        src={img.imageUrl} 
                        alt={img.description} 
                        fill 
                        className="object-cover group-hover:scale-110 transition-transform duration-1000"
                        data-ai-hint={img.imageHint}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-8 left-8 right-8">
                      <p className="text-[10px] font-black text-accent uppercase tracking-[0.3em] mb-2">INFRAESTRUTURA REAL</p>
                      <h4 className="text-xl font-black text-white italic">{item.title}</h4>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-gradient-to-br from-primary via-primary to-slate-950 py-24 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] -z-0 translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-0 left-0 w-[300px] h-[300px] bg-white/5 rounded-full blur-[100px] -z-0 -translate-x-1/2 -translate-y-1/2" />
        
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 relative z-10">
          <div className="space-y-8 col-span-1 lg:col-span-2">
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14 overflow-hidden rounded-2xl shadow-2xl bg-white p-2 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                {logoImg && (
                  <Image 
                    src={logoImg.imageUrl} 
                    alt={logoImg.description} 
                    fill 
                    unoptimized
                    className="object-contain p-1"
                  />
                )}
              </div>
              <span className="text-4xl font-black italic tracking-tighter uppercase">Compro<span className="text-accent">misso</span></span>
            </div>
            <p className="text-white/50 font-medium italic text-xl max-w-sm leading-relaxed">
              Transformando o futuro dos jovens de Santana de Parnaíba através da educação de alta performance e compromisso real.
            </p>
          </div>
          <div className="space-y-8">
            <h5 className="font-black uppercase text-[11px] tracking-[0.5em] text-accent/80 border-l-4 border-accent pl-4">Acesso Rápido</h5>
            <ul className="space-y-5 text-white/60 font-bold text-sm">
              <li><Link href="/login" className="hover:text-white transition-all hover:translate-x-2 inline-block font-black uppercase text-[11px] tracking-widest">Portal do Aluno</Link></li>
              <li><Link href="/register" className="hover:text-white transition-all hover:translate-x-2 inline-block">Nova Matrícula</Link></li>
              <li><Link href="#features" className="hover:text-white transition-all hover:translate-x-2 inline-block">Nossa Metodologia</Link></li>
            </ul>
          </div>
          <div className="space-y-8">
            <h5 className="font-black uppercase text-[11px] tracking-[0.5em] text-accent/80 border-l-4 border-accent pl-4">Atendimento</h5>
            <ul className="space-y-5 text-white/60 font-bold text-sm">
              <li className="flex items-center gap-3">
                <div className="h-1 w-4 bg-accent/30 rounded-full" />
                contato@compromisso.edu.br
              </li>
              <li className="flex items-center gap-3">
                <div className="h-1 w-4 bg-accent/30 rounded-full" />
                Pólo Santana de Parnaíba - Centro
              </li>
              <li className="flex items-center gap-3">
                <div className="h-1 w-4 bg-accent/30 rounded-full" />
                Secretaria: Segunda a Sexta
              </li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 mt-24 pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-10 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
            <p className="text-[11px] font-black uppercase tracking-[0.5em] opacity-30 italic">© 2024 Curso Compromisso • Educação de Alta Performance</p>
          </div>
          <div className="flex gap-10 opacity-30 grayscale hover:grayscale-0 transition-all duration-500">
            <Globe className="h-6 w-6 hover:text-accent transition-colors cursor-pointer" />
            <ShieldCheck className="h-6 w-6 hover:text-accent transition-colors cursor-pointer" />
            <Zap className="h-6 w-6 hover:text-accent transition-colors cursor-pointer" />
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
