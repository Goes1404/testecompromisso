import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resultado · Simulado Pré-Etec 2026 · Cursinho Compromisso",
  description: "Consulte a sua nota e o gabarito do Simulado Pré-Etec 2026 do Cursinho Compromisso.",
  // Página de consulta por nome: não é para aparecer em busca.
  robots: { index: false, follow: false },
};

export default function ResultadoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
