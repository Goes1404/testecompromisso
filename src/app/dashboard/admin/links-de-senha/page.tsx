"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, CheckSquare, Copy, KeyRound, Loader2, MessageCircle, Search, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { carregarTudo, bateComBusca, nomeParaMostrar } from "@/lib/carregar-tudo";
import { normalizarSala } from "@/lib/lives";
import { mensagemDoLink, textoDoLote } from "@/lib/link-de-senha";

/**
 * Links de senha de 24 h em lote (mutirão de senhas, 17–18/10).
 *
 * A secretaria filtra por sala ou nome, marca os alunos e gera um link para
 * cada um. Cada link só serve para a conta daquele aluno; gerar de novo
 * cancela o anterior (por isso o aviso antes de gerar). Rota:
 * `/api/admin/generate-links-lote` (só admin/staff).
 */

type Aluno = { id: string; name: string | null; full_name: string | null; email: string | null; username: string | null; sala: string | null };
type Gerado = { id: string; nome: string | null; email?: string; link?: string; erro?: string };

const MAXIMO = 300;

export default function LinksDeSenhaPage() {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const podeUsar = userRole === "admin" || userRole === "staff";

  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [sala, setSala] = useState("todas");
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [gerando, setGerando] = useState(false);
  const [gerados, setGerados] = useState<Gerado[] | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  useEffect(() => {
    if (!podeUsar) return;
    carregarTudo<Aluno>((de, ate) =>
      supabase
        .from("profiles")
        .select("id, name, full_name, email, username, sala")
        .eq("role", "student")
        .is("arquivado_em", null)
        .order("name", { ascending: true, nullsFirst: false })
        .order("id")
        .range(de, ate),
    ).then(({ data, error }) => {
      if (error) toast({ title: "Não foi possível carregar os alunos", variant: "destructive" });
      setAlunos(data);
      setCarregando(false);
    });
  }, [podeUsar, toast]);

  const salas = useMemo(() => {
    const s = new Set<string>();
    alunos.forEach((a) => {
      const n = normalizarSala(a.sala);
      if (n) s.add(n);
    });
    return [...s].sort((a, b) => Number(a) - Number(b));
  }, [alunos]);

  const visiveis = useMemo(
    () =>
      alunos.filter((a) => {
        const n = normalizarSala(a.sala);
        if (sala === "sem" ? n !== null : sala !== "todas" && n !== sala) return false;
        return bateComBusca(a, busca);
      }),
    [alunos, sala, busca],
  );

  const todosVisiveisMarcados = visiveis.length > 0 && visiveis.every((a) => marcados.has(a.id));

  const alternar = (id: string) =>
    setMarcados((m) => {
      const n = new Set(m);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const alternarVisiveis = () =>
    setMarcados((m) => {
      const n = new Set(m);
      if (todosVisiveisMarcados) visiveis.forEach((a) => n.delete(a.id));
      else visiveis.forEach((a) => n.add(a.id));
      return n;
    });

  const gerar = async () => {
    if (marcados.size === 0) return;
    if (marcados.size > MAXIMO) {
      toast({ title: `No máximo ${MAXIMO} alunos por vez`, variant: "destructive" });
      return;
    }
    const ok = window.confirm(
      `Gerar ${marcados.size} link(s)? Se algum desses alunos já recebeu um link antes, o antigo deixa de funcionar.`,
    );
    if (!ok) return;
    setGerando(true);
    try {
      const res = await fetch("/api/admin/generate-links-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...marcados] }),
      });
      const dados = await res.json();
      if (!res.ok) throw new Error(dados?.error || "Falha ao gerar os links.");
      setGerados(dados.links);
      const falhas = (dados.links as Gerado[]).filter((g) => g.erro).length;
      toast({
        title: `${dados.links.length - falhas} link(s) gerado(s)`,
        description: falhas ? `${falhas} não saíram — veja na lista.` : "Valem por 24 horas.",
      });
    } catch (e: any) {
      toast({ title: "Não foi possível gerar", description: e?.message, variant: "destructive" });
    } finally {
      setGerando(false);
    }
  };

  const copiar = async (texto: string, chave: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(chave);
      setTimeout(() => setCopiado((c) => (c === chave ? null : c)), 2000);
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  if (!podeUsar) {
    return <p className="p-6 text-sm text-muted-foreground">Esta tela é só da secretaria e da coordenação.</p>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 p-4 md:p-6 pb-28">
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-black italic tracking-tight flex items-center gap-2">
          <KeyRound className="h-6 w-6 text-accent shrink-0" /> Links de senha em lote
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Marque os alunos e gere um link para cada um. O aluno abre, toca em Continuar e cria a senha. Cada link vale por{" "}
          <strong>24 horas</strong>, abre quantas vezes precisar e <strong>só serve para a conta daquele aluno</strong> — mande no
          WhatsApp dele, nunca no grupo.
        </p>
      </header>

      {gerados ? (
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => copiar(textoDoLote(gerados), "todos")}
              className="w-full sm:w-auto h-11 rounded-2xl font-bold gap-2"
            >
              {copiado === "todos" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              Copiar todos (nome + link)
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setGerados(null);
                setMarcados(new Set());
              }}
              className="w-full sm:w-auto h-11 rounded-2xl font-bold"
            >
              Gerar para outros alunos
            </Button>
          </div>
          <ul className="space-y-2">
            {gerados.map((g) => (
              <li key={g.id} className="rounded-2xl border bg-card p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-sm break-words">{g.nome || "Sem nome"}</p>
                    {g.email && <p className="text-xs text-muted-foreground break-all">{g.email}</p>}
                  </div>
                  {g.erro && (
                    <span className="text-xs font-bold text-red-600 flex items-center gap-1 shrink-0">
                      <AlertTriangle className="h-3.5 w-3.5" /> {g.erro}
                    </span>
                  )}
                </div>
                {g.link && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      size="sm"
                      onClick={() => copiar(mensagemDoLink(g.nome, g.link!), `msg-${g.id}`)}
                      className="w-full sm:w-auto rounded-xl font-bold gap-2"
                    >
                      {copiado === `msg-${g.id}` ? <Check className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                      Copiar mensagem
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copiar(g.link!, `link-${g.id}`)}
                      className="w-full sm:w-auto rounded-xl font-bold gap-2"
                    >
                      {copiado === `link-${g.id}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      Só o link
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou login"
                className="pl-9 h-11 rounded-2xl"
              />
            </div>
            <select
              value={sala}
              onChange={(e) => setSala(e.target.value)}
              className="h-11 rounded-2xl border bg-background px-3 text-sm font-medium"
              aria-label="Sala"
            >
              <option value="todas">Todas as salas</option>
              {salas.map((s) => (
                <option key={s} value={s}>
                  Sala {s}
                </option>
              ))}
              <option value="sem">Sem sala no cadastro</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={alternarVisiveis}
              disabled={visiveis.length === 0}
              className="flex items-center gap-2 text-sm font-bold disabled:opacity-40"
            >
              {todosVisiveisMarcados ? <CheckSquare className="h-4 w-4 text-accent" /> : <Square className="h-4 w-4" />}
              Marcar os {visiveis.length} da lista
            </button>
            <span className="text-xs text-muted-foreground">{marcados.size} marcado(s)</span>
          </div>

          {carregando ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ul className="divide-y rounded-2xl border bg-card">
              {visiveis.map((a) => {
                const marcado = marcados.has(a.id);
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => alternar(a.id)}
                      className="w-full flex items-start gap-3 p-3 text-left hover:bg-muted/40"
                    >
                      {marcado ? (
                        <CheckSquare className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                      ) : (
                        <Square className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      )}
                      <span className="min-w-0">
                        <span className="block text-sm font-bold break-words">{nomeParaMostrar(a)}</span>
                        <span className="block text-xs text-muted-foreground break-all">
                          {a.email}
                          {normalizarSala(a.sala) ? ` · Sala ${normalizarSala(a.sala)}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {visiveis.length === 0 && <li className="p-6 text-sm text-center text-muted-foreground">Nenhum aluno encontrado.</li>}
            </ul>
          )}

          <div className="fixed bottom-20 lg:bottom-6 inset-x-4 lg:inset-x-auto lg:right-8 z-30">
            <Button
              onClick={gerar}
              disabled={gerando || marcados.size === 0}
              className="w-full lg:w-auto h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl gap-2"
            >
              {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Gerar {marcados.size || ""} link(s)
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
