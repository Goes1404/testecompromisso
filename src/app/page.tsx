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
          ? 'bg-white/95 backdrop-blur-xl py-2 shadow-lg border-gray-100'
          : 'bg-black/20 backdrop-blur-sm py-4 border-white/5'
          }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-14 md:h-16">
          <div className="flex items-center">
            <Link href="/" className="relative transition-all active:scale-95 group">
              <div className="relative h-10 w-20 md:h-12 md:w-20 overflow-hidden transition-all rounded-2xl bg-white shadow-sm border border-gray-100/50">
                <Image
                  src="/images/logocompromisso.png"
                  alt="Logo Compromisso"
                  fill
                  className="object-contain p-2"
                  unoptimized
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
            <Button onClick={(e) => handleRedirect(e, '/login')} size="lg" className="bg-primary hover:bg-[#e06000] text-white font-black h-11 px-8 rounded-full shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all active:scale-95 border-none">
              Portal do Aluno
            </Button>
          </nav>

          <button className={`md:hidden p-2 rounded-lg ${scrolled ? 'bg-gray-50' : 'bg-white/10'}`} onClick={() => setMobileMenuOpen(true)}>
            <Menu className={`h-6 w-6 ${scrolled ? 'text-gray-900' : 'text-white'}`} />
          </button>
        </div>
      </header>

      {/* MOBILE MENU */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[110] bg-white animate-in slide-in-from-right duration-500 md:hidden">
          <div className="p-8 flex justify-between items-center border-b">
            <span className="text-2xl font-black text-primary">Compromisso</span>
            <button onClick={() => setMobileMenuOpen(false)} className="p-2 bg-gray-50 rounded-full text-gray-400"><X className="h-6 w-6" /></button>
          </div>
          <div className="p-10 space-y-6">
            <a href="#metodologia" className="block text-xl font-black text-gray-800" onClick={(e) => handleScrollTo(e, '#metodologia')}>Metodologia</a>
            <a href="#resultados" className="block text-xl font-black text-gray-800" onClick={(e) => handleScrollTo(e, '#resultados')}>Resultados</a>
            <div className="pt-8">
              <Button onClick={(e) => handleRedirect(e, '/login')} className="w-full bg-primary h-14 rounded-full border-none text-lg font-black shadow-xl shadow-primary/20">
                Portal do Aluno
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

              <p className="text-sm md:text-base text-gray-400 leading-relaxed max-w-lg">
                O preparatório líder que integra tradição pedagógica com <strong className="text-white hover:text-primary transition-colors">IA de ponta</strong>, focado em resultados reais para <strong className="text-white">ENEM, ETEC e Medicina</strong>.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button onClick={(e) => handleRedirect(e, '/login')} className="h-11 px-8 bg-primary hover:bg-[#e06000] text-white font-black text-sm rounded-full shadow-lg shadow-primary/20 border-none transition-all active:scale-95 group">
                  <div className="flex items-center gap-2">
                    Acessar Plataforma <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Button>
                <Button onClick={(e) => handleRedirect(e, '/register')} variant="outline" className="h-11 px-8 border-2 border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold text-sm rounded-full transition-all backdrop-blur-sm">
                  Criar Conta Grátis
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
                  unoptimized
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


        {/* MISSÃO E VALORES - Nova seção para mais profissionalismo */}
        <section className="py-16 md:py-20 bg-gray-50 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-primary shadow-lg shadow-primary/20 flex items-center justify-center text-white">
                <Target className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-black tracking-tighter">Nossa Missão</h3>
              <p className="text-gray-600 leading-relaxed font-medium">Democratizar o acesso ao ensino de elite em Santana de Parnaíba, transformando esforço em aprovação através da inovação e do acompanhamento próximo.</p>
            </div>
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-black shadow-lg shadow-black/10 flex items-center justify-center text-white">
                <BookMarked className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-black tracking-tighter">Tradição & IA</h3>
              <p className="text-gray-600 leading-relaxed font-medium">Combinamos o melhor da pedagogia clássica com a agilidade da Inteligência Artificial Aurora para criar trilhas de aprendizagem únicas e infalíveis.</p>
            </div>
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 shadow-lg shadow-primary/5 flex items-center justify-center text-primary">
                <Lightbulb className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-black tracking-tighter">Foco no Futuro</h3>
              <p className="text-gray-600 leading-relaxed font-medium">No Compromisso, você não apenas estuda para uma prova; você desenvolve a mentalidade de alta performance necessária para a vida universitária.</p>
            </div>
          </div>
        </section>

        {/* METODOLOGIA - Mais densa e informativa (100vh) */}
        <section id="metodologia" className="min-h-screen py-16 flex flex-col justify-center bg-white scroll-mt-20 overflow-hidden relative animate-in fade-in slide-in-from-right duration-1000">
          <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

          <div className="max-w-7xl mx-auto px-6 w-full relative">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
              <div className="inline-flex items-center gap-2 text-primary font-black uppercase tracking-[0.3em] text-[10px]">
                <Target className="h-4 w-4" /> Ecossistema Pedagógico
              </div>
              <h2 className="text-4xl lg:text-5xl font-black text-gray-900 tracking-tighter leading-tight">Os Pilares do Seu Sucesso</h2>
              <p className="text-gray-500 font-medium leading-relaxed">Desenvolvemos uma estrutura 360º para garantir que nenhum aluno seja deixado para trás, unindo tecnologia humana e algoritmos de aprovação.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: "Jornada Personalizada",
                  icon: GraduationCap,
                  bg: "bg-white",
                  highlight: "Estratégico",
                  desc: "Mapeamos suas dificuldades em tempo real e criamos listas de exercícios focadas no seu gap de conhecimento.",
                  features: ["Suporte 24/7 Aurora IA", "Correção Redação Instantânea", "Mentoria Semanal individual"]
                },
                {
                  title: "Corpo Docente Elite",
                  icon: School,
                  bg: "bg-gray-950",
                  dark: true,
                  highlight: "Experiência",
                  desc: "Professores especialistas nas bancas mais difíceis do país, com didática simplificada e conteúdo de altíssimo nível.",
                  features: ["Videoaulas Cinematográficas", "Material Didático Exclusivo", "Aulas Presenciais e Híbridas"]
                },
                {
                  title: "Inteligência de Dados",
                  icon: BarChart3,
                  bg: "bg-white",
                  highlight: "Resultados",
                  desc: "Dashboards precisos que mostram exatamente sua evolução e probabilidade de aprovação nos cursos desejados.",
                  features: ["Simulados Padrão Vunesp/ENEM", "Auditoria de Erros Recorrentes", "Gestão de Progresso em Real Time"]
                }
              ].map((card, i) => (
                <div key={card.title} className={`p-6 md:p-10 rounded-3xl md:rounded-[2.5rem] border shadow-2xl shadow-black/5 hover:shadow-primary/10 transition-all duration-500 group relative overflow-hidden ${card.dark ? 'bg-gray-950 text-white border-white/5' : 'bg-white border-gray-100'}`}>
                  {card.dark && <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary" />}
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-8 shadow-inner transition-transform group-hover:scale-110 duration-500 ${card.dark ? 'bg-white/10 text-primary' : 'bg-primary/5 text-primary'}`}>
                    <card.icon className="h-7 w-7" />
                  </div>
                  <div className="space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary opacity-80">{card.highlight}</span>
                    <h3 className="text-2xl font-black tracking-tight">{card.title}</h3>
                    <p className={`text-sm leading-relaxed ${card.dark ? 'text-gray-400' : 'text-gray-500'}`}>{card.desc}</p>

                    <div className="pt-6 space-y-3">
                      {card.features.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          <span className={`text-[11px] font-bold uppercase tracking-tight ${card.dark ? 'text-gray-300' : 'text-gray-600'}`}>{feat}</span>
                        </div>
                      ))}
                    </div>
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
                    unoptimized
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
                  © 2024 CURSO COMPROMISSO<br />CNPJ 00.000.000/0001-00
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
