# Roadmap de Performance — Cursinho Compromisso

> Marco de progresso pra retomar o trabalho de otimização de desempenho mobile.
> Cada item tem: problema, correção, risco e arquivos. Marque `[x]` ao concluir.
> **Última atualização:** 2026-07-12

---

## 📊 Onde estamos (métricas de laboratório)

Medido via Chrome DevTools trace no build de produção (`next start`), rota `/login`:

| Métrica | Antes | Agora | Status |
|---|---|---|---|
| TTFB | 3.86 s | 21 ms | ✅ (fix de middleware) |
| LCP | 861 ms | **488 ms** | ✅ (fix do fade global; −43%) |
| LCP render delay | 823 ms | 417 ms | 🟡 melhor, ainda tem margem |
| CLS | 0.00 | 0.00 | ✅ |
| JS compartilhado | 572 kB | 103 kB | ✅ |
| Bundle /login | 217 kB | 177 kB | ✅ |
| Payload de fontes | 276 kB | 40 kB | ✅ |

> ⚠️ Trace rodou sem throttling (desktop-class). Sob CPU 4x + Slow 4G (perfil
> Lighthouse mobile), os números escalam. O render delay restante (417ms) vem
> do CSS render-blocking de 228KB (P1) + fades de root nas telas restantes (P0-4).

---

## ✅ JÁ FEITO (commits no main)

- [x] **Middleware TTFB 3.86s → 25ms** (`025ac33`) — pula `getUser()` sem cookie de sessão.
- [x] **Bundle compartilhado 572 → 103 kB** — removido override de `splitChunks` que fundia todo node_modules; recharts/framer via `optimizePackageImports`.
- [x] **Recharts fora do bundle inicial do boletim** — `dynamic(ssr:false)`.
- [x] **framer-motion fora da rota /login** (`025ac33`) — animações viraram CSS (`tailwindcss-animate`).
- [x] **DashboardLoader: 24 animações framer → skeleton CSS** (`025ac33`) — libera main-thread na hidratação.
- [x] **Loading gate removido em ~10 telas** (home aluno/admin/secretaria, kpi, finance, uploads, documents, trails) — herói pinta no 1º paint, conteúdo ganha skeleton.
- [x] **Queries pesadas cortadas** — contagens via `head:true`; `answers` JSONB sob demanda; tetos defensivos em chat/uploads/attendance.

---

## 🔴 P0 — Causa raiz do render delay (alto impacto, baixo risco)

### [x] P0-3: **CAUSA RAIZ do render delay** — fade global no ClientWrapper
**A descoberta principal desta sessão.** O render delay de ~820ms era **estável**
nos 3 traces (antes/depois de fonte, antes/depois do fade do login) — sinal de
custo sistêmico, não do login. A causa: `src/components/ClientWrapper.tsx`
envolvia **TODA página** em `<div className="animate-in fade-in duration-700">`,
segurando o conteúdo inteiro (inclusive o elemento LCP) em `opacity:0` por 700ms
**a cada navegação, em toda rota**.
**Correção:** removido o `animate-in fade-in duration-700` do wrapper global. O
paint passa a ser imediato em TODAS as rotas — não só no login.
**✅ VALIDADO por trace:** LCP do /login **861ms → 488ms (−43%)**; render delay
823ms → 417ms. (O elemento LCP virou o logo — o texto passou a pintar instantâneo.)
**Impacto:** afeta o LCP de todo o app, não de uma página.
**Propagado:** removido também o fade de opacity do root de `admin/home` e
`secretary/home`. `student/home` não tinha fade próprio (já resolvido pelo wrapper).

**Correções secundárias no mesmo tema (fade → LCP):**
- `LoginForm.tsx`: removidos os `fade-in`/`fill-mode-both` de entrada (mantido só
  slide/zoom = transform, compositor-only, não adia LCP).
- **Lição geral:** `animate-in fade-in` acima da dobra adia o LCP. O wrapper
  global era o dominante; ainda restam ~78 telas com fade no root próprio.

### [ ] P0-4: Remover fade de opacity do root das ~78 telas restantes
**Problema:** o mesmo anti-padrão (`animate-in fade-in` no `<div>` raiz da página)
existe em ~80 telas do dashboard — cada uma adia o LCP daquela rota pela duração
do fade (500-700ms). O wrapper global (dominante) e os 2 staff homes já foram.
**Como achar:** `grep -rl "animate-in fade-in" src/app/dashboard --include=page.tsx`
**Correção mecânica por arquivo:** no `<div>` raiz, trocar `animate-in fade-in
[slide-in-from-*] duration-N` por: nada, ou só `animate-in slide-in-from-* ` (slide
= transform, não adia LCP). **Nunca** deixar `fade-in` no container que envolve o
herói/título. Priorizar as mais visitadas primeiro (boletim, trilhas, simulados).
**Risco:** baixo por arquivo, mas volume alto — fazer em lotes + build entre lotes.

### [x] P0-1: Otimizar fontes (payload 276KB → 40KB)
**Problema:**
- `font-black` (peso 900) usado **2278×**, mas Sora carrega só pesos 300-800 → todo título renderiza como *faux-bold* sintético (borrado + repaint).
- Peso 300 (light) é carregado mas tem **0 usos** — download desperdiçado.
- **Inter** é carregado (4 arquivos woff2) mas **nunca renderiza** — Sora sempre vence no stack `sans`. Peso morto.
- 9 arquivos woff2 / 276KB no total; fonte na cadeia crítica CSS→woff2 (441ms).

**Correção:**
- Remover Inter do `layout.tsx` (manter fallback só `system-ui`).
- Trocar pesos do Sora de `[300,400,500,600,700,800]` para `[400,500,600,700,900]` (dropar 300 sem uso e 800 quase sem uso; **adicionar 900** que é o mais usado).
- Manter `display: 'swap'`.

**Feito:** Inter removida do `layout.tsx` (Sora sempre vencia o stack). Sora de
`[300,400,500,600,700,800]` → `[400,500,600,700,800]` (dropado 300 sem uso; Sora
não tem 900, então `font-black` segue faux-bold do 800). Fallback `system-ui` no
CSS + tailwind.config. **Resultado: 9 woff2/276KB → 2 woff2/40KB.**
**Arquivos:** `src/app/layout.tsx`, `src/app/globals.css`, `tailwind.config.ts`.

### [x] P0-2: Corrigir manifest duplicado
**Problema:** `layout.tsx` declara `manifest: '/manifest.json'`, mas o browser busca `/manifest.webmanifest` (688ms, provável 404). Só existe `public/manifest.json`.
**Feito:** `src/app/manifest.ts` já gera `/manifest.webmanifest` (200, não era 404;
os 688ms eram fetch de baixa prioridade fora do caminho de render). O problema era
`<link rel="manifest">` **duplicado**: metadata do `layout.tsx` também declarava
`/manifest.json`. Removida a declaração redundante — `app/manifest.ts` é a fonte única.
**Arquivos:** `src/app/layout.tsx`.

---

## 🟠 P1 — CSS render-blocking (médio impacto, médio risco)

### [ ] P1-1: Reduzir/desbloquear os 228KB de CSS
**Problema:** o CSS global (`c601b58b...css`, **228KB**) é render-blocking em TODA página. Login só usa uma fração. Tamanho vem de utilities reais espalhadas por 90 rotas (sem safelist; muito uso de valores arbitrários `rounded-[2.5rem]`, `text-[10px]` etc. que geram classes únicas).
**Correção (testar por ordem de risco):**
1. Habilitar `experimental.optimizeCss: true` no `next.config.ts` (inline de CSS crítico + defer do resto via Beasties/critters). **Testar com cuidado** — pode quebrar ordem de cascata.
2. Auditar `globals.css` (845 linhas) — mover efeitos pesados usados em poucas telas (aurora/grain/glass/border-prism) pra CSS por-rota se possível.
3. Reduzir valores arbitrários repetidos criando utilities nomeadas.
**Risco:** médio (cascata/visual). Rodar build + smoke visual após cada passo.
**Arquivos:** `next.config.ts`, `src/app/globals.css`.

### [ ] P1-2: Preload da fonte do LCP
**Problema:** a fonte do heading acima da dobra é descoberta tarde (CSS→woff2).
**Correção:** após P0-1, adicionar `<link rel="preload">` do woff2 do Sora 900, ou confiar no `next/font` (que já otimiza). Medir antes/depois.
**Risco:** baixo. **Arquivos:** `src/app/layout.tsx`.

---

## 🟡 P2 — Refino (baixo impacto ou escopo maior)

### [ ] P2-1: Página /register pesada (226 kB)
react-hook-form + zod + muitos componentes. Avaliar lazy-load de partes do form.
**Arquivos:** `src/app/register/`.

### [ ] P2-2: DashboardLoader → skeleton já feito, mas revisar outras telas com spinner puro
Buscar `animate-spin` full-screen restantes e converter em skeleton content-shaped.

### [ ] P2-3: Preconnect / resource hints
Trace apontou "no origins were preconnected". Menor no mesmo domínio, mas avaliar pra assets externos (Supabase, Vercel).

### [ ] P2-4: Rodar Lighthouse mobile real no deploy
O trace local não tem throttling. Rodar Lighthouse mobile no ambiente Vercel pós-deploy pra número de campo. Comparar com baseline 35/100.

---

## 🔬 Como medir (repetir a cada correção)

```bash
npm run build
npx next start -p 3100          # servidor prod local
# via Chrome DevTools MCP: navigate_page /login → performance_start_trace
# olhar: LCP, LCP breakdown (render delay), CLS, TTFB
```

Baseline a bater: LCP render delay < 200ms, CSS crítico < 50KB.
