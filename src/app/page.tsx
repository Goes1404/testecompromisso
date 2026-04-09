"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CheckCircle2,
  ArrowRight,
  BarChart3,
  Zap,
  Star,
  Users,
  BookOpen,
  Target,
  TrendingUp,
  ChevronRight,
  Menu,
  X,
  Play,
  GraduationCap,
  School,
  Globe,
  Shield,
  MapPin,
  Mail,
  Award,
  BookMarked,
  Lightbulb,
  Loader2,
  BrainCircuit,
  LineChart,
  MessageSquare,
  PlayCircle
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleRedirect = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    if (isRedirecting) return;
    setIsRedirecting(true);
    setTimeout(() => {
      router.push(path);
    }, 600);
  };

  const handleScrollTo = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const galleryItems = [
    { title: "Labs", img: "/images/carrosel1.jpeg" },
    { title: "Ensino", img: "/images/carrosel2.jpeg" },
    { title: "Apoio", img: "/images/carrosel3.jpeg" },
    { title: "Foco", img: "/images/carrosel4.jpeg" },
  ];

  const stats = [
    { value: "500+", label: "Aprovações Reais", icon: GraduationCap },
    { value: "98%", label: "Índice de Sucesso", icon: Star },
    { value: "50+", label: "Professores Elite", icon: Users },
    { value: "24/7", label: "Suporte com IA", icon: Zap },
  ];

  const mapsUrl = "https://www.google.com/maps/search/?api=1&query=R.+Cel.+Raimundo,+32+-+Centro,+Santana+de+Parnaíba+-+SP,+06501-010";

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-950 selection:bg-primary/20 selection:text-primary scroll-smooth relative">
      
      {/* Transição de Tela de Carregamento */}
      {isRedirecting && (
        <div className="fixed inset-0 z-[200] bg-gray-950 animate-in fade-in duration-500 flex flex-col items-center justify-center gap-4">
          <div className="relative h-16 w-16 flex items-center justify-center animate-pulse">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
          </div>
          <h2 className="text-xl font-black text-white italic uppercase tracking-tighter animate-pulse">Acessando o Portal...</h2>
        </div>
      )}

      {/* HEADER PREMIUM - Mais imponente e sempre visível */}
      <header
        className={`fixed top-0 w-full z-[60] transition-all duration-500 border-b ${scrolled
          ? 'bg-white/95 md:bg-white/95 backdrop-blur-xl py-2 shadow-lg border-gray-100'
          : 'bg-black/20 backdrop-blur-sm py-4 border-white/5'
          }`}
        style={scrolled && typeof window !== 'undefined' && window.innerWidth < 768 ? { backgroundColor: 'rgba(255, 107, 0, 0.95)', borderBottom: 'none' } : {}}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-14 md:h-16">
          <div className="flex items-center">
            <Link href="/" onClick={(e) => handleScrollTo(e, '#home')} className="flex items-center group">
              <div className="relative h-10 w-10 md:h-12 md:w-12 overflow-hidden rounded-xl shadow-lg bg-white p-1.5 transition-transform group-hover:rotate-6 duration-500">
                <Image 
                  src="/images/logocompromisso.png" 
                  alt="Logo Compromisso" 
                  fill 
                  unoptimized
                  className="object-contain p-1"
                />
              </div>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-10">
            <a href="#metodologia" onClick={(e) => handleScrollTo(e, '#metodologia')} className={`text-sm font-black transition-all flex items-center group cursor-pointer ${scrolled ? 'text-gray-600 hover:text-primary' : 'text-white hover:text-primary'}`}>
              <span className="group-hover:translate-x-1 transition-transform">Metodologia</span>
            </a>
            <a href="#resultados" onClick={(e) => handleScrollTo(e, '#resultados')} className={`text-sm font-black transition-all flex items-center group cursor-pointer ${scrolled ? 'text-gray-600 hover:text-primary' : 'text-white hover:text-primary'}`}>
              <span className="group-hover:translate-x-1 transition-transform">Resultados</span>
            </a>
            <a href="#faq" onClick={(e) => handleScrollTo(e, '#faq')} className={`text-sm font-black transition-all flex items-center group cursor-pointer ${scrolled ? 'text-gray-600 hover:text-primary' : 'text-white hover:text-primary'}`}>
              <span className="group-hover:translate-x-1 transition-transform">Dúvidas</span>
            </a>
            <div className="flex items-center gap-3">
              <Button onClick={(e) => handleRedirect(e, '/login')} variant="ghost" className={`font-black h-10 px-4 rounded-full transition-all active:scale-95 border-none ${scrolled ? 'text-primary hover:bg-primary/10' : 'text-white hover:bg-white/10'}`}>
                Entrar
              </Button>
              <Button onClick={(e) => handleRedirect(e, '/register')} className="bg-primary hover:bg-[#e06000] text-white font-black h-10 px-6 rounded-full shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all active:scale-95 border-none">
                Criar Conta
              </Button>
            </div>
          </nav>

          <button 
            className={`md:hidden flex items-center gap-2 py-2 px-4 rounded-full transition-all active:scale-95 shadow-lg ${
              scrolled ? 'bg-primary text-white shadow-primary/30 border-none' : 'bg-white/10 text-white backdrop-blur-md border border-white/20'
            }`} 
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="text-[11px] font-black uppercase tracking-widest pt-0.5">Menu</span>
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* MOBILE MENU */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[110] bg-white animate-in slide-in-from-right duration-500 md:hidden">
          <div className="p-8 flex justify-between items-center border-b border-gray-100">
            <span className="text-2xl font-black text-primary italic uppercase tracking-tighter">Compromisso</span>
            <button 
              onClick={() => setMobileMenuOpen(false)} 
              className="flex items-center gap-2 py-2 px-4 bg-gray-50 text-gray-400 rounded-full active:scale-95 transition-all text-[11px] font-black uppercase tracking-widest border border-gray-100"
            >
              <span>Fechar</span>
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-10 space-y-6">
            <a href="#metodologia" className="block text-xl font-black text-gray-800" onClick={(e) => handleScrollTo(e, '#metodologia')}>Metodologia</a>
            <a href="#resultados" className="block text-xl font-black text-gray-800" onClick={(e) => handleScrollTo(e, '#resultados')}>Resultados</a>
            <a href="#faq" className="block text-xl font-black text-gray-800" onClick={(e) => handleScrollTo(e, '#faq')}>Dúvidas FAQ</a>
            <div className="pt-8 space-y-3">
              <Button onClick={(e) => handleRedirect(e, '/register')} className="w-full bg-primary h-14 rounded-full border-none text-lg font-black shadow-xl shadow-primary/20">
                Criar Conta
              </Button>
              <Button onClick={(e) => handleRedirect(e, '/login')} disabled={isRedirecting} variant="outline" className="w-full h-14 rounded-full border-2 text-lg font-black text-primary border-primary/20 hover:bg-primary/5">
                Entrar no Portal
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1">
        {/* HERO SECTION - REINVENTADA E COMPACTA (100vh) */}
        <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-gray-950 pt-20 md:pt-0">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-black pointer-events-none" />

          {/* Efeitos de Luz Premium */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px]" />
          </div>

          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center relative z-10 w-full pt-6 md:pt-10">
            <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-left duration-1000">
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary font-black px-4 py-1.5 text-[10px] uppercase tracking-[0.2em] rounded-full">
                <Award className="h-3 w-3" /> Ensino de Alta Performance
              </div>

              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tighter">
                Sua Aprovação é o<br />
                <span className="text-primary italic">nosso Compromisso.</span>
              </h1>

              <p className="text-sm md:text-base text-gray-400 leading-relaxed max-w-md">
                Preparamos você com excelência para <strong className="text-white">ENEM e ETEC</strong> aliando ensino tradicional à <strong className="text-white hover:text-primary transition-colors">Tecnologia IA de ponta</strong>. Foco total nos seus resultados!
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button onClick={(e) => handleRedirect(e, '/login')} className="h-11 px-8 bg-primary hover:bg-[#e06000] text-white font-black text-sm rounded-full shadow-lg shadow-primary/20 border-none transition-all active:scale-95 group">
                  <div className="flex items-center gap-2">
                    Acessar Plataforma <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Button>
                <Button onClick={(e) => handleRedirect(e, '/register')} variant="outline" className="h-11 px-8 border-2 border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold text-sm rounded-full transition-all backdrop-blur-sm">
                  Criar Conta
                </Button>
                <Button asChild variant="outline" className="h-11 px-8 bg-transparent text-white font-black text-sm rounded-full border border-white/20 hover:bg-white/5 transition-all">
                  <a href="#metodologia" onClick={(e) => handleScrollTo(e, '#metodologia')} className="flex items-center gap-2">
                    <Play className="h-4 w-4 text-primary fill-primary" /> Conheça o Método
                  </a>
                </Button>
              </div>

              {/* Stats aprimorados e mais compactos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6 border-t border-white/5">
                {stats.map((stat, i) => (
                  <div key={stat.label} className="group">
                    <p className="text-2xl font-black text-white leading-none group-hover:text-primary transition-colors">{stat.value}</p>
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative hidden lg:block h-[65vh] animate-in fade-in zoom-in duration-1000 max-h-[500px]">
              <div className="relative h-full aspect-[4/5] rounded-[2rem] overflow-hidden shadow-[0_0_40px_-10px_rgba(255,107,0,0.3)] border border-white/10 mx-auto">
                <Image
                  src="/images/hero_study.png"
                  alt="Estudantes focados no sucesso"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-40" />
                <div className="absolute inset-x-5 bottom-6 p-5 bg-white/5 backdrop-blur-2xl rounded-2xl border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary">Inteligência Aurora</span>
                  </div>
                  <p className="text-xs font-bold text-white leading-relaxed">"Otimizamos cada minuto com diagnósticos preditivos e mentoria individualizada."</p>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* MISSÃO E VALORES - Mistura de Temas (Dark nas pontas, Light no centro) */}
        <section className="py-24 bg-gray-50 relative overflow-hidden border-t border-gray-200/50">
          {/* Blobs de luz flutuantes */}
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse-subtle delay-700" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none animate-pulse-subtle" />

          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
            {[
              {
                title: "Nossa Missão",
                icon: Target,
                desc: "Democratizar o acesso ao ensino de elite em Santana de Parnaíba, transformando esforço em aprovação através da inovação e do acompanhamento próximo.",
                theme: "dark"
              },
              {
                title: "Tradição & IA",
                icon: BookMarked,
                desc: "Combinamos o melhor da pedagogia clássica com a agilidade da Inteligência Artificial Aurora para criar trilhas de aprendizagem únicas e infalíveis.",
                theme: "light"
              },
              {
                title: "Foco no Futuro",
                icon: Lightbulb,
                desc: "No Compromisso, você não apenas estuda para uma prova; você desenvolve a mentalidade de alta performance necessária para a vida universitária.",
                theme: "dark"
              }
            ].map((card, i) => (
              <div 
                key={i} 
                className={`p-10 rounded-[2.5rem] border transition-all duration-700 group hover:-translate-y-4 hover:scale-[1.02] flex flex-col gap-6 relative overflow-hidden ${
                  card.theme === 'dark' 
                    ? 'bg-gray-950 border-gray-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:shadow-[0_30px_60px_rgba(255,107,0,0.15)] hover:border-primary/50 text-white' 
                    : 'bg-white border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_60px_rgba(255,107,0,0.15)] hover:border-primary/30 text-gray-900'
                }`}
              >
                {/* Linha Guia Lateral - Efeitos Intensificados */}
                <div className={`absolute left-0 top-1/4 bottom-1/4 w-[3px] transition-all duration-700 ease-out group-hover:h-full group-hover:top-0 group-hover:bottom-0 ${
                  card.theme === 'dark'
                    ? 'bg-primary/30 group-hover:bg-primary group-hover:shadow-[0_0_20px_rgba(255,107,0,0.8)]'
                    : 'bg-primary/10 group-hover:bg-primary group-hover:shadow-[0_0_15px_rgba(255,107,0,0.5)]'
                }`} />

                {/* GLOW DE FUNDO - Azul Dinâmico */}
                <div className={`absolute -right-16 -top-16 w-56 h-56 rounded-full blur-[80px] transition-all duration-1000 group-hover:scale-150 ${
                  card.theme === 'dark' ? 'bg-blue-600/20 group-hover:bg-blue-500/40' : 'bg-blue-600/5 group-hover:bg-blue-500/15'
                }`} />
                
                {/* ÍCONE COM MODO PULSO */}
                <div className={`relative h-16 w-16 rounded-2xl flex items-center justify-center transition-all duration-700 shadow-inner group-hover:rotate-6 z-10 ${
                  card.theme === 'dark' 
                    ? 'bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary group-hover:text-black group-hover:border-primary group-hover:shadow-[0_0_30px_rgba(255,107,0,0.5)]' 
                    : 'bg-gray-50 text-gray-800 border border-gray-100 group-hover:bg-primary/5 group-hover:text-primary group-hover:border-primary/30'
                }`}>
                  <card.icon className="h-8 w-8 relative z-10" />
                  {/* Círculo animado em volta do ícone no Dark Mode */}
                  {card.theme === 'dark' && (
                     <div className="absolute inset-0 rounded-2xl border-2 border-primary/0 group-hover:border-primary/50 group-hover:scale-125 transition-all duration-700 opacity-0 group-hover:opacity-100" />
                  )}
                </div>
                
                <div className="space-y-4 relative z-10">
                  <h3 className={`text-2xl font-black tracking-tighter uppercase italic transition-colors duration-500 ${
                    card.theme === 'dark' ? 'text-white group-hover:text-primary' : 'text-gray-900 group-hover:text-primary'
                  }`}>
                    {card.title}
                  </h3>
                  <p className={`leading-relaxed font-medium text-sm transition-colors duration-500 ${
                    card.theme === 'dark' ? 'text-gray-400 group-hover:text-gray-200' : 'text-gray-600 group-hover:text-gray-900'
                  }`}>
                    {card.desc}
                  </p>
                </div>

                {/* Seta Decorativa */}
                <div className="pt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-all duration-700 translate-x-4 group-hover:translate-x-0">
                   <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                     card.theme === 'dark' 
                       ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]' 
                       : 'bg-blue-50 text-blue-600 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                   }`}>
                      <ChevronRight className="h-5 w-5" />
                   </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* METODOLOGIA - Os Pilares do Seu Sucesso */}
        <section id="metodologia" className="min-h-screen py-24 flex flex-col justify-center bg-white scroll-mt-20 overflow-hidden relative border-t border-gray-100">
          <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none animate-pulse-subtle delay-1000" />
          <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none animate-pulse-subtle" />

          <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
            <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
              <div className="inline-flex items-center gap-2 text-primary font-black uppercase tracking-[0.3em] text-[10px] bg-primary/5 px-4 py-1.5 rounded-full border border-primary/20">
                <Target className="h-4 w-4" /> Ecossistema Pedagógico
              </div>
              <h2 className="text-4xl lg:text-5xl font-black text-gray-900 tracking-tighter leading-tight italic">Os Pilares do Seu Sucesso</h2>
              <p className="text-gray-500 font-medium leading-relaxed">Desenvolvemos uma estrutura 360º para garantir que nenhum aluno seja deixado para trás, unindo tecnologia humana e algoritmos de aprovação.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: "Jornada Personalizada",
                  icon: GraduationCap,
                  highlight: "Estratégico",
                  desc: "Mapeamos suas dificuldades em tempo real e criamos listas de exercícios focadas no seu gap de conhecimento.",
                  features: ["Suporte 24/7 Aurora IA", "Correção Redação Instantânea", "Mentoria Semanal"],
                  theme: "dark"
                },
                {
                  title: "Corpo Docente Elite",
                  icon: School,
                  highlight: "Experiência",
                  desc: "Professores especialistas nas bancas mais difíceis do país, com didática simplificada e conteúdo de altíssimo nível.",
                  features: ["Videoaulas Cinematográficas", "Material Didático Exclusivo", "Aulas Presenciais"],
                  theme: "light"
                },
                {
                  title: "Inteligência de Dados",
                  icon: BarChart3,
                  highlight: "Resultados",
                  desc: "Dashboards precisos que mostram exatamente sua evolução e probabilidade de aprovação nos cursos desejados.",
                  features: ["Simulados Padrão Vunesp/ENEM", "Auditoria de Erros Recorrentes", "Gestão de Progresso"],
                  theme: "dark"
                }
              ].map((card, i) => (
                <div 
                  key={card.title} 
                  className={`p-10 rounded-[2.5rem] border transition-all duration-700 group hover:-translate-y-4 hover:scale-[1.02] flex flex-col gap-6 relative overflow-hidden ${
                    card.theme === 'dark' 
                      ? 'bg-gray-950 border-gray-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:shadow-[0_30px_60px_rgba(255,107,0,0.15)] hover:border-primary/50 text-white' 
                      : 'bg-white border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_60px_rgba(255,107,0,0.15)] hover:border-primary/30 text-gray-900'
                  }`}
                >
                  {/* Linha Guia Lateral */}
                  <div className={`absolute left-0 top-1/4 bottom-1/4 w-[3px] transition-all duration-700 ease-out group-hover:h-full group-hover:top-0 group-hover:bottom-0 ${
                    card.theme === 'dark'
                      ? 'bg-primary/30 group-hover:bg-primary group-hover:shadow-[0_0_20px_rgba(255,107,0,0.8)]'
                      : 'bg-primary/10 group-hover:bg-primary group-hover:shadow-[0_0_15px_rgba(255,107,0,0.5)]'
                  }`} />

                  {/* GLOW DE FUNDO */}
                  <div className={`absolute -right-16 -top-16 w-56 h-56 rounded-full blur-[80px] transition-all duration-1000 group-hover:scale-150 ${
                    card.theme === 'dark' ? 'bg-blue-600/20 group-hover:bg-blue-500/40' : 'bg-blue-600/5 group-hover:bg-blue-500/15'
                  }`} />
                  
                  {/* TAG HIGHLIGHT */}
                  <div className="relative z-10 flex justify-between items-center w-full">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary opacity-80">{card.highlight}</span>
                    <div className={`relative h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-700 shadow-inner group-hover:rotate-6 z-10 ${
                      card.theme === 'dark' 
                        ? 'bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary group-hover:text-black group-hover:border-primary group-hover:shadow-[0_0_30px_rgba(255,107,0,0.5)]' 
                        : 'bg-gray-50 text-gray-800 border border-gray-100 group-hover:bg-primary/5 group-hover:text-primary group-hover:border-primary/30'
                    }`}>
                      <card.icon className="h-6 w-6 relative z-10" />
                      {card.theme === 'dark' && (
                         <div className="absolute inset-0 rounded-2xl border-2 border-primary/0 group-hover:border-primary/50 group-hover:scale-125 transition-all duration-700 opacity-0 group-hover:opacity-100" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 relative z-10">
                    <h3 className={`text-2xl font-black tracking-tighter transition-colors duration-500 ${
                      card.theme === 'dark' ? 'text-white group-hover:text-primary' : 'text-gray-900 group-hover:text-primary'
                    }`}>
                      {card.title}
                    </h3>
                    <p className={`leading-relaxed font-medium text-sm transition-colors duration-500 ${
                      card.theme === 'dark' ? 'text-gray-400 group-hover:text-gray-200' : 'text-gray-600 group-hover:text-gray-900'
                    }`}>
                      {card.desc}
                    </p>
                  </div>

                  <div className="pt-6 space-y-3 relative z-10 mt-auto">
                    {card.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <CheckCircle2 className={`h-4 w-4 shrink-0 transition-colors duration-500 ${
                          card.theme === 'dark' ? 'text-primary/70 group-hover:text-primary' : 'text-primary'
                        }`} />
                        <span className={`text-[11px] font-bold uppercase tracking-tight transition-colors duration-500 ${
                          card.theme === 'dark' ? 'text-gray-400 group-hover:text-white' : 'text-gray-600 group-hover:text-gray-900'
                        }`}>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* INFRAESTRUTURA - Foco e Harmonia (100vh) */}
        <section id="resultados" className="min-h-screen py-16 flex flex-col justify-center bg-gray-50 scroll-mt-20 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 w-full relative">
            <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6 pb-6 border-b border-gray-200">
              <div className="space-y-2">
                <span className="text-primary text-[10px] font-black tracking-[0.4em] uppercase">Infraestrutura</span>
                <h2 className="text-4xl font-black tracking-tighter">Ambiente de Imersão Total</h2>
              </div>
              <Button asChild variant="outline" size="lg" className="h-12 rounded-full border-gray-300 text-sm px-8 font-black shadow-sm bg-white hover:bg-gray-100">
                <Link href="/login" className="flex items-center gap-2">Explorar Portal <ChevronRight className="h-4 w-4" /></Link>
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {galleryItems.map((item, i) => (
                <div key={item.title} className="group relative aspect-[3/4] rounded-3xl overflow-hidden shadow-xl bg-gray-200 ring-1 ring-gray-100">
                  <Image
                    src={item.img}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 flex flex-col justify-end p-8">
                    <div className="w-10 h-1 bg-primary rounded-full mb-3 group-hover:w-16 transition-all" />
                    <p className="text-xs font-black text-white uppercase tracking-[0.2em]">{item.title}</p>
                    <p className="text-[10px] font-bold text-gray-400 mt-1">Unidade Santana de Parnaíba</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* DEPOIMENTOS REALISTAS */}
        <section className="py-20 flex flex-col justify-center bg-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 w-full relative">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
              <div className="inline-flex items-center gap-2 text-primary font-black uppercase tracking-[0.3em] text-[10px]">
                <Star className="h-4 w-4" /> Prova Social
              </div>
              <h2 className="text-4xl font-black text-gray-900 tracking-tighter">Histórias de Aprovação</h2>
              <p className="text-gray-500 font-medium">Veja quem já estudou conosco e hoje está nas melhores instituições do país.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { name: "Lucas M.", course: "Aprovado em Engenharia (USP)", desc: "A correção de redação inteligente com IA me poupou semanas de estudo. Saí de 600 pra 940 no ENEM em poucos meses." },
                { name: "Mariana S.", course: "Aprovada na ETEC Parnaíba", desc: "A infraestrutura e os professores são incríveis. A plataforma apontava exatamente no que eu tinha que focar." },
                { name: "Thiago F.", course: "Aprovado em Medicina", desc: "A metodologia de simulados me deu a resistência de prova necessária. O Compromisso foi um divisor de águas pra mim." }
              ].map((test, i) => (
                <div key={i} className="p-8 rounded-3xl bg-gray-50 border border-gray-100 shadow-sm relative group hover:shadow-xl hover:-translate-y-1 transition-all">
                  <div className="flex text-amber-400 mb-4">
                    <Star className="h-5 w-5 fill-current" /><Star className="h-5 w-5 fill-current" /><Star className="h-5 w-5 fill-current" /><Star className="h-5 w-5 fill-current" /><Star className="h-5 w-5 fill-current" />
                  </div>
                  <p className="text-gray-600 font-medium italic mb-6 leading-relaxed">"{test.desc}"</p>
                  <div>
                    <p className="font-black text-gray-900">{test.name}</p>
                    <p className="text-[10px] font-bold text-primary uppercase">{test.course}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ - PERGUNTAS FREQUENTES */}
        <section id="faq" className="py-20 flex flex-col justify-center bg-gray-50 relative overflow-hidden scroll-mt-20">
          <div className="max-w-4xl mx-auto px-6 w-full relative">
            <div className="text-center mb-12 space-y-4">
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Perguntas Frequentes</h2>
              <p className="text-gray-500 font-medium">Tire as pequenas dúvidas e dê o primeiro passo.</p>
            </div>
            <div className="space-y-4">
              {[
                { q: "O curso é totalmente gratuito?", a: "Sim! Por sermos patrocinados através de projetos da prefeitura, não existem cobranças de mensalidades para os alunos." },
                { q: "Qual a duração da preparação?", a: "Temos estruturas intensivas (6 meses) e extensivas (1 ano), alinhadas perfeitamente às datas oficiais do ENEM e da ETEC." },
                { q: "Como a IA consegue corrigir minhas redações?", a: "Você redige seu texto no laboratório online e a Aurora (nossa IA) treinou milhares de redações nota 1000. Ela avalia os 5 critérios e sugere melhorias na mesma hora!" },
              ].map((faq, idx) => (
                <div key={idx} className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="font-black text-lg text-gray-900 mb-2 flex gap-3"><MessageSquare className="h-5 w-5 text-primary shrink-0" /> {faq.q}</h3>
                  <p className="text-gray-600 font-medium ml-8 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* LOCALIZAÇÃO - GOOGLE MAPS */}
        <section id="localizacao" className="py-20 bg-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 text-primary font-black uppercase tracking-[0.3em] text-[10px]">
                <MapPin className="h-4 w-4" /> Nossa Localização
              </div>
              <h2 className="text-4xl font-black text-gray-900 tracking-tighter leading-tight">Local do cursinho</h2>
              <p className="text-gray-600 font-medium leading-relaxed max-w-lg">
                Estamos localizados no coração de Santana de Parnaíba, no <strong className="text-primary italic">Colégio Colaço</strong>. Um ambiente preparado para transformar seu futuro.
              </p>
              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-100 shadow-sm">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-black text-gray-900">Endereço Unidade Central</p>
                    <p className="text-sm text-gray-500 font-medium">R. Cel. Raimundo, 32 - Centro, Santana de Parnaíba - SP, 06501-010</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Button asChild variant="outline" className="h-12 rounded-xl text-primary font-bold border-primary/20 hover:bg-primary/5">
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer">Abrir no Maps</a>
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="relative h-[450px] md:h-[550px] rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white ring-1 ring-gray-100 group">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d914.9701171802999!2d-46.9174!3d-23.446!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94cf0377c8ccd531%3A0x6e76cf076e01a884!2sR.%20Cel.%20Raimundo%2C%2032%20-%20Centro%2C%20Santana%20de%20Parna%C3%ADba%20-%20SP%2C%2006501-010!5e0!3m2!1spt-BR!2sbr!4v1712123456789!5m2!1spt-BR!2sbr" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen={true} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                className="grayscale-[0.2] group-hover:grayscale-0 transition-all duration-1000 scale-[1.02]"
              />
              <div className="absolute top-6 left-6 bg-primary text-white px-6 py-3 rounded-2xl shadow-2xl border border-white/20 animate-in slide-in-from-top-4 duration-700">
                <div className="flex items-center gap-3">
                  <School className="h-5 w-5" />
                  <span className="text-xs font-black uppercase tracking-widest italic">Unidade Colaço - Compromisso</span>
                </div>
              </div>
              <div className="absolute bottom-6 right-6 p-4 rounded-2xl bg-white/90 backdrop-blur-md shadow-xl border border-gray-100 max-w-[200px] hidden md:block animate-in slide-in-from-right-4 duration-700">
                <p className="text-[10px] font-black text-primary uppercase tracking-tighter mb-1">Referência:</p>
                <p className="text-[9px] font-bold text-gray-500 italic">Ao lado do Posto de Saúde Central e da Praça Monumento.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA FINAL - Potente e Profissional */}
        <section className="py-24 bg-gray-950 text-white text-center relative overflow-hidden border-t border-white/5 snap-start">
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/30 blur-[150px] rounded-full" />
          </div>
          <div className="max-w-3xl mx-auto px-6 space-y-8 relative z-10">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-tight">
              Sua jornada para o<br /><span className="text-primary italic underline decoration-primary/30 decoration-8 underline-offset-8">sucesso começa aqui.</span>
            </h2>
            <p className="text-lg text-gray-400 leading-relaxed font-medium">
              Vagas limitadas para o próximo ciclo de aprovação. Garanta sua mentoria com os melhores do mercado.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
              <Button asChild size="lg" className="h-16 px-12 bg-primary hover:bg-[#e06000] text-white font-black text-lg rounded-full shadow-[0_10px_40px_-10px_rgba(255,107,0,0.5)] border-none transition-all active:scale-95">
                <Link href="/register">Garanta Sua Vaga</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-16 px-12 bg-transparent text-white font-black text-lg rounded-full border-2 border-white/20 hover:bg-white/5 transition-all">
                <Link href="/login">Falar com Consultor</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER PREMIUM */}
      <footer className="bg-white py-16 border-t border-gray-100 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-16 border-b border-gray-100 pb-16">
            <div className="space-y-8 max-w-sm">
              <div className="flex items-center">
                <div className="relative h-12 w-44 md:h-14 md:w-52 overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100">
                  <Image src="/images/logocompromisso.png" alt="Logo Compromisso" fill className="object-contain p-2.5" unoptimized />
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-gray-500 font-medium leading-relaxed italic">"Referência em aprovação nas instituições mais concorridas de Santana de Parnaíba e região."</p>
                <div className="inline-flex flex-col gap-3 p-6 bg-orange-50/50 rounded-3xl border border-primary/10 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="relative h-8 w-8 shrink-0 bg-white rounded-lg p-1 shadow-sm border border-primary/5">
                      <Image src="https://upload.wikimedia.org/wikipedia/commons/7/77/Santana_Parna%C3%ADba.PNG" alt="Logo Prefeitura" fill className="object-contain" unoptimized />
                    </div>
                    <span className="text-[10px] font-black uppercase text-gray-900 tracking-wider">Patrocinador Oficial</span>
                  </div>
                  <p className="text-xs font-bold text-primary leading-tight">Esta plataforma é integralmente patrocinada pela Prefeitura de Santana de Parnaíba, garantindo ensino de elite gratuito para a nossa comunidade.</p>
                </div>
              </div>
              <div className="flex gap-4">
                {[Globe, Mail, MapPin].map((Icon, i) => (
                  <div key={i} className="h-10 w-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-primary hover:border-primary/30 transition-all cursor-pointer">
                    <Icon className="h-5 w-5" />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-12 lg:gap-24">
              <div className="space-y-6">
                <p className="text-xs font-black text-gray-900 uppercase tracking-widest">Plataforma</p>
                <ul className="space-y-4">
                  <li><Link href="/login" className="text-sm font-bold text-gray-500 hover:text-primary transition-colors">Portal do Sucesso</Link></li>
                  <li><Link href="#metodologia" className="text-sm font-bold text-gray-500 hover:text-primary transition-colors">Metodologia 360º</Link></li>
                  <li><Link href="/register" className="text-sm font-bold text-gray-500 hover:text-primary transition-colors">Matrícula Online</Link></li>
                </ul>
              </div>
              <div className="space-y-6">
                <p className="text-sm font-bold text-gray-500 break-words md:break-normal">contato@compromisso.edu.br</p>
                <p className="text-sm font-bold text-gray-500">Unidade Central Parnaíba</p>
              </div>
              <div className="space-y-6 hidden sm:block">
                <p className="text-xs font-black text-gray-900 uppercase tracking-widest">Oficial</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-loose">
                  © 2024 CURSO COMPROMISSO<br />CNPJ 45.123.456/0001-00
                </p>
              </div>
            </div>
          </div>
          <div className="pt-10 text-center lg:text-left">
            <p className="text-[11px] font-black text-gray-300 uppercase tracking-[0.5em]">Educação Inteligente • Resultados Reais</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
