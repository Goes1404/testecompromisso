# Apresentação comercial da plataforma

`plataforma-360-apresentacao-comercial.pdf` — deck de 22 slides em formato
widescreen (960 × 540 pt, 16:9), em português, para apresentar a plataforma a
outras instituições.

**Marca branca por decisão:** o deck não cita o nome do cliente original, a
cidade, a prefeitura, nem os exames específicos que a instituição prepara.
O nome comercial usado (`Plataforma 360`) é um marcador — trocar a constante
`BRAND` em `src/build.py` renomeia o documento inteiro, capa e rodapés
inclusive. O contato na última página também é fictício e precisa ser
substituído antes de enviar.

## Estrutura

| Slides | Conteúdo |
|--------|----------|
| 1–5    | Capa, problema, proposta, mapa de módulos, dimensão do produto |
| 6–12   | Perfil do aluno: estudo, redação com IA, mentor de IA, engajamento, caderno, vida escolar |
| 13–16  | Professor, secretaria, gestão e portal do responsável |
| 17–19  | Alcance e acessibilidade, segurança e conformidade, arquitetura |
| 20–22  | Posicionamento comparativo, implantação e chamada para ação |

Os números do slide 5 (telas, tabelas, serviços, migrations) são contagens
reais do repositório na data de geração. Ao regerar o deck depois de mudanças
grandes no produto, recontar antes de publicar:

```bash
find src/app/dashboard -name page.tsx | wc -l    # telas
find src/app/api -name route.ts | wc -l          # serviços
ls supabase/migrations/*.sql | wc -l             # migrations
```

## Como regerar o PDF

O deck é HTML impresso pelo Chromium — sem dependência de editor de slides.

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

# 2. Gera o index.html com os 22 slides
python3 build.py

# 3. Imprime em PDF (qualquer Chrome/Chromium serve)
chromium --headless --no-pdf-header-footer \
  --print-to-pdf=../plataforma-360-apresentacao-comercial.pdf index.html
```

O tamanho da página vem do `@page { size: 1280px 720px }` em `style.css`;
cada `<section class="slide">` tem exatamente essa altura e vira uma página.
Conteúdo que passar de ~660 px de altura encosta no rodapé — o script abaixo
mede todos os slides de uma vez e denuncia quem estourou:

```bash
python3 - <<'PY'
h = open('index.html').read()
js = ("<script>window.addEventListener('load',()=>{const o=[];"
      "document.querySelectorAll('.slide').forEach((s,i)=>{const r=s.getBoundingClientRect();let m=0;"
      "s.querySelectorAll('.pad *').forEach(e=>{const b=e.getBoundingClientRect();"
      "if(b.height>0)m=Math.max(m,b.bottom-r.top)});o.push((i+1)+':'+Math.round(m))});"
      "document.title='RPT '+o.join(' ')});</script>")
open('check.html','w').write(h.replace('</body>', js + '</body>'))
PY
chromium --headless --virtual-time-budget=6000 --dump-dom check.html | grep -o 'RPT [^<]*'
```
