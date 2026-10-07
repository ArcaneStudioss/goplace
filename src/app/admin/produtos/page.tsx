import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { exigirEquipe } from "@/lib/auth";
import { CATEGORIAS, STATUS_PRODUTO, nomeCategoria, nomeCondicao, reais } from "@/lib/comum";
import { lerConfig } from "@/lib/config";
import { banco } from "@/lib/db";
import { listarPainel } from "@/lib/produtos";
import { AcoesProduto, NovoProduto } from "@/components/admin/AcoesProduto";
import { Abas, SeloStatus, Titulo, Vazio } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Produtos" };

export default async function Produtos({ searchParams }: PageProps<"/admin/produtos">) {
  const u = await exigirEquipe();
  const sp = await searchParams;
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  const status = s(sp.status) in STATUS_PRODUTO ? s(sp.status) : "";
  const categoria = CATEGORIAS.some((c) => c.id === sp.categoria) ? s(sp.categoria) : "";
  const q = s(sp.q).slice(0, 60);
  const [produtos, config, contagem] = await Promise.all([
    listarPainel({ status, categoria, busca: q }),
    lerConfig(),
    (await banco()).query<{ status: string; n: number }>("select status, count(*)::int as n from loja.produtos group by status"),
  ]);
  const n = Object.fromEntries(contagem.map((c) => [c.status, c.n]));
  const url = (st: string) => `/admin/produtos?${new URLSearchParams({ ...(st && { status: st }), ...(categoria && { categoria }), ...(q && { q }) })}`;

  return (
    <div className="mx-auto max-w-[1100px]">
      <Titulo titulo="Produtos" sub="Tudo o que aparece na loja. Clique em Editar para trocar fotos, preço e laudo.">
        <NovoProduto laudoItens={config.laudoItens} />
      </Titulo>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Abas
          ativo={status}
          itens={[
            { id: "", nome: "Todos", href: url(""), n: Object.values(n).reduce((a, b) => a + b, 0) },
            ...Object.entries(STATUS_PRODUTO).map(([k, v]) => ({ id: k, nome: v, href: url(k), n: n[k] })),
          ]}
        />
        <form className="relative sm:w-64" role="search">
          {status && <input type="hidden" name="status" value={status} />}
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-suave" />
          <label htmlFor="q" className="sr-only">Buscar produto</label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder="Buscar produto" autoComplete="off" className="campo h-10 rounded-full py-0 pl-10 text-[14px]" />
        </form>
      </div>

      {produtos.length ? (
        <ul className="mt-5 grid gap-2.5">
          {produtos.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 rounded-cartao bg-superficie p-3 ring-1 ring-linha sm:flex-row sm:items-center sm:gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-3.5">
                <span className="size-16 shrink-0 overflow-hidden rounded-miudo bg-superficie-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.fotos[0] && <img src={p.fotos[0].pequena} alt="" loading="lazy" className="size-full object-cover" />}
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5">
                    <Link href={`/produto/${p.slug}`} target="_blank" rel="noopener noreferrer" className="truncate text-[15px] font-semibold hover:underline">{p.nome}</Link>
                    {p.exemplo && <span className="selo text-[11px]">Exemplo</span>}
                    {p.destaque && <span className="selo selo-acento text-[11px]">Destaque</span>}
                  </p>
                  <p className="mt-0.5 text-[13px] text-suave">
                    {nomeCategoria(p.categoria)} · {nomeCondicao(p.condicao)} · {p.fotos.length} {p.fotos.length === 1 ? "foto" : "fotos"} · estoque {p.estoque} · {p.visitas} visitas
                  </p>
                  <p className="num mt-0.5 flex items-center gap-2 text-[14px]">
                    <strong>{reais(p.preco)}</strong>
                    {p.custo != null && <span className="text-[12.5px] text-suave">custo {reais(p.custo)}</span>}
                    <SeloStatus status={p.status} texto={STATUS_PRODUTO[p.status]} />
                  </p>
                </div>
              </div>
              <AcoesProduto p={p} laudoItens={config.laudoItens} admin={u.papel === "admin"} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6"><Vazio>Nenhum produto aqui. Use Novo produto para cadastrar o primeiro.</Vazio></div>
      )}
    </div>
  );
}
