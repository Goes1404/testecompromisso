#!/usr/bin/env bash
# Baixa provas + gabaritos oficiais do Vestibulinho ETEC e extrai o texto (pdftotext).
#
# Uso:
#   bash scripts/fetch-etec-pdfs.sh 2018 2019 2020 2022 2023 2024
#   OUT=/caminho bash scripts/fetch-etec-pdfs.sh          # anos padrão
#
# Saída: <OUT>/<ano>-<seq>.prova.txt e <ano>-<seq>.gabarito.txt
# (consumidos por `npm run import:etec`). Requer pdftotext (poppler / Git Bash).
set -uo pipefail

OUT="${OUT:-/c/Users/User/AppData/Local/Temp/etec}"
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36"
BASE="https://vestibulinho.etec.sp.gov.br/provas-gabaritos"
YEARS="${*:-2018 2019 2020 2022 2023 2024}"

mkdir -p "$OUT"
echo "📥 Baixando ETEC → $OUT"
echo "   anos: $YEARS"

for Y in $YEARS; do
  html=$(curl -s -A "$UA" "$BASE/detalhe.asp?q=$Y")
  # diretórios S3 únicos que contêm os PDFs desta edição
  dirs=$(echo "$html" | grep -oiE 'https://[^"]+/gabarito/[0-9]+/' | sort -u)
  if [ -z "$dirs" ]; then echo "  ⏭  $Y: sem PDFs"; continue; fi

  i=0
  for d in $dirs; do
    i=$((i + 1))
    id="${Y}-${i}"
    curl -s -A "$UA" -o "$OUT/$id.prova.pdf" "${d}Prova.pdf"
    # prefere gabarito retificado, se existir
    if ! curl -s -A "$UA" -f -o "$OUT/$id.gab.pdf" "${d}Gabarito-retificado.pdf"; then
      curl -s -A "$UA" -o "$OUT/$id.gab.pdf" "${d}Gabarito.pdf"
    fi

    if [ ! -s "$OUT/$id.prova.pdf" ] || [ ! -s "$OUT/$id.gab.pdf" ]; then
      echo "  ⚠️  $id: PDF ausente — pulando"
      rm -f "$OUT/$id".*.pdf
      continue
    fi

    pdftotext -layout -enc UTF-8 "$OUT/$id.prova.pdf" "$OUT/$id.prova.txt" 2>/dev/null
    pdftotext -layout -enc UTF-8 "$OUT/$id.gab.pdf" "$OUT/$id.gabarito.txt" 2>/dev/null
    echo "  ✔ $id ($(wc -l < "$OUT/$id.prova.txt" 2>/dev/null || echo 0) linhas)"
  done
done

echo "🏁 Concluído. Agora rode: npm run import:etec"
