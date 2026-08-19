# Apresentação comercial da plataforma

`plataforma-360-apresentacao-comercial.pdf` — documento de 25 páginas em **A4
retrato** (210 × 297 mm), em português, para apresentar a plataforma a outras
instituições. Imprime em folha comum e lê bem no celular.

**Marca branca por decisão:** o documento não cita o nome do cliente original, a
cidade, a prefeitura, nem os exames específicos que a instituição prepara — só
"o padrão do exame" e "a matriz de referência". O nome comercial usado
(`Plataforma 360`) é um marcador: trocar a constante `BRAND` em `src/build.py`
renomeia capa, rodapés, sumário e diagrama de uma vez. O contato da última
página é fictício e precisa ser substituído antes de enviar.

## Estrutura

| Páginas | Conteúdo |
|---------|----------|
| 01–02 | Capa e sumário |
| 03–06 | Panorama: o cenário atual, a proposta, os números do produto, o mapa de módulos |
| 07–13 | **Parte 1 · O aluno** — estudo e avaliação, redação com IA, mentor de IA, engajamento, caderno, vida escolar |
| 14–18 | **Parte 2 · A equipe** — professor, secretaria, gestão, portal do responsável |
| 19–22 | **Parte 3 · A plataforma** — alcance e acessibilidade, segurança e conformidade, arquitetura white-label |
| 23–25 | Posicionamento comparativo, implantação e chamada para ação |

Cada parte abre numa página divisora de fundo colorido cheio, com o índice
daquele trecho.

## Sistema de cores

Cada página declara a própria paleta em variáveis CSS (`--c1` acento, `--c2`
fundo suave, `--c3` texto de acento, `--c4` par do gradiente), e todo o resto
— faixa do topo, título de destaque, chips, faixa de conclusão, rodapé — deriva
dela. Isso é o que deixa o documento colorido sem virar colcha de retalhos:
trocar a paleta de uma página recolore a página inteira de forma coerente.

As paletas disponíveis estão no dicionário `PAL` em `src/build.py`
(`blue`, `indigo`, `violet`, `cyan`, `teal`, `green`, `amber`, `rose`, `pink`).
Cada card também aceita a própria cor, o que produz o mosaico das páginas de
módulos — use isso com parcimônia fora delas.

## Números do slide de dimensão

Os números da página 05 (telas, tabelas, serviços, migrations) são contagens
reais do repositório na data de geração. Ao regerar o documento depois de
mudanças grandes no produto, recontar antes de publicar:

```bash
find src/app/dashboard -name page.tsx | wc -l    # telas
find src/app/api -name route.ts | wc -l          # serviços
ls supabase/migrations/*.sql | wc -l             # migrations
```

## Como regerar o PDF

O documento é HTML impresso pelo Chromium — sem dependência de editor de slides.

```bash
cd docs/apresentacao/src

# 1. Fontes (Manrope + Inter) baixadas localmente, para o PDF não depender de rede
python3 - <<'PY'
import re, subprocess, os
css = subprocess.run(['curl','-sS','-A','Mozilla/5.0',
  'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800'
  '&family=Inter:wght@300;400;500;600;700&display=swap'],
  capture_output=True, text=True).stdout
os.makedirs('fonts', exist_ok=True)
for u in set(re.findall(r'https://fonts\.gstatic\.com/[^)]+', css)):
    name = u.split('/')[-1]
    subprocess.run(['curl','-sS','-o',f'fonts/{name}',u], check=True)
    css = css.replace(u, f'fonts/{name}')
open('fonts.css','w').write(css)
PY

# 2. Gera o index.html com as 25 páginas
python3 build.py

# 3. Imprime em PDF (qualquer Chrome/Chromium serve)
chromium --headless --no-pdf-header-footer \
  --print-to-pdf=../plataforma-360-apresentacao-comercial.pdf index.html
```

O tamanho da página vem do `@page { size: 210mm 297mm }` em `style.css`, e cada
`<section class="page">` tem exatamente essa altura — página e conteúdo não
podem divergir. Conteúdo que passe de ~1040 px de altura encosta no rodapé; o
script abaixo mede todas as páginas de uma vez e denuncia quem estourou:

```bash
python3 - <<'PY'
h = open('index.html').read()
js = ("<script>window.addEventListener('load',()=>{const o=[];"
      "document.querySelectorAll('.page').forEach((s,i)=>{const r=s.getBoundingClientRect();let m=0;"
      "s.querySelectorAll('.pad *').forEach(e=>{const b=e.getBoundingClientRect();"
      "if(b.height>0)m=Math.max(m,b.bottom-r.top)});o.push((i+1)+':'+Math.round(m))});"
      "document.title='RPT '+o.join(' ')});</script>")
open('check.html','w').write(h.replace('</body>', js + '</body>'))
PY
chromium --headless --virtual-time-budget=8000 --dump-dom check.html | grep -o 'RPT [^<]*'
```

Uma versão anterior deste material, em formato de slides 16:9, está no
histórico do git (commit `fab999c`), caso seja útil para projeção.
