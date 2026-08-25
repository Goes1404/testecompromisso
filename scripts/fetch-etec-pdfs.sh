#!/usr/bin/env bash
# Baixa provas + gabaritos oficiais do Vestibulinho ETEC e extrai o texto (pdftotext).
#
# Uso:
#   bash scripts/fetch-etec-pdfs.sh                 # todas as edições conhecidas
#   bash scripts/fetch-etec-pdfs.sh 2024-1 2023-2   # só as edições indicadas
#   OUT=/caminho bash scripts/fetch-etec-pdfs.sh
#
# Saída: <OUT>/<ano>-<sem>.prova.txt e <ano>-<sem>.gabarito.txt
# (consumidos por `npm run import:etec`). Requer pdftotext (poppler).
#
# ── Por que um manifesto fixo ───────────────────────────────────────────────
# A versão anterior raspava https://vestibulinho.etec.sp.gov.br/provas-gabaritos
# para descobrir os links. Esse site responde **HTTP 403 para IPs de datacenter**
# (CI, contêiner, servidor), então o download falhava silenciosamente em qualquer
# ambiente que não fosse uma máquina doméstica.
#
# Os PDFs em si ficam no bucket S3 oficial do Centro Paula Souza
# (fatweb.s3.amazonaws.com), que responde 200 de qualquer lugar. O manifesto
# abaixo aponta direto para lá — mesma fonte oficial, sem o bloqueio.
#
# Para acrescentar uma edição nova: abra a página de provas e gabaritos num
# navegador comum, copie o id numérico do link do PDF e some uma linha aqui.
set -uo pipefail

OUT="${OUT:-${TMPDIR:-/tmp}/etec}"
BASE="https://fatweb.s3.amazonaws.com/vestibulinhoetec/gabarito"

# rotulo|id-no-s3|arquivo-da-prova|arquivo-do-gabarito
# Campo de arquivo pode ser uma URL completa (http...): usada como está, sem o
# BASE/id. Serve para edições fora do S3 — a 2025-2 nunca entrou na página de
# provas do site e só existe no blob oficial do CPS (bkpsitecpsnew).
MANIFEST=$(cat <<'L'
2026-2|20262210689|A-CADERNO-VESTIBULINHO-2SEM2026.pdf|A-GABARITO-VESTIBULINHO-2SEM2026.pdf
2026-1|20261176943|A-CADERNO-VESTIBULINHO-1SEM2026.pdf|A-GABARITO-VESTIBULINHO-1SEM2026.pdf
# 2025-2 foi organizada pela IDECAN, não pela FAT: o gabarito traz VÁRIAS versões
# de prova e módulos por curso num layout que o parser não entende (0 respostas
# extraídas), e sem saber qual versão casa com o caderno o import viraria gabarito
# errado. Fica fora até alguém tratar o formato à mão.
#2025-2|-|https://bkpsitecpsnew.blob.core.windows.net/uploadsitecps/sites/1/2025/07/vestibulinho-2025-2sem-prova.pdf|https://bkpsitecpsnew.blob.core.windows.net/uploadsitecps/sites/1/2025/07/vestibulinho-2025-2sem-gabarito.pdf
2025-1|20251468190|Prova.pdf|Gabarito.pdf
2024-2|20242918930|Prova.pdf|Gabarito-retificado.pdf
2024-1|202423718|Prova.pdf|Gabarito.pdf
2023-2|202323718|Prova.pdf|Gabarito.pdf
2023-1|202311698|Prova.pdf|Gabarito.pdf
2022-2|2022027483|Prova.pdf|Gabarito.pdf
2020-1|202017430|Prova_1modulo.pdf|Gabarito_1modulo-retificado.pdf
2019-2|201927134|Prova_1modulo.pdf|Gabarito_1modulo.pdf
2019-1|201917532|Prova_1modulo.pdf|Gabarito_1modulo.pdf
2018-2|201826901|Prova_1modulo.pdf|Gabarito_1modulo.pdf
2018-1|201816012|Prova_1modulo.pdf|Gabarito_1modulo.pdf
2017-2|201727490|Prova_1modulo.pdf|Gabarito_1modulo_retificado.pdf
2017-1|201718301|Prova_1modulo.pdf|Gabarito_1modulo.pdf
2016-2|20162639|Prova_1modulo.pdf|Gabarito_1modulo.pdf
2016-1|20161738|Prova_1modulo.pdf|Gabarito_1modulo.pdf
2015-2|20152679|Prova_1modulo.pdf|Gabarito_1modulo.pdf
2015-1|20147534|Prova_1modulo.pdf|Gabarito_1modulo.pdf
L
)

command -v pdftotext >/dev/null || { echo "❌ pdftotext ausente (instale poppler-utils)"; exit 1; }

WANTED="$*"
mkdir -p "$OUT"
echo "📥 Vestibulinho ETEC → $OUT"

ok=0; bad=0
while IFS='|' read -r rot id prova gab; do
  [ -z "${rot:-}" ] && continue
  # Se o usuário pediu edições específicas, ignora as demais.
  if [ -n "$WANTED" ] && ! printf '%s\n' $WANTED | grep -qx "$rot"; then continue; fi

  case "$prova" in http*) urlp="$prova";; *) urlp="$BASE/$id/$prova";; esac
  case "$gab"   in http*) urlg="$gab";;   *) urlg="$BASE/$id/$gab";;   esac
  cp=$(curl -s -o "$OUT/$rot.prova.pdf" -w '%{http_code}' -L "$urlp")
  cg=$(curl -s -o "$OUT/$rot.gab.pdf"   -w '%{http_code}' -L "$urlg")

  if [ "$cp" != "200" ] || [ "$cg" != "200" ] || [ ! -s "$OUT/$rot.prova.pdf" ]; then
    echo "  ⚠️  $rot: download falhou (prova=$cp gabarito=$cg)"
    rm -f "$OUT/$rot".*.pdf
    bad=$((bad + 1))
    continue
  fi

  pdftotext -layout -enc UTF-8 "$OUT/$rot.prova.pdf" "$OUT/$rot.prova.txt" 2>/dev/null
  pdftotext -layout -enc UTF-8 "$OUT/$rot.gab.pdf"   "$OUT/$rot.gabarito.txt" 2>/dev/null
  echo "  ✔ $rot ($(wc -l < "$OUT/$rot.prova.txt") linhas)"
  ok=$((ok + 1))
done <<< "$MANIFEST"

echo "🏁 $ok edições baixadas, $bad falhas. Agora rode: npm run import:etec -- --dir $OUT"
