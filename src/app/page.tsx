
"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Shield, 
  BookOpen, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  BarChart3, 
  Zap,
  Globe,
  Sparkles,
  GraduationCap,
  School,
  Users
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  const cityLogo = "https://upload.wikimedia.org/wikipedia/commons/7/77/Santana_Parna%C3%ADba.PNG";
  const heroImage = "https://i.postimg.cc/ZRCdsSjy/Whats-App-Image-2026-03-12-at-17-49-18.jpg";
  
  const galleryItems = [
    { url: "https://i.postimg.cc/QMnBTzsK/4.jpg" },
    { url: "https://i.postimg.cc/mgvJgL14/Whats-App-Image-2026-03-12-at-17-48-36.jpg" },
    { url: "https://i.postimg.cc/Px4Ry13T/2.jpg" },
    { url: "https://i.postimg.cc/J0YdVMCd/Whats-App-Image-2026-03-12-at-2.jpg" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* HEADER */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-2xl border-b border-muted/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-white p-1 shadow-lg border border-muted/10">
              <Image 
                src={cityLogo} 
                alt="Prefeitura de Santana de Parnaíba" 
                fill 
                unoptimized
                className="object-contain p-1"
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
            <Link href="#impact" className="text-xs font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors">Nosso Cursinho</Link>
            <Button asChild variant="ghost" className="text-xs font-black uppercase tracking-widest text-primary">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild className="bg-primary text-white font-black px-8 h-12 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all border-none">
              <Link href="/register">Começar Agora</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 pt-20">
        {/* HERO SECTION */}
        <section className="relative py-16 md:py-32 overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-white">
          <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-accent/10 rounded-full blur-[150px] -z-10 translate-x-1/2 -translate-y-1/2" />
          
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 items-center">
            <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000 text-center lg:text-left">
              <div className="flex items-center gap-3 bg-accent/10 text-accent border border-accent/20 font-black px-5 py-2 uppercase text-[10px] tracking-[0.3em] rounded-full w-fit shadow-inner mx-auto lg:mx-0">
                <Sparkles className="h-4 w-4" />
                Educação Pública de Alta Performance
              </div>
              <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter text-primary leading-[0.9]">
                Sua Aprovação <br />
                <span className="text-accent drop-shadow-sm">é o nosso Compromisso.</span>
              </h1>
              <p className="text-lg md:text-2xl text-muted-foreground font-medium italic leading-relaxed max-w-xl border-l-0 lg:border-l-4 border-accent/30 pl-0 lg:pl-6 mx-auto lg:mx-0">
                O portal oficial de apoio aos estudantes de Santana de Parnaíba. Tecnologia e mentoria unidas para o seu sucesso.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center lg:justify-start">
                <Button asChild size="lg" className="h-16 md:h-20 px-10 md:px-12 bg-primary text-white font-black text-lg md:text-xl rounded-[2rem] shadow-[0_20px_50px_-10px_rgba(26,44,75,0.4)] hover:scale-105 active:scale-95 transition-all group border-none">
                  <Link href="/register" className="flex items-center gap-4">
                    Iniciar Jornada <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-16 md:h-20 px-10 md:px-12 border-4 border-primary/10 rounded-[2rem] font-black text-primary hover:bg-primary hover:text-white transition-all text-lg md:text-xl shadow-xl">
                  <Link href="/login">Portal do Aluno</Link>
                </Button>
              </div>
            </div>
            
            <div className="relative animate-in fade-in zoom-in-95 duration-1000 delay-300">
              <div className="relative aspect-video lg:aspect-square rounded-[3rem] md:rounded-[4rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] border-[8px] md:border-[12px] border-white group">
                <Image 
                  src={heroImage} 
                  alt="Educação Santana de Parnaíba" 
                  fill 
                  priority
                  unoptimized
                  className="object-cover group-hover:scale-110 transition-transform duration-1000"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 md:bottom-10 md:left-10 md:right-10 p-6 md:p-8 bg-primary/80 backdrop-blur-xl rounded-[2rem] md:rounded-[2.5rem] text-white border border-white/10 shadow-2xl">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Status: Ambiente de Estudo</span>
                  </div>
                  <p className="text-sm md:text-lg font-black italic">"A educação transforma vidas. Aqui, transformamos o seu esforço em resultado real."</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PILARES SECTION */}
        <section id="features" className="py-24 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-20 space-y-6">
              <div className="h-1 w-20 bg-accent mx-auto rounded-full" />
              <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase leading-none">O Futuro do <span className="text-accent">Seu Aprendizado</span></h2>
              <p className="text-slate-400 font-medium text-lg italic">Ferramentas desenhadas para facilitar a jornada de alunos e mentores parnaibanos.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
              <Card className="border-none shadow-2xl rounded-[2.5rem] bg-slate-800/50 backdrop-blur-xl p-10 space-y-8 hover:bg-slate-800 transition-all duration-500 hover:-translate-y-4 group ring-1 ring-white/5">
                <div className="h-16 w-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-[0_20px_40px_-10px_rgba(37,99,235,0.5)] group-hover:rotate-6 transition-all duration-500">
                  <GraduationCap className="h-8 w-8" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-black italic text-white leading-none">Jornada do Aluno</h3>
                  <p className="text-slate-400 font-medium leading-relaxed italic text-sm">Organize seus estudos com trilhas adaptativas e receba feedbacks imediatos da Aurora IA.</p>
                </div>
                <ul className="space-y-3 pt-6 border-t border-white/5">
                  {["Apoio Aurora IA 24/7", "Correção de Redação", "Checklist de Matrícula"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-300 tracking-widest">
                      <CheckCircle2 className="h-4 w-4 text-accent" /> {item}
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="border-none shadow-2xl rounded-[2.5rem] bg-slate-800/50 backdrop-blur-xl p-10 space-y-8 hover:bg-slate-800 transition-all duration-500 hover:-translate-y-4 group ring-1 ring-white/5">
                <div className="h-16 w-16 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-[0_20px_40px_-10px_rgba(234,88,12,0.5)] group-hover:rotate-6 transition-all duration-500">
                  <School className="h-8 w-8" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-black italic text-white leading-none">Studio do Mentor</h3>
                  <p className="text-slate-400 font-medium leading-relaxed italic text-sm">Ferramentas de autoria para que os professores criem conteúdos focados na rede pública.</p>
                </div>
                <ul className="space-y-3 pt-6 border-t border-white/5">
                  {["Criação de Trilhas", "Banco de Questões", "Gestão de Comunicados"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-300 tracking-widest">
                      <CheckCircle2 className="h-4 w-4 text-accent" /> {item}
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="border-none shadow-2xl rounded-[3rem] bg-slate-800/50 backdrop-blur-xl p-10 space-y-8 hover:bg-slate-800 transition-all duration-500 hover:-translate-y-4 group ring-1 ring-white/5">
                <div className="h-16 w-16 rounded-2xl bg-white text-primary flex items-center justify-center shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)] group-hover:rotate-6 transition-all duration-500">
                  <BarChart3 className="h-8 w-8" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-black italic text-white leading-none">Gestão Discente</h3>
                  <p className="text-slate-400 font-medium leading-relaxed italic text-sm">Monitoramento do sucesso acadêmico para garantir que nenhum aluno fique para trás.</p>
                </div>
                <ul className="space-y-3 pt-6 border-t border-white/5">
                  {["Analytics de Evolução", "Auditoria de Acessos", "Busca Ativa Social"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-300 tracking-widest">
                      <CheckCircle2 className="h-4 w-4 text-accent" /> {item}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </section>

        {/* IMPACT SECTION */}
        <section id="impact" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center md:items-end justify-between mb-16 gap-8 text-center md:text-left">
              <div className="space-y-4 max-w-2xl">
                <h2 className="text-4xl md:text-5xl font-black text-primary italic tracking-tighter uppercase leading-none">Compromisso com o <span className="text-accent">Aprendizado Real</span></h2>
                <p className="text-slate-500 font-medium italic text-lg">Conheça os espaços e as pessoas que constroem nossa educação diariamente.</p>
              </div>
              <Button asChild variant="outline" className="h-14 px-8 rounded-2xl border-2 border-primary/10 text-primary font-black uppercase text-xs tracking-widest hover:bg-slate-50">
                <Link href="/register">Fazer Parte da Nossa Rede</Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {galleryItems.map((item, i) => (
                <div key={i} className="group relative aspect-[3/4] rounded-[2.5rem] overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-700 bg-slate-100">
                  <Image 
                    src={item.url} 
                    alt="Cotidiano Cursinho Compromisso" 
                    fill 
                    unoptimized
                    className="object-cover group-hover:scale-110 transition-transform duration-1000"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <div className="absolute bottom-8 left-8 right-8">
                    <p className="text-[9px] font-black text-accent uppercase tracking-[0.3em] mb-2">CURSINHO COMPROMISSO</p>
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
                  src={cityLogo} 
                  alt="Logo Santana de Parnaíba" 
                  fill 
                  unoptimized
                  className="object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-black italic tracking-tighter uppercase leading-none">Compromisso</span>
                <span className="text-[10px] font-black uppercase text-accent tracking-[0.3em]">Educação Inteligente</span>
              </div>
            </div>
            <p className="text-white/40 font-medium italic text-lg max-w-sm">
              Inovação na gestão educacional de Santana de Parnaíba através de dados e suporte humanizado ao aluno.
            </p>
          </div>
          <div className="space-y-6">
            <h5 className="font-black uppercase text-[10px] tracking-[0.4em] text-accent">Navegação</h5>
            <ul className="space-y-4 text-white/60 font-bold text-sm">
              <li><Link href="/login" className="hover:text-white transition-colors">Acesso ao Portal</Link></li>
              <li><Link href="/register" className="hover:text-white transition-colors">Novo Aluno</Link></li>
              <li><Link href="#features" className="hover:text-white transition-colors">Metodologia</Link></li>
            </ul>
          </div>
          <div className="space-y-6">
            <h5 className="font-black uppercase text-[10px] tracking-[0.4em] text-accent">Atendimento</h5>
            <ul className="space-y-4 text-white/60 font-bold text-sm">
              <li className="flex items-center gap-2"><Users className="h-4 w-4 text-accent" /> Polo Central - Santana</li>
              <li>Suporte Educacional 24/7</li>
              <li>contato@compromisso.edu.br</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">© 2024 Rede Educacional Santana de Parnaíba • Tecnologia Industrial</p>
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
