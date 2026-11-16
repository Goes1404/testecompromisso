/**
 * Fundo do topo da ficha: fileiras de bolinhas de gabarito (A–E), algumas
 * preenchidas, inclinadas e sumindo em direção ao texto. É o papel que todo
 * aluno do 9º ano conhece do vestibulinho — o motivo visual da ficha.
 * Só SVG estático: nada anima, nada pesa no celular.
 */
const LETRAS = ["A", "B", "C", "D", "E"];
// Qual bolinha está marcada em cada fileira do ladrilho (varia para não parecer carimbo).
const MARCADAS = [2, 0, 3, 1, 4, 2];
const PASSO = 40;
const LINHA = 40;

export function FundoDeGabarito({ className = "" }: { className?: string }) {
  const largura = PASSO * LETRAS.length + 20;
  const altura = LINHA * MARCADAS.length;
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{
        maskImage: "radial-gradient(85% 80% at 100% 10%, black 20%, transparent 70%)",
        WebkitMaskImage: "radial-gradient(85% 80% at 100% 10%, black 20%, transparent 70%)",
      }}
    >
      <svg className="absolute -top-1/2 -right-1/3 h-[220%] w-[160%] -rotate-12" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="gabarito" width={largura} height={altura} patternUnits="userSpaceOnUse">
            {MARCADAS.map((marcada, l) => {
              const y = LINHA * l + LINHA / 2;
              // Fileiras alternadas deslocadas, como uma folha que não está alinhada à tela.
              const dx = l % 2 ? PASSO / 2 : 0;
              return LETRAS.map((letra, i) => {
                const x = 20 + PASSO * i + dx;
                const cheia = i === marcada;
                return (
                  <g key={`${l}-${i}`}>
                    <circle
                      cx={x} cy={y} r={12.5}
                      fill={cheia ? "rgba(255,255,255,0.6)" : "none"}
                      stroke="rgba(255,255,255,0.32)" strokeWidth={1.5}
                    />
                    {!cheia && (
                      <text
                        x={x} y={y} dy="0.36em" textAnchor="middle"
                        fontSize={11} fontWeight={700} fill="rgba(255,255,255,0.38)"
                      >
                        {letra}
                      </text>
                    )}
                  </g>
                );
              });
            })}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#gabarito)" />
      </svg>
    </div>
  );
}
