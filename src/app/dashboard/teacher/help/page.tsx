"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HelpCircle,
  Search,
  Compass,
  ClipboardList,
  FilePenLine,
  Database,
  Bell,
  MonitorPlay,
  BarChart3,
  Play,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useGuidedTour } from "@/hooks/useGuidedTour";
import type { DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

interface FAQItem {
  id: string;
  question: string;
  icon: any;
  category: string;
  answer: string;
  tourTarget?: string; // rota para navegar
  tourSteps?: DriveStep[]; // passos do tour guiado
}

const faqItems: FAQItem[] = [
  {
    id: "create-trail",
    question: "Como criar uma trilha de estudo?",
    icon: ClipboardList,
    category: "Trilhas",
    answer: "Para criar uma trilha, acesse a página 'Minhas Trilhas', clique no botão 'Criar Nova Trilha', preencha o título, descrição, categoria e adicione os módulos com videoaulas e materiais.",
    tourTarget: "/dashboard/teacher/trails",
    tourSteps: [
      {
        element: "#nav-teacher-trails",
        popover: { title: "Passo 1", description: "Clique em 'Minhas Trilhas' no menu lateral para acessar a gestão de trilhas.", side: "right" as const, align: "start" as const },
      },
      {
        popover: { title: "Passo 2", description: "Na página de Trilhas, você encontrará o botão de criar nova trilha no topo da página. Clique nele para abrir o formulário.", side: "bottom" as const, align: "center" as const },
      },
      {
        popover: { title: "Passo 3", description: "Preencha título, descrição, categoria e imagem de capa. Depois adicione os módulos com vídeos e materiais complementares.", side: "bottom" as const, align: "center" as const },
      },
    ],
  },
  {
    id: "correct-essay",
    question: "Como corrigir uma redação?",
    icon: FilePenLine,
    category: "Redações",
    answer: "Na seção 'Correção de Redações', você verá todas as redações pendentes. Clique em uma para abrir o editor de correção com suporte da Aurora IA para gerar feedback automático baseado nas competências do ENEM.",
    tourTarget: "/dashboard/teacher/essays",
    tourSteps: [
      {
        element: "#nav-teacher-essays",
        popover: { title: "Passo 1", description: "Clique em 'Correção de Redações' no menu lateral.", side: "right" as const, align: "start" as const },
      },
      {
        popover: { title: "Passo 2", description: "Você verá a lista de redações pendentes com filtros por status. Clique em uma redação para abrir o editor.", side: "bottom" as const, align: "center" as const },
      },
      {
        popover: { title: "Passo 3", description: "No editor, use o botão 'Correção IA' para gerar um feedback automático, ou corrija manualmente atribuindo notas por competência.", side: "bottom" as const, align: "center" as const },
      },
    ],
  },
  {
    id: "create-questions",
    question: "Como criar questões para o banco?",
    icon: Database,
    category: "Questões",
    answer: "No 'Banco de Questões', clique em 'Nova Questão'. Preencha o enunciado, alternativas, resposta correta, nível de dificuldade e tags de matéria. As questões ficam disponíveis para simulados automáticos.",
    tourTarget: "/dashboard/teacher/questions",
    tourSteps: [
      {
        element: "#nav-teacher-questions",
        popover: { title: "Passo 1", description: "Acesse o 'Banco de Questões' no menu lateral.", side: "right" as const, align: "start" as const },
      },
      {
        popover: { title: "Passo 2", description: "Clique no botão 'Nova Questão' para abrir o formulário de criação.", side: "bottom" as const, align: "center" as const },
      },
      {
        popover: { title: "Passo 3", description: "Preencha enunciado, alternativas (A-E), selecione a correta, defina dificuldade e tags. A questão será adicionada ao banco central.", side: "bottom" as const, align: "center" as const },
      },
    ],
  },
  {
    id: "send-announcement",
    question: "Como enviar um comunicado aos alunos?",
    icon: Bell,
    category: "Comunicação",
    answer: "No 'Mural de Avisos', clique em 'Novo Comunicado'. Defina título, mensagem e prioridade (baixa, média ou alta). O aviso aparecerá no painel dos alunos imediatamente.",
    tourTarget: "/dashboard/teacher/communication",
    tourSteps: [
      {
        element: "#nav-teacher-communication",
        popover: { title: "Passo 1", description: "Clique em 'Mural de Avisos' no menu lateral.", side: "right" as const, align: "start" as const },
      },
      {
        popover: { title: "Passo 2", description: "Clique no botão de criar novo comunicado.", side: "bottom" as const, align: "center" as const },
      },
      {
        popover: { title: "Passo 3", description: "Preencha o título, conteúdo da mensagem e selecione a prioridade. Ao publicar, o aviso aparecerá no painel de todos os alunos.", side: "bottom" as const, align: "center" as const },
      },
    ],
  },
  {
    id: "manage-lives",
    question: "Como agendar e gerenciar aulas ao vivo?",
    icon: MonitorPlay,
    category: "Lives",
    answer: "Em 'Gerenciar Lives', crie uma nova sessão com título, data/hora e link do YouTube ou Google Meet. Os alunos serão notificados automaticamente e a live aparecerá no calendário deles.",
    tourTarget: "/dashboard/teacher/live",
    tourSteps: [
      {
        element: "#nav-teacher-live",
        popover: { title: "Passo 1", description: "Acesse 'Gerenciar Lives' no menu lateral.", side: "right" as const, align: "start" as const },
      },
      {
        popover: { title: "Passo 2", description: "Clique no botão para criar nova live. Preencha título, descrição, data, hora e link da transmissão.", side: "bottom" as const, align: "center" as const },
      },
    ],
  },
  {
    id: "use-analytics",
    question: "Como usar o BI & Analytics?",
    icon: BarChart3,
    category: "Analytics",
    answer: "O painel de BI mostra métricas como: taxa de conclusão de trilhas, notas médias de simulados, evolução individual dos alunos, e ranking por turma. Use os filtros no topo para segmentar por período, matéria ou turma. Os gráficos são interativos — passe o mouse para ver detalhes.",
  },
  {
    id: "manage-library",
    question: "Como adicionar apostilas à biblioteca?",
    icon: BookOpen,
    category: "Biblioteca",
    answer: "Na 'Gestão de Apostilas', clique em 'Adicionar Recurso'. Faça upload do PDF ou cole um link, preencha o título e categoria. O material ficará disponível para todos os alunos na Biblioteca.",
    tourTarget: "/dashboard/teacher/library",
    tourSteps: [
      {
        element: "#nav-teacher-library",
        popover: { title: "Passo 1", description: "Acesse 'Gestão de Apostilas' no menu lateral.", side: "right" as const, align: "start" as const },
      },
      {
        popover: { title: "Passo 2", description: "Clique em 'Adicionar Recurso' e faça upload do arquivo ou cole um link externo.", side: "bottom" as const, align: "center" as const },
      },
    ],
  },
];

export default function TeacherHelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTourId, setActiveTourId] = useState<string | null>(null);
  const router = useRouter();

  const filteredFaqs = faqItems.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = [...new Set(faqItems.map((f) => f.category))];

  const handleStartTour = useCallback((faq: FAQItem) => {
    if (!faq.tourSteps) return;

    setActiveTourId(faq.id);

    // Importa driver.js dinamicamente e inicia
    import("driver.js").then(({ driver }) => {
      const driverInstance = driver({
        showProgress: true,
        animate: true,
        overlayColor: "rgba(0, 0, 0, 0.75)",
        stagePadding: 8,
        stageRadius: 12,
        popoverClass: "compromisso-tour-popover",
        nextBtnText: "Próximo →",
        prevBtnText: "← Anterior",
        doneBtnText: "Entendi ✓",
        progressText: "{{current}} de {{total}}",
        onDestroyStarted: () => {
          driverInstance.destroy();
          setActiveTourId(null);
        },
        steps: faq.tourSteps!,
      });

      // Se tem rota, navega primeiro; senão inicia direto
      if (faq.tourTarget) {
        // Pequeno delay para dar tempo da sidebar processar
        setTimeout(() => {
          driverInstance.drive();
        }, 500);
      } else {
        driverInstance.drive();
      }
    });
  }, []);

  return (
    <div className="space-y-8 pb-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <HelpCircle className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
              Central de Ajuda
            </h1>
            <p className="text-sm text-muted-foreground">
              Tutoriais interativos e perguntas frequentes
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por pergunta ou categoria..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 bg-white border-border rounded-xl text-sm font-medium"
          />
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={searchQuery === "" ? "default" : "outline"}
            size="sm"
            onClick={() => setSearchQuery("")}
            className="rounded-full text-xs font-bold h-8"
          >
            Todas
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={searchQuery === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchQuery(cat)}
              className="rounded-full text-xs font-bold h-8"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-none shadow-lg bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl overflow-hidden">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-lg">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">Tutoriais Interativos</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Clique em <strong>"Iniciar Tutorial Guiado"</strong> em qualquer pergunta para ver um passo a passo visual 
              que destaca os botões exatos na interface. O sistema vai destacar cada elemento com setas indicando onde clicar.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Accordion */}
      <Accordion type="single" collapsible className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="text-center py-16 opacity-40">
            <HelpCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="font-bold text-sm">Nenhum resultado encontrado</p>
            <p className="text-xs text-muted-foreground mt-1">Tente buscar com outros termos.</p>
          </div>
        ) : (
          filteredFaqs.map((faq) => (
            <AccordionItem
              key={faq.id}
              value={faq.id}
              className="border border-border/50 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow data-[state=open]:shadow-lg"
            >
              <AccordionTrigger className="px-6 py-5 hover:no-underline group">
                <div className="flex items-center gap-4 text-left">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-data-[state=open]:bg-primary group-data-[state=open]:text-white transition-all">
                    <faq.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">{faq.question}</p>
                    <Badge variant="secondary" className="mt-1 text-[10px] font-bold">
                      {faq.category}
                    </Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="pl-14 space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                  {faq.tourSteps && (
                    <Button
                      onClick={() => handleStartTour(faq)}
                      disabled={activeTourId === faq.id}
                      className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl h-11 px-6 text-sm shadow-lg shadow-primary/20 border-none gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Iniciar Tutorial Guiado
                    </Button>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))
        )}
      </Accordion>
    </div>
  );
}
