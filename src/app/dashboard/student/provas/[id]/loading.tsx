import { FullBleedLoader } from "@/components/FullBleedLoader";

// Mesma razão do leitor de livros: a prova é uma tela escura de janela inteira
// e herdava o esqueleto claro do painel.
export default function CarregandoProva() {
  return (
    <FullBleedLoader
      mensagem="Preparando a prova"
      detalhe="Carregando questões e cronômetro"
    />
  );
}
