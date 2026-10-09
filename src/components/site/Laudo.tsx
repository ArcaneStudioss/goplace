import { Check } from "lucide-react";
import type { Produto } from "@/lib/produtos";

// Cartao "laudo" que flutua sobre a foto do topo: a promessa da marca acontecendo na frente da pessoa.
export function LaudoFlutuante({ p, itens, className = "" }: { p: Produto; itens: string[]; className?: string }) {
  const b = p.laudo.bateria;
  return (
    <div
      className={`entra rounded-[18px] bg-superficie/92 text-texto p-4 shadow-suave ring-1 ring-linha backdrop-blur-md ${className}`}
      style={{ "--atraso": "650ms" } as React.CSSProperties}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] font-medium text-suave">Laudo Loja Modelo</span>
        <span className="selo selo-acento"><Check className="size-3.5" strokeWidth={2.6} /> Conferido</span>
      </div>
      <p className="mt-1.5 text-[15px] font-semibold tracking-[-0.01em]">
        {p.nome}
      </p>
      {b ? (
        <div className="mt-3">
          <div className="flex items-baseline justify-between text-[12.5px]">
            <span className="text-suave">Saúde da bateria</span>
            <span className="num font-mono font-semibold">{b}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-superficie-2">
            <div className="barra-enche h-full rounded-full bg-acento" style={{ width: `${b}%`, "--atraso": "900ms" } as React.CSSProperties} />
          </div>
        </div>
      ) : null}
      <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12.5px]">
        {itens.slice(1, 5).map((t, i) => (
          <li key={t} className="flex items-center gap-1.5">
            <Check className="check size-3.5 shrink-0 text-acento" strokeWidth={2.6} style={{ "--atraso": `${1100 + i * 140}ms` } as React.CSSProperties} />
            <span className="truncate">{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Laudo completo da pagina do produto
export function LaudoProduto({ p, itens, garantia }: { p: Produto; itens: string[]; garantia: string }) {
  const l = p.laudo;
  const dados: [string, string][] = [
    ["Armazenamento", l.armazenamento ?? ""],
    ["Cor", l.cor ?? ""],
    ["Estado", l.estado ?? ""],
    ["Garantia", l.garantia ?? `Loja Modelo, de ${garantia}`],
    ["Acompanha", l.acompanha ?? ""],
  ].filter(([, v]) => v) as [string, string][];
  const verificados = l.verificados?.length ? l.verificados : p.condicao !== "novo" ? itens : [];
  if (!dados.length && !l.bateria && !verificados.length) return null;
  return (
    <section aria-labelledby="titulo-laudo" className="rounded-cartao bg-superficie p-5 ring-1 ring-linha sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="titulo-laudo" className="text-[17px] font-semibold tracking-[-0.01em]">{p.condicao === "novo" ? "Ficha do produto" : "Laudo do aparelho"}</h2>
        {verificados.length > 0 && <span className="selo selo-acento"><Check className="size-3.5" strokeWidth={2.6} /> Conferido na loja</span>}
      </div>
      {l.bateria ? (
        <div className="mt-5">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] text-suave">Saúde da bateria</span>
            <span className="num font-mono text-[28px] font-semibold tracking-tight">{l.bateria}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-superficie-2">
            <div className="barra-enche h-full rounded-full bg-acento" style={{ width: `${l.bateria}%`, "--atraso": "300ms" } as React.CSSProperties} />
          </div>
        </div>
      ) : null}
      {dados.length > 0 && (
        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
          {dados.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-[12px] text-suave">{k}</dt>
              <dd className="mt-0.5 text-[14.5px] font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {verificados.length > 0 && (
        <ul className="mt-5 grid gap-2 border-t border-linha pt-5 sm:grid-cols-2">
          {verificados.map((t) => (
            <li key={t} className="item-laudo flex items-center gap-2.5 text-[14px]">
              <span className="marca grid size-5 shrink-0 place-items-center rounded-full bg-superficie-2 text-sobre-acento">
                <Check className="size-3.5" strokeWidth={3} aria-hidden />
              </span>
              {t}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
