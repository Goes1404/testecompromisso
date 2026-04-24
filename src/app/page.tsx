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
import dynamic from "next/dynamic";

const DynamicBottomSections = dynamic(() => import("@/components/home/BottomSections").then(mod => mod.BottomSections), {
  ssr: true, // Ainda envia o HTML pre-renderizado, mas quebra o JS chunk
  loading: () => <div className="min-h-screen py-32 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" /></div>
});

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Prefetch principais rotas para acelerar navegação
    router.prefetch('/login');
    
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [router]);

  const handleRedirect = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    if (isRedirecting) return;
    setIsRedirecting(true);
    
    // Removendo o delay para transição instantânea
    router.push(path);
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
                  className="object-contain p-1"
                  sizes="(max-width: 768px) 40px, 48px"
                  priority
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
              <Button onClick={(e) => handleRedirect(e, '/login')} className="bg-primary hover:bg-[#e06000] text-white font-black h-10 px-6 rounded-full shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all active:scale-95 border-none">
                Entrar
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
              <Button onClick={(e) => handleRedirect(e, '/login')} disabled={isRedirecting} className="w-full bg-primary h-14 text-white rounded-full border-none text-lg font-black shadow-xl shadow-primary/20">
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
                    Entrar na Plataforma <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
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
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  quality={85}
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

        <DynamicBottomSections />
      </main>
    </div>
  );
}
