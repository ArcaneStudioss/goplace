import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { exigirEquipe } from "@/lib/auth";
import { PAGAMENTO, nomeCategoria, reais } from "@/lib/comum";
import { funilSite, lerPeriodo, maisVendidos, periodoPadrao, porCategoria, porOrigem, porPagamento, resumo, vendasPorDia } from "@/lib/relatorios";
import { GraficoBarras, GraficoVendas } from "@/components/admin/Graficos";
import { Abas, Numero, Painel, Titulo, Vazio } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Relatórios" };

export default async function Relatorios({ searchParams }: PageProps<"/admin/relatorios">) {
  await exigirEquipe();
  const sp = await searchParams;
  const s = (v: unknown) => (typeof v === "string" ? v : undefined);
  const dias = [7, 30, 90, 365].includes(Number(sp.dias)) ? Number(sp.dias) : 30;
  const p = s(sp.de) && s(sp.ate) ? lerPeriodo(s(sp.de), s(sp.ate)) : periodoPadrao(dias);
  const [r, diaADia, cats, pags, origens, top, funil] = await Promise.all([
    resumo(p), vendasPorDia(p), porCategoria(p), porPagamento(p), porOrigem(p), maisVendidos(p), funilSite(p),
  ]);
  const fmt = (d: string) => d.split("-").reverse().join("/");
  const conversao = funil.pedidos ? Math.round((funil.vendidos / funil.pedidos) * 1000) / 10 : 0;

  return (
    <div className="mx-auto max-w-[1100px]">
      <Titulo titulo="Relatórios" sub={`De ${fmt(p.de)} a ${fmt(p.ate)}`}>
        <a href={`/admin/relatorios/csv?de=${p.de}&ate=${p.ate}`} className="btn btn-claro btn-pequeno"><Download className="size-4" /> Planilha (CSV)</a>
      </Titulo>
      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Abas ativo={s(sp.de) ? "x" : String(dias)} itens={[7, 30, 90, 365].map((d) => ({ id: String(d), nome: d === 365 ? "12 meses" : `${d} dias`, href: `/admin/relatorios?dias=${d}` }))} />
        <form className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="de" className="rotulo">De</label>
            <input id="de" name="de" type="date" defaultValue={p.de} className="campo h-10 py-0 text-[14px]" />
          </div>
          <div>
            <label htmlFor="ate" className="rotulo">Até</label>
            <input id="ate" name="ate" type="date" defaultValue={p.ate} className="campo h-10 py-0 text-[14px]" />
          </div>
          <button className="btn btn-escuro btn-pequeno h-10">Ver</button>
        </form>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero rotulo="Faturamento" valor={reais(r.faturamento)} destaque detalhe={`${r.vendas} vendas`} />
        <Numero rotulo="Ticket médio" valor={reais(r.ticket)} />
        <Numero rotulo="Lucro bruto" valor={r.lucro == null ? "sem custo" : reais(r.lucro)} detalhe={r.semCusto ? `${r.semCusto} ${r.semCusto === 1 ? "item" : "itens"} sem custo` : undefined} />
        <Numero rotulo="Pedidos do site viraram venda" valor={`${conversao.toLocaleString("pt-BR")}%`} detalhe={`${funil.vendidos} de ${funil.pedidos} pedidos`} />
      </div>

      <Painel titulo="Faturamento por dia" className="mt-4"><GraficoVendas dados={diaADia} /></Painel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Painel titulo="Por categoria">
          {cats.length ? <GraficoBarras dados={cats.map((c) => ({ nome: nomeCategoria(c.categoria), valor: c.valor }))} /> : <Vazio>Sem vendas.</Vazio>}
        </Painel>
        <Painel titulo="Por forma de pagamento">
          {pags.length ? <GraficoBarras dados={pags.map((c) => ({ nome: PAGAMENTO[c.pagamento as keyof typeof PAGAMENTO] ?? c.pagamento, valor: c.valor }))} /> : <Vazio>Sem vendas.</Vazio>}
        </Painel>
        <Painel titulo="Mais vendidos">
          {top.length ? (
            <ol className="grid gap-2 text-[14px]">
              {top.map((t, i) => (
                <li key={t.nome} className="flex items-center gap-3">
                  <span className="num w-5 font-mono text-[12px] text-suave">{i + 1}</span>
                  <span className="flex-1 truncate">{t.nome}</span>
                  <span className="num text-suave">{t.itens} · {reais(t.valor)}</span>
                </li>
              ))}
            </ol>
          ) : <Vazio>Sem vendas.</Vazio>}
        </Painel>
        <Painel titulo="Site x balcão">
          <ul className="grid gap-3 text-[14px]">
            {origens.map((o) => (
              <li key={o.origem} className="flex justify-between"><span>{o.origem === "site" ? "Pedidos do site" : "Vendas no balcão"}</span><span className="num">{o.vendas} · {reais(o.valor)}</span></li>
            ))}
            <li className="flex justify-between border-t border-linha pt-3 text-suave"><span>Pedidos do site cancelados</span><span className="num">{funil.cancelados} · {reais(funil.valorPerdido)}</span></li>
            <li className="flex justify-between text-suave"><span>Pedidos do site em aberto</span><span className="num">{funil.abertos}</span></li>
          </ul>
          {funil.abertos > 0 && <Link href="/admin/pedidos" className="mt-4 inline-block text-[13.5px] font-medium text-acento hover:underline">Responder pedidos em aberto</Link>}
        </Painel>
      </div>
    </div>
  );
}
