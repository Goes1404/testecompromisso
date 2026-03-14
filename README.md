# Plataforma Compromisso 360

O ecossistema oficial de aprendizado e gestão educacional de Santana de Parnaíba.

## Status: Migração Concluída para @Goes1404

Este repositório contém o código-fonte da plataforma Compromisso, focada em alta performance acadêmica através de Inteligência Artificial (Aurora), BI e Trilhas de Estudo.

### Tecnologias:
- **Frontend**: Next.js 15
- **IA**: Aurora (Gemini 1.5 via Genkit)
- **Backend**: Supabase
- **UI**: Tailwind + Shadcn

---

## 🚀 Guia de Migração via Terminal

Se você estiver tendo problemas de autenticação ao subir o código para a nova conta, siga este comando:

1. **Remova o antigo e adicione o novo com seu Token:**
```bash
# Substitua SEU_TOKEN pelo Personal Access Token gerado no GitHub
git remote set-url origin https://SEU_TOKEN@github.com/Goes1404/compromisso.git
```

2. **Envie as alterações:**
```bash
git push
```

*Nota: O uso do Token na URL evita erros de "Password authentication is not supported".*

---
© 2024 Rede Educacional Santana de Parnaíba