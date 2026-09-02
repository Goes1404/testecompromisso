import { FullBleedLoader } from "@/components/FullBleedLoader";

// Sem este arquivo a rota herdava o loading.tsx de /dashboard — o esqueleto
// CLARO do painel — e o leitor, que é escuro, entrava depois de um piscar de
// tema. Aqui a espera já nasce escura, igual ao destino.
export default function CarregandoLivro() {
  return (
    <FullBleedLoader
      mensagem="Abrindo o material"
      detalhe="Preparando o ambiente de leitura protegido"
    />
  );
}
