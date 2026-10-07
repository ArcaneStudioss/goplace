import Link from "next/link";
import { Check } from "lucide-react";
import { nomeCondicao, parcela, reais } from "@/lib/comum";
import type { Produto } from "@/lib/produtos";

export function Foto({ p, sizes, prioridade = false, className = "" }: { p: Produto; sizes: string; prioridade?: boolean; className?: string }) {
  const f = p.fotos[0];
  if (!f) return <div className={`grid size-full place-items-center text-suave ${className}`}><span className="simbolo size-10 opacity-30" /></div>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={f.pequena}
      srcSet={`${f.pequena} 640w, ${f.grande} ${f.largura}w`}
      sizes={sizes}
      width={f.largura}
      height={f.altura}
      alt={p.nome}
      loading={prioridade ? "eager" : "lazy"}
      fetchPriority={prioridade ? "high" : undefined}
      decoding="async"
      className={`size-full object-cover ${className}`}
    />
  );
}

export function Preco({ p, grande = false }: { p: Produto; grande?: boolean }) {
  const vezes = p.parcelasSemJuros;
  return (
    <div className={`num ${grande ? "" : "flex flex-wrap items-baseline gap-x-2"}`}>
      <span className={grande ? "block text-[34px] font-semibold tracking-[-0.03em]" : "text-[16px] font-semibold"}>
        {reais(p.preco)}
        {p.precoAntigo && p.precoAntigo > p.preco && (
          <s className={`ml-2 font-normal text-suave ${grande ? "text-[18px]" : "text-[13px]"}`}>{reais(p.precoAntigo)}</s>
        )}
      </span>
      {vezes > 1 && (
        <span className={grande ? "mt-1 block text-[15px] text-suave" : "text-[13px] text-suave"}>
          ou {vezes}x de {reais(parcela(p.preco, vezes), true)}{grande ? " sem juros" : ""}
        </span>
      )}
    </div>
  );
}

export function CartaoProduto({ p, atraso = 0, sizes = "(min-width: 1024px) 23vw, 46vw" }: { p: Produto; atraso?: number; sizes?: string }) {
  const bateria = p.laudo.bateria;
  return (
    <Link href={`/produto/${p.slug}`} className="group block" data-revelar style={{ "--atraso": `${atraso}ms` } as React.CSSProperties}>
      <div className="zoom-foto relative aspect-[4/5] overflow-hidden rounded-cartao bg-superficie-2">
        <Foto p={p} sizes={sizes} />
      </div>
      <div className="mt-3 px-1">
        <p className="flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-suave">
          {p.status === "reservado" ? <span className="font-semibold text-texto">Reservado</span> : <span>{nomeCondicao(p.condicao)}</span>}
          {bateria ? (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1 text-acento"><Check className="size-3.5" strokeWidth={2.5} />Bateria {bateria}%</span>
            </>
          ) : null}
        </p>
        <h3 className="mt-1 text-[15.5px] leading-snug font-semibold tracking-[-0.01em] text-balance group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">{p.nome}</h3>
        <div className="mt-1.5"><Preco p={p} /></div>
      </div>
    </Link>
  );
}
