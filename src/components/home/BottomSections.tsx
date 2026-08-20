"use client";

import { Button } from "@/components/ui/button";
import { Star, MessageSquare, MapPin, School, ChevronRight, Globe, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const galleryItems = [
  { title: "Labs", img: "/images/carrosel1.jpeg" },
  { title: "Ensino", img: "/images/carrosel2.jpeg" },
  { title: "Apoio", img: "/images/carrosel3.jpeg" },
  { title: "Foco", img: "/images/carrosel4.jpeg" },
];

const mapsUrl = "https://www.google.com/maps/search/?api=1&query=R.+Cel.+Raimundo,+32+-+Centro,+Santana+de+Parnaíba+-+SP,+06501-010";

export function BottomSections() {
  return (
    <>
      {/* INFRAESTRUTURA */}
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
                  loading="lazy"
                  sizes="(max-width: 768px) 50vw, 25vw"
                  quality={75}
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
              title="Google Maps Location"
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
              <Link href="/login">Entrar na Plataforma</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-16 px-12 bg-transparent text-white font-black text-lg rounded-full border-2 border-white/20 hover:bg-white/5 transition-all">
              <a href="#faq" onClick={(e) => { e.preventDefault(); document.querySelector('#faq')?.scrollIntoView({ behavior: 'smooth' }); }}>Dúvidas Frequentes</a>
            </Button>
          </div>
        </div>
      </section>

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
                  <li><Link href="#metodologia" onClick={(e) => { e.preventDefault(); document.querySelector('#metodologia')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-sm font-bold text-gray-500 hover:text-primary transition-colors">Metodologia 360º</Link></li>
                  <li><Link href="#localizacao" onClick={(e) => { e.preventDefault(); document.querySelector('#localizacao')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-sm font-bold text-gray-500 hover:text-primary transition-colors">Localização</Link></li>
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
    </>
  );
}
