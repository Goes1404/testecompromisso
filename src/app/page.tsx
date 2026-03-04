
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Shield, 
  Sparkles, 
  ArrowRight, 
  BookOpen, 
  Users, 
  Database, 
  Bot, 
  TrendingUp, 
  Target,
  FileText,
  MonitorPlay,
  ClipboardCheck,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

/**
 * Landing Page Oficial | Compromisso Smart Education
 * Tecnologia industrial a serviço da aprovação.
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-accent selection:text-accent-foreground">
      {/* HEADER COMPACTO */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg">
              <Shield className="h-6 w-6" />
            </div>
            <span className="text-xl font-black text-primary italic tracking-tighter">
              Compro<span className="text-accent">misso</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#ecossistema" className="text-xs font-black uppercase tracking-widest text-primary/60 hover:text-accent transition-colors">Ecossistema</Link>
            <Link href="#pilares" className="text-xs font-black uppercase tracking-widest text-primary/60 hover:text-accent transition-colors">Diferenciais</Link>
            <Button asChild className="bg-primary text-white font-black rounded-xl h-11 px-8 shadow-xl shadow-primary/10">
              <Link href="/login">Acessar Portal</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative pt-20 pb-32 overflow-hidden">
          <div className="absolute top-0 right-0 w-[50%] h-full bg-primary/5 -skew-x-12 translate-x-20 pointer-events-none" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
                <div className="space-y-2">
                  <Badge className="bg-accent text-accent-foreground border-none font-black text-[10px] px-4 py-1.5 uppercase tracking-widest mb-4">
                    INTELIGÊNCIA EDUCACIONAL 360
                  </Badge>
                  <h1 className="text-5xl md:text-7xl font-black text-primary italic tracking-tighter leading-[0.9]">
                    Tecnologia Industrial a serviço da sua <span className="text-accent underline underline-offset-8 decoration-4">Aprovação.</span>
                  </h1>
                </div>
                <p className="text-lg md:text-xl text-muted-foreground font-medium leading-relaxed italic max-w-lg">
                  O arsenal definitivo para estudantes de alta performance, mentores e gestores educacionais em uma única rede integrada.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button asChild className="h-16 px-10 bg-primary text-white font-black text-lg rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all gap-3 border-none">
                    <Link href="/login">
                      Entrar na Plataforma
                      <ArrowRight className="h-6 w-6 text-accent" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-16 px-10 rounded-2xl border-2 border-primary/10 font-black text-primary hover:bg-primary/5 transition-all">
                    <Link href="/register">Criar minha conta</Link>
                  </Button>
                </div>
                <div className="flex items-center gap-6 pt-8 border-t border-muted/20 opacity-60">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-accent" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Padrão INEP/ENEM</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-accent" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Aurora IA Ativa</span>
                  </div>
                </div>
              </div>

              <div className="relative animate-in fade-in zoom-in-95 duration-1000 delay-300">
                <div className="absolute inset-0 bg-accent/20 rounded-[3rem] blur-3xl opacity-30 -rotate-6" />
                <div className="relative aspect-[4/3] rounded-[3rem] bg-slate-900 overflow-hidden shadow-2xl border-8 border-white group">
                  <Image 
                    src="https://picsum.photos/seed/landing/800/600" 
                    alt="Ecossistema Compromisso" 
                    fill 
                    className="object-cover opacity-80 group-hover:scale-110 transition-transform duration-1000"
                    priority
                    data-ai-hint="modern dashboard education"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent" />
                  <div className="absolute bottom-8 left-8 right-8">
                    <div className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/10 space-y-2">
                      <p className="text-white text-sm font-black italic">"A rede Compromisso elevou minha nota em 34% em apenas um ciclo."</p>
                      <p className="text-accent text-[10px] font-black uppercase tracking-widest">— Aluno ETEC Jorge Street</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: PILARES */}
        <section id="pilares" className="py-32 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center space-y-4 mb-20">
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-accent">Pilares do Sucesso</h2>
              <h3 className="text-4xl md:text-5xl font-black text-primary italic tracking-tight uppercase">Ecossistema de Alta Performance</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* JORNADA DO ALUNO */}
              <Card className="border-none shadow-xl rounded-[2.5rem] bg-white p-10 space-y-8 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 group">
                <div className="h-16 w-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <TrendingUp className="h-8 w-8" />
                </div>
                <div className="space-y-4">
                  <h4 className="text-2xl font-black text-primary italic leading-none uppercase">Rota da Aprovação</h4>
                  <p className="text-muted-foreground font-medium text-sm leading-relaxed italic">
                    Redação Master com IA, simulados inteligentes via RPC e central de documentação para SiSU e ProUni.
                  </p>
                </div>
                <ul className="space-y-3 pt-4 border-t border-muted/10">
                  <li className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-primary/60">
                    <CheckCircle2 className="h-4 w-4 text-accent" /> Correção de IA Nota 1000
                  </li>
                  <li className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-primary/60">
                    <CheckCircle2 className="h-4 w-4 text-accent" /> Player de Vídeo Rastreável
                  </li>
                </ul>
              </Card>

              {/* STUDIO MASTER */}
              <Card className="border-none shadow-xl rounded-[2.5rem] bg-primary text-white p-10 space-y-8 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 group">
                <div className="h-16 w-16 rounded-2xl bg-white/10 text-accent flex items-center justify-center shadow-lg group-hover:bg-accent group-hover:text-primary transition-all">
                  <MonitorPlay className="h-8 w-8" />
                </div>
                <div className="space-y-4">
                  <h4 className="text-2xl font-black italic leading-none uppercase">Studio Master</h4>
                  <p className="text-white/60 font-medium text-sm leading-relaxed italic">
                    Ferramentas de nível industrial para mentores: autoria de trilhas 360°, banco central de questões e estúdio de lives.
                  </p>
                </div>
                <ul className="space-y-3 pt-4 border-t border-white/10">
                  <li className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest opacity-80">
                    <CheckCircle2 className="h-4 w-4 text-accent" /> Autoria de Trilhas 360°
                  </li>
                  <li className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest opacity-80">
                    <CheckCircle2 className="h-4 w-4 text-accent" /> Banco de Questões Massivo
                  </li>
                </ul>
              </Card>

              {/* GABINETE DE GESTÃO */}
              <Card className="border-none shadow-xl rounded-[2.5rem] bg-white p-10 space-y-8 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 group">
                <div className="h-16 w-16 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shadow-inner group-hover:bg-slate-900 group-hover:text-white transition-all">
                  <Database className="h-8 w-8" />
                </div>
                <div className="space-y-4">
                  <h4 className="text-2xl font-black text-primary italic leading-none uppercase">Gabinete de Gestão</h4>
                  <p className="text-muted-foreground font-medium text-sm leading-relaxed italic">
                    Business Intelligence e Auditoria ética. Visão térmica de engajamento, risco de evasão e prontidão documental.
                  </p>
                </div>
                <ul className="space-y-3 pt-4 border-t border-muted/10">
                  <li className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-primary/60">
                    <CheckCircle2 className="h-4 w-4 text-accent" /> Analytics de Performance
                  </li>
                  <li className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-primary/60">
                    <CheckCircle2 className="h-4 w-4 text-accent" /> Auditoria de Chats & Logs
                  </li>
                </ul>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="py-24 relative overflow-hidden bg-primary text-white">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_2px_2px,white_1px,transparent_0)] bg-[size:40px_40px]" />
          </div>
          <div className="max-w-4xl mx-auto px-4 text-center relative z-10 space-y-10">
            <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase leading-tight">
              Pronto para dominar o <span className="text-accent">seu futuro?</span>
            </h2>
            <p className="text-lg md:text-xl text-white/60 font-medium italic">
              Junte-se à rede de educação inteligente e acelere sua jornada acadêmica.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Button asChild className="h-20 px-16 bg-accent text-accent-foreground font-black text-xl rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all border-none">
                <Link href="/register">Começar Agora</Link>
              </Button>
              <Link href="/login" className="text-sm font-black uppercase tracking-widest hover:text-accent transition-all flex items-center gap-2">
                Já tenho conta <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-white/40 py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
              <Shield className="h-4 w-4 text-accent" />
            </div>
            <span className="text-sm font-black italic tracking-widest text-white/80 uppercase">Compromisso</span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-center">
            © 2024 Compromisso Smart Education • Tecnologia Industrial a serviço da aprovação.
          </p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-white transition-colors"><Shield className="h-5 w-5" /></Link>
            <Link href="#" className="hover:text-white transition-colors"><Sparkles className="h-5 w-5" /></Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
