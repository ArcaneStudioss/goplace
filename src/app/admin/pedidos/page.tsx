import type { Metadata } from "next";
import { Search } from "lucide-react";
import { exigirEquipe } from "@/lib/auth";
import { STATUS_PEDIDO } from "@/lib/comum";
import { banco } from "@/lib/db";
import { contarPorStatus, listarPedidos } from "@/lib/pedidos";
import { BotaoJanela } from "@/components/admin/Janela";
import { CartaoPedido, FormBalcao } from "@/components/admin/Pedidos";
import { Abas, Titulo, Vazio } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Pedidos e vendas" };

export default async function Pedidos({ searchParams }: PageProps<"/admin/pedidos">) {
  await exigirEquipe();
  const sp = await searchParams;
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  const status = s(sp.status) in STATUS_PEDIDO ? s(sp.status) : s(sp.status) === "todos" ? "" : sp.status === undefined ? "abertos" : "";
  const q = s(sp.q).slice(0, 60);
  const db = await banco();
  const [todos, contagem, produtos] = await Promise.all([
    listarPedidos({ status: status === "abertos" ? "" : status, busca: q }),
    contarPorStatus(),
    db.query<{ id: number; nome: string; preco: number; estoque: number }>(
      "select id, nome, preco_centavos as preco, estoque from loja.produtos where status in ('disponivel', 'reservado') and estoque > 0 order by nome",
    ),
  ]);
  const pedidos = status === "abertos" ? todos.filter((p) => p.status === "novo" || p.status === "confirmado") : todos;
  const link = (st: string) => `/admin/pedidos?status=${st}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="mx-auto max-w-[900px]">
      <Titulo titulo="Pedidos e vendas" sub="Pedidos do site e vendas feitas na loja, no mesmo lugar.">
        <BotaoJanela rotulo="Venda no balcão" titulo="Registrar venda no balcão" icone="novo" estilo="escuro" larga>
          <FormBalcao produtos={produtos} />
        </BotaoJanela>
      </Titulo>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Abas
          ativo={status || "todos"}
          itens={[
            { id: "abertos", nome: "Em aberto", href: link("abertos"), n: (contagem.novo ?? 0) + (contagem.confirmado ?? 0) },
            ...Object.entries(STATUS_PEDIDO).map(([k, v]) => ({ id: k, nome: v, href: link(k), n: contagem[k] })),
            { id: "todos", nome: "Todos", href: link("todos") },
          ]}
        />
        <form className="relative sm:w-60" role="search">
          <input type="hidden" name="status" value={status || "todos"} />
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-suave" />
          <label htmlFor="q" className="sr-only">Buscar pedido</label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder="Nome, código ou telefone" autoComplete="off" className="campo h-10 rounded-full py-0 pl-10 text-[14px]" />
        </form>
      </div>
      {pedidos.length ? (
        <ul className="mt-5 grid gap-2.5">{pedidos.map((p) => <CartaoPedido key={p.id} p={p} />)}</ul>
      ) : (
        <div className="mt-6"><Vazio>Nenhum pedido nesta lista.</Vazio></div>
      )}
    </div>
  );
}
