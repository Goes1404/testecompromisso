"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  CheckCircle2, 
  ArrowRight, 
  BarChart3, 
  Zap,
  Globe,
  Sparkles,
  GraduationCap,
  School,
  Play,
  Star,
  Users,
  BookOpen,
  Target,
  TrendingUp,
  Shield,
  ChevronRight,
  Menu,
  X
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  const logoUrl = "https://upload.wikimedia.org/wikipedia/commons/7/77/Santana_Parna%C3%ADba.PNG";

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const galleryItems = [
    { title: "Aulas Dinâmicas", img: "/images/carrosel1.jpeg" },
    { title: "Inovação no Ensino", img: "/images/carrosel2.jpeg" },
    { title: "Apoio Remoto", img: "/images/carrosel3.jpeg" },
    { title: "Espaços de Foco", img: "/images/carrosel4.jpeg" },
  ];

  const stats = [
    { value: "500+", label: "Alunos Aprovados", icon: GraduationCap },
    { value: "98%", label: "Satisfação", icon: Star },
    { value: "50+", label: "Professores", icon: Users },
    { value: "24/7", label: "Suporte IA", icon: Zap },
  ];

  const mapsUrl = "https://www.google.com/maps/search/?api=1&query=R.+Cel.+Raimundo,+32+-+Centro,+Santana+de+Parnaíba+-+SP,+06501-010";

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* HEADER PREMIUM */}
      <header 
        className={`fixed top-0 w-full z-[60] transition-all duration-500 ${
          scrolled 
            ? 'bg-white/90 backdrop-blur-xl shadow-lg shadow-black/5 border-b border-gray-100' 
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-xl bg-white shadow-md flex items-center justify-center p-1 shrink-0 overflow-hidden ring-2 ring-primary/10">
              <Image 
                src={logoUrl} 
                alt="Brasão Oficial de Santana de Parnaíba" 
                fill 
                className="object-contain p-1" 
                unoptimized 
              />
            </div>
            <span className={`text-2xl font-black tracking-tight transition-colors duration-500 ${scrolled ? 'text-gray-900' : 'text-white'}`}>
              Compro<span className="text-primary">misso</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link 
              href="#metodologia" 
              className={`text-sm font-semibold transition-colors duration-300 ${scrolled ? 'text-gray-600 hover:text-primary' : 'text-white/80 hover:text-white'}`}
            >
              Metodologia
            </Link>
            <Link 
              href="#resultados" 
              className={`text-sm font-semibold transition-colors duration-300 ${scrolled ? 'text-gray-600 hover:text-primary' : 'text-white/80 hover:text-white'}`}
            >
              Resultados
            </Link>
            <a 
              href={mapsUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className={`text-sm font-semibold transition-colors duration-300 ${scrolled ? 'text-gray-600 hover:text-primary' : 'text-white/80 hover:text-white'}`}
            >
              Nosso Pólo
            </a>
            <Button asChild className="bg-primary hover:bg-[#e06000] text-white font-bold px-6 h-11 rounded-full shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 active:scale-95 transition-all border-none">
              <Link href="/login">Entrar no Portal</Link>
            </Button>
          </nav>

          {/* Mobile menu button */}
          <button 
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen 
              ? <X className={`h-6 w-6 ${scrolled ? 'text-gray-900' : 'text-white'}`} /> 
              : <Menu className={`h-6 w-6 ${scrolled ? 'text-gray-900' : 'text-white'}`} />
            }
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-xl border-t border-gray-100 shadow-xl">
            <div className="px-6 py-6 space-y-4">
              <Link href="#metodologia" className="block text-gray-700 font-semibold py-2" onClick={() => setMobileMenuOpen(false)}>Metodologia</Link>
              <Link href="#resultados" className="block text-gray-700 font-semibold py-2" onClick={() => setMobileMenuOpen(false)}>Resultados</Link>
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="block text-gray-700 font-semibold py-2">Nosso Pólo</a>
              <Button asChild className="w-full bg-primary hover:bg-[#e06000] text-white font-bold h-12 rounded-full border-none">
                <Link href="/login">Entrar no Portal</Link>
              </Button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* HERO SECTION — Impactante e Premium */}
        <section className="relative min-h-screen flex items-center overflow-hidden">
          {/* Background escuro com gradiente */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-black" />
          
          {/* Orbs de luz laranja */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-primary/15 rounded-full blur-[150px]" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
            <div className="absolute top-[40%] left-[30%] w-[200px] h-[200px] bg-primary/5 rounded-full blur-[80px] animate-pulse" />
          </div>

          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,107,0,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,107,0,0.04)_1px,transparent_1px)] bg-[size:80px_80px] pointer-events-none" />
          
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 items-center relative z-10 w-full pt-24 pb-16 md:py-0">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-md text-primary border border-primary/20 font-semibold px-5 py-2 text-xs tracking-wider rounded-full">
                <Sparkles className="h-4 w-4" />
                Educação de Excelência em Santana de Parnaíba
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight text-white leading-[1.05]">
                Sua Aprovação<br />
                <span className="text-primary">é o nosso</span><br />
                <span className="text-primary">Compromisso.</span>
              </h1>
              
              <p className="text-lg md:text-xl text-gray-400 leading-relaxed max-w-lg">
                O preparatório que une tradição pedagógica, mentoria conectada e inteligência artificial para maximizar sua performance no <strong className="text-white">ENEM</strong> e <strong className="text-white">ETEC</strong>.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Button asChild size="lg" className="h-14 px-8 bg-primary hover:bg-[#e06000] text-white font-bold text-base rounded-full shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-105 active:scale-95 transition-all group border-none">
                  <Link href="/login" className="flex items-center justify-center gap-3">
                    Acessar Meu Portal <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-14 px-8 bg-transparent text-white font-bold text-base rounded-full border-2 border-white/20 hover:bg-white/10 hover:border-white/40 transition-all">
                  <Link href="#metodologia" className="flex items-center justify-center gap-3">
                    <Play className="h-5 w-5 text-primary" /> Conheça o Método
                  </Link>
                </Button>
              </div>

              {/* Stats inline */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8 border-t border-white/10">
                {stats.map((stat, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <stat.icon className="h-4 w-4 text-primary" />
                      <span className="text-2xl font-black text-white">{stat.value}</span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Hero Image */}
            <div className="relative hidden lg:block">
              <div className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl shadow-primary/20 border border-white/10 group">
                <Image 
                  src="/images/capa1.jpeg" 
                  alt="Jornada Literária e Educação em Santana de Parnaíba" 
                  fill 
                  className="object-cover group-hover:scale-105 transition-transform duration-1000"
                  unoptimized={true}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Floating Card */}
                <div className="absolute bottom-6 left-6 right-6 p-5 bg-black/60 backdrop-blur-xl rounded-2xl text-white border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">Plataforma Ativa</span>
                  </div>
                  <p className="text-sm font-medium leading-relaxed text-gray-200">"Preparatório intensivo e tecnológico para garantir sua aprovação na ETEC e no Ensino Superior."</p>
                </div>
              </div>

              {/* Decorative glow */}
              <div className="absolute -z-10 inset-0 bg-primary/20 rounded-3xl blur-3xl scale-95" />
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
            <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2">
              <div className="w-1.5 h-2.5 bg-primary rounded-full" />
            </div>
          </div>
        </section>

        {/* PILARES SECTION */}
        <section id="metodologia" className="py-20 md:py-32 bg-white relative overflow-hidden scroll-mt-24">
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/3 rounded-full blur-[150px] -translate-y-1/2" />

          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center max-w-2xl mx-auto mb-16 md:mb-20 space-y-4">
              <div className="inline-flex items-center gap-2 bg-primary/5 text-primary font-semibold px-5 py-2 text-xs tracking-wider rounded-full">
                <Target className="h-4 w-4" />
                Nossa Metodologia
              </div>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-gray-900 leading-tight">
                Diferenciais do <span className="text-primary">Nosso Ensino</span>
              </h2>
              <p className="text-gray-500 text-base md:text-lg leading-relaxed max-w-xl mx-auto">
                Metodologia de alta performance aplicada à educação para alunos, mentores e gestores de Santana de Parnaíba.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {/* JORNADA DO ALUNO */}
              <Card className="border border-gray-100 shadow-none hover:shadow-xl hover:shadow-primary/5 rounded-2xl bg-white p-7 md:p-8 space-y-5 transition-all duration-500 hover:-translate-y-2 group">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-500">
                  <GraduationCap className="h-7 w-7" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-900">Jornada de Estudo</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">Aulas dinâmicas, material didático atualizado e suporte pedagógico integral para ENEM e ETEC.</p>
                </div>
                <ul className="space-y-3 pt-4 border-t border-gray-100">
                  {["Apoio 24/7 com Aurora IA", "Correção de Redação via IA", "Checklist SiSU/ProUni"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-gray-600">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
              </Card>

              {/* CORPO DOCENTE */}
              <Card className="border border-gray-100 shadow-none hover:shadow-xl hover:shadow-primary/5 rounded-2xl bg-white p-7 md:p-8 space-y-5 transition-all duration-500 hover:-translate-y-2 group relative overflow-hidden">
                {/* Destaque card central */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-orange-400 to-primary" />
                <div className="h-14 w-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-all duration-500">
                  <School className="h-7 w-7" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-900">Corpo Docente</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">Professores e mentores dedicados, focados no acompanhamento individual e na evolução constante.</p>
                </div>
                <ul className="space-y-3 pt-4 border-t border-gray-100">
                  {["Mentoria Personalizada", "Milhares de Questões", "Trilhas Direcionadas"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-gray-600">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
              </Card>

              {/* MONITORAMENTO */}
              <Card className="border border-gray-100 shadow-none hover:shadow-xl hover:shadow-primary/5 rounded-2xl bg-white p-7 md:p-8 space-y-5 transition-all duration-500 hover:-translate-y-2 group">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-500">
                  <BarChart3 className="h-7 w-7" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-900">Monitoramento</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">Acompanhamento de performance baseado em simulados reais e diagnóstico contínuo.</p>
                </div>
                <ul className="space-y-3 pt-4 border-t border-gray-100">
                  {["Simulados Regulares", "Auditoria de Evolução", "Gestão de Matrículas"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-gray-600">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA SECTION — Dark + Orange */}
        <section className="py-20 md:py-28 bg-gray-950 relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-30%] right-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px]" />
            <div className="absolute bottom-[-20%] left-[20%] w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
          </div>
          <div className="max-w-4xl mx-auto px-6 text-center relative z-10 space-y-8">
            <div className="inline-flex items-center gap-2 bg-white/5 text-primary font-semibold px-5 py-2 text-xs tracking-wider rounded-full border border-primary/20">
              <TrendingUp className="h-4 w-4" />
              Resultados Reais
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight">
              Comece sua jornada de<br /><span className="text-primary">aprovação agora</span>
            </h2>
            <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              Junte-se a centenas de alunos que já transformaram seus resultados com nossa plataforma de ensino inteligente.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button asChild size="lg" className="h-14 px-10 bg-primary hover:bg-[#e06000] text-white font-bold text-base rounded-full shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-105 active:scale-95 transition-all group border-none">
                <Link href="/register" className="flex items-center justify-center gap-3">
                  Matricule-se Grátis <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-14 px-10 bg-transparent text-white font-bold text-base rounded-full border-2 border-white/20 hover:bg-white/10 transition-all">
                <Link href="/login">Já tenho conta</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* GALERIA SECTION */}
        <section id="resultados" className="py-20 md:py-28 bg-gray-50 scroll-mt-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row items-end justify-between mb-12 md:mb-16 gap-6">
              <div className="space-y-4 max-w-2xl">
                <div className="inline-flex items-center gap-2 bg-primary/5 text-primary font-semibold px-5 py-2 text-xs tracking-wider rounded-full">
                  <BookOpen className="h-4 w-4" />
                  Infraestrutura
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
                  Ambiente de <span className="text-primary">Foco Total</span>
                </h2>
                <p className="text-gray-500 text-base md:text-lg leading-relaxed">
                  Veja como nossa infraestrutura transforma o cotidiano dos nossos alunos em Santana de Parnaíba.
                </p>
              </div>
              <Button asChild variant="outline" className="h-12 px-8 rounded-full border-2 border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-100 hover:border-gray-300 transition-all shrink-0">
                <Link href="/login">Acessar Portal <ArrowRight className="h-4 w-4 ml-2" /></Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {galleryItems.map((item, i) => (
                <div key={i} className="group relative aspect-[3/4] rounded-2xl overflow-hidden shadow-md hover:shadow-2xl hover:shadow-primary/10 transition-all duration-700 bg-gray-200 cursor-pointer">
                  <Image 
                    src={item.img} 
                    alt={item.title} 
                    fill 
                    className="object-cover group-hover:scale-110 transition-transform duration-1000"
                    unoptimized={true}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="w-8 h-0.5 bg-primary rounded-full mb-3 group-hover:w-12 transition-all duration-500" />
                    <h4 className="text-lg font-bold text-white">{item.title}</h4>
                    <p className="text-xs text-gray-300 mt-1">Infraestrutura Real</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER PREMIUM */}
      <footer className="bg-gray-950 py-16 md:py-20 text-white relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px] translate-x-1/3 translate-y-1/3" />
        </div>
        
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-16 relative z-10">
          <div className="space-y-6 col-span-1 lg:col-span-2">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-xl shadow-md bg-white p-1 shrink-0">
                <Image 
                  src={logoUrl} 
                  alt="Logo Prefeitura" 
                  fill 
                  unoptimized
                  className="object-contain p-1"
                />
              </div>
              <span className="text-2xl font-black tracking-tight">Compro<span className="text-primary">misso</span></span>
            </div>
            <p className="text-gray-500 text-sm max-w-sm leading-relaxed">
              Transformando o futuro dos jovens de Santana de Parnaíba através da educação de alta performance e compromisso real.
            </p>
            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary/20 hover:border-primary/30 transition-all cursor-pointer">
                <Globe className="h-4 w-4 text-gray-400" />
              </div>
              <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary/20 hover:border-primary/30 transition-all cursor-pointer">
                <Shield className="h-4 w-4 text-gray-400" />
              </div>
              <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary/20 hover:border-primary/30 transition-all cursor-pointer">
                <Zap className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <h5 className="font-bold text-sm text-white">Acesso Rápido</h5>
            <ul className="space-y-4">
              <li><Link href="/login" className="text-gray-500 hover:text-primary transition-colors text-sm font-medium">Portal do Aluno</Link></li>
              <li><Link href="#metodologia" className="text-gray-500 hover:text-primary transition-colors text-sm font-medium">Nossa Metodologia</Link></li>
              <li><Link href="/register" className="text-gray-500 hover:text-primary transition-colors text-sm font-medium">Criar Conta</Link></li>
            </ul>
          </div>
          
          <div className="space-y-6">
            <h5 className="font-bold text-sm text-white">Atendimento</h5>
            <ul className="space-y-4 text-sm text-gray-500">
              <li className="font-medium">contato@compromisso.edu.br</li>
              <li>
                <a 
                  href={mapsUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-primary transition-colors font-medium"
                >
                  R. Cel. Raimundo, N.32 - Centro<br />Santana de Parnaíba - SP
                </a>
              </li>
              <li className="font-medium">Seg a Sex • 8h às 18h</li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <p className="text-xs text-gray-600 font-medium">© 2024 Curso Compromisso • Educação de Alta Performance</p>
          <p className="text-xs text-gray-700 font-medium">Feito com <span className="text-primary">♥</span> em Santana de Parnaíba</p>
        </div>
      </footer>
    </div>
  );
}
