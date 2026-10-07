import type { Metadata } from "next";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { CATEGORIAS, CONDICOES, ehCategoria, nomeCategoria } from "@/lib/comum";
import { listarVitrine } from "@/lib/produtos";
import { CartaoProduto } from "@/components/site/CartaoProduto";

export const dynamic = "force-dynamic";

type Busca = { categoria?: string; condicao?: string; q?: string; ordem?: string };

export async function generateMetadata({ searchParams }: PageProps<"/loja">): Promise<Metadata> {
  const { categoria } = (await searchParams) as Busca;
  return { title: categoria && ehCategoria(categoria) ? nomeCategoria(categoria) : "Loja" };
}

const ORDENS = [
  { id: "", nome: "Destaques" },
  { id: "menor", nome: "Menor preço" },
  { id: "maior", nome: "Maior preço" },
] as const;

export default async function Loja({ searchParams }: PageProps<"/loja">) {
  const sp = (await searchParams) as Busca;
  const texto = (v: unknown) => (typeof v === "string" ? v : "");
  const categoria = ehCategoria(texto(sp.categoria)) ? texto(sp.categoria) : "";
  const condicao = CONDICOES.some((c) => c.id === sp.condicao) ? texto(sp.condicao) : "";
  const q = texto(sp.q).trim().slice(0, 60);
  const ordem = ORDENS.some((o) => o.id === sp.ordem) ? texto(sp.ordem) : "";
  const produtos = await listarVitrine({ categoria, condicao, busca: q, ordem: (ordem || "recentes") as "recentes" | "menor" | "maior" });

  const url = (mudar: Partial<Busca>) => {
    const p = new URLSearchParams();
    const v = { categoria, condicao, q, ordem, ...mudar };
    for (const [k, x] of Object.entries(v)) if (x) p.set(k, x);
    const s = p.toString();
    return s ? `/loja?${s}` : "/loja";
  };
  const chip = (ativo: boolean) =>
    `shrink-0 rounded-full px-4 py-2 text-[14px] font-medium transition ${ativo ? "bg-inverso text-sobre-inverso" : "bg-superficie text-texto ring-1 ring-linha hover:ring-texto/30"}`;

  return (
    <div className="mx-auto max-w-[1240px] pt-8 sm:pt-12">
      <div className="px-4 sm:px-6">
        <h1 className="entra text-[36px] leading-tight font-semibold tracking-[-0.04em] sm:text-[52px]">
          {categoria ? nomeCategoria(categoria) : q ? `Busca: ${q}` : "Loja"}
        </h1>
        <form action="/loja" className="entra relative mt-6 max-w-md" style={{ "--atraso": "80ms" } as React.CSSProperties} role="search">
          {categoria && <input type="hidden" name="categoria" value={categoria} />}
          <label htmlFor="busca" className="sr-only">Buscar produto</label>
          <Search className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-suave" />
          <input id="busca" name="q" type="search" defaultValue={q} placeholder="iPhone 15, AirPods, drone..." autoComplete="off" enterKeyHint="search" className="campo rounded-full pl-11" />
        </form>
      </div>

      <nav aria-label="Categorias" className="trilho mt-6 sm:px-6">
        <Link href={url({ categoria: "" })} className={chip(!categoria)}>Tudo</Link>
        {CATEGORIAS.map((c) => (
          <Link key={c.id} href={url({ categoria: c.id })} className={chip(categoria === c.id)}>{c.nome}</Link>
        ))}
      </nav>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex gap-1 rounded-full bg-superficie-2 p-1" role="group" aria-label="Condição">
          {[{ id: "", nome: "Todos" }, ...CONDICOES].map((c) => (
            <Link key={c.id} href={url({ condicao: c.id })} aria-current={condicao === c.id ? "true" : undefined} className={`rounded-full px-3.5 py-1.5 text-[13.5px] font-medium transition ${condicao === c.id ? "bg-superficie text-texto shadow-suave" : "text-suave hover:text-texto"}`}>
              {c.nome}
            </Link>
          ))}
        </div>
        <div className="flex gap-1 text-[13.5px]" aria-label="Ordenar">
          {ORDENS.map((o) => (
            <Link key={o.id} href={url({ ordem: o.id })} className={`rounded-full px-3 py-1.5 transition ${ordem === o.id ? "font-semibold text-texto" : "text-suave hover:text-texto"}`}>
              {o.nome}
            </Link>
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-6">
        {produtos.length ? (
          <>
            <p className="mt-6 text-[13px] text-suave">{produtos.length} {produtos.length === 1 ? "produto" : "produtos"}</p>
            <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
              {produtos.map((p, i) => (
                <CartaoProduto key={p.id} p={p} atraso={(i % 4) * 60} />
              ))}
            </div>
          </>
        ) : (
          <div className="mt-10 rounded-cartao bg-superficie px-6 py-14 text-center ring-1 ring-linha">
            <p className="text-[18px] font-semibold">Nada por aqui com esses filtros.</p>
            <p className="mt-2 text-[15px] text-suave">Muita coisa chega antes de entrar no site. Pergunte no WhatsApp.</p>
            <Link href="/loja" className="btn btn-claro mt-6"><X className="size-4" /> Limpar filtros</Link>
          </div>
        )}
      </div>
    </div>
  );
}
