import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { exigirEquipe } from "@/lib/auth";
import { nomeCategoria, reais } from "@/lib/comum";
import { backupAtrasado } from "@/lib/backup";
import { banco } from "@/lib/db";
import { contarPorStatus } from "@/lib/pedidos";
import { estoqueParado, maisVistos, periodoPadrao, porCategoria, resumo, valorEmEstoque, vendasPorDia } from "@/lib/relatorios";
import { GraficoBarras, GraficoVendas } from "@/components/admin/Graficos";
import { Numero, Painel, Titulo, Vazio } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Visão geral" };

export default async function VisaoGeral({ searchParams }: PageProps<"/admin">) {
  const u = await exigirEquipe();
  const { aviso } = await searchParams;
  const p = periodoPadrao(30);
  const [r, dias, cats, status, estoque, parados, vistos] = await Promise.all([
    resumo(p), vendasPorDia(p), porCategoria(p), contarPorStatus(), valorEmEstoque(), estoqueParado(30), maisVistos(6),
  ]);
  const abertos = (status.novo ?? 0) + (status.confirmado ?? 0);
  // alerta de backup (so em producao): sem configuracao ou ultimo backup bom com mais de 36 h
  const semBackup = process.env.NODE_ENV === "production" && u.papel === "admin" && (await backupAtrasado(await banco()));
  const hora = Number(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false }));
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="mx-auto max-w-[1100px]">
      {aviso === "so-admin" && <p className="mb-4 rounded-miudo bg-[#b45309]/10 px-4 py-3 text-[14px]">Essa área é só para administradores.</p>}
      <Titulo titulo={`${saudacao}, ${u.nome.split(" ")[0]}.`} sub="Últimos 30 dias, contando vendas pagas ou entregues." />

      {semBackup && (
        <p role="alert" className="mt-6 rounded-cartao bg-[#b42318]/10 px-5 py-4 text-[14.5px] text-[#912018] dark:text-[#fda29b]">
          Backup do banco atrasado ou não configurado. Avise a Arcane Studios.
        </p>
      )}
      {abertos > 0 && (
        <Link href="/admin/pedidos" className="mt-6 flex items-center justify-between gap-4 rounded-cartao bg-acento px-5 py-4 text-sobre-acento transition hover:brightness-105">
          <span className="text-[15.5px] font-semibold">{abertos} {abertos === 1 ? "pedido em aberto" : "pedidos em aberto"}</span>
          <ArrowRight className="size-5" />
        </Link>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero rotulo="Faturamento" valor={reais(r.faturamento)} destaque detalhe={`${r.vendas} ${r.vendas === 1 ? "venda" : "vendas"}`} />
        <Numero rotulo="Ticket médio" valor={reais(r.ticket)} detalhe={`${r.itens} itens vendidos`} />
        <Numero rotulo="Lucro bruto" valor={r.lucro == null ? "sem custo" : reais(r.lucro)} detalhe={r.semCusto ? `${r.semCusto} ${r.semCusto === 1 ? "item" : "itens"} sem custo cadastrado` : "preço menos custo"} />
        <Numero rotulo="Em estoque" valor={reais(estoque.venda)} detalhe={`${estoque.itens} itens à venda`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Painel titulo="Faturamento por dia" extra={<Link href="/admin/relatorios" className="text-[13.5px] font-medium text-acento hover:underline">Relatórios</Link>}>
          <GraficoVendas dados={dias} />
        </Painel>
        <Painel titulo="Por categoria">
          {cats.length ? <GraficoBarras dados={cats.map((c) => ({ nome: nomeCategoria(c.categoria), valor: c.valor }))} /> : <Vazio>Sem vendas no período.</Vazio>}
        </Painel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Painel titulo="Mais vistos no site">
          {vistos.length ? (
            <ol className="grid gap-2 text-[14px]">
              {vistos.map((v, i) => (
                <li key={v.id} className="flex items-center gap-3">
                  <span className="num w-5 font-mono text-[12px] text-suave">{i + 1}</span>
                  <span className="flex-1 truncate">{v.nome}</span>
                  <span className="num text-suave">{v.visitas}</span>
                </li>
              ))}
            </ol>
          ) : <Vazio>As visitas aparecem aqui quando o site estiver no ar.</Vazio>}
        </Painel>
        <Painel titulo="Parados há mais de 30 dias">
          {parados.length ? (
            <ul className="grid gap-2 text-[14px]">
              {parados.map((v) => (
                <li key={v.id} className="flex items-center gap-3">
                  <span className="flex-1 truncate">{v.nome}</span>
                  <span className="num text-suave">{v.dias} dias · {reais(v.preco)}</span>
                </li>
              ))}
            </ul>
          ) : <Vazio>Nenhum produto parado. Bom sinal.</Vazio>}
        </Painel>
      </div>
    </div>
  );
}
