import { usuarioAtual } from "@/lib/auth";
import { PAGAMENTO, STATUS_PEDIDO } from "@/lib/comum";
import { banco } from "@/lib/db";
import { lerPeriodo } from "@/lib/relatorios";

// Planilha das vendas do periodo (abre no Excel/Google Planilhas). Ponto e virgula + BOM para acentos no Excel brasileiro.
export async function GET(req: Request) {
  if (!(await usuarioAtual())) return new Response("Não autorizado", { status: 401 });
  const u = new URL(req.url);
  const p = lerPeriodo(u.searchParams.get("de") ?? undefined, u.searchParams.get("ate") ?? undefined);
  const db = await banco();
  const linhas = await db.query<{ codigo: string; data: string; origem: string; status: string; cliente: string; pagamento: string; item: string; qtd: number; preco: number; custo: number | null }>(
    `select pe.codigo, to_char(coalesce(pe.pago_em, pe.criado_em) at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') as data, pe.origem, pe.status,
       pe.nome as cliente, pe.pagamento, i.nome as item, i.quantidade as qtd, i.preco_centavos as preco, i.custo_centavos as custo
     from loja.pedidos pe join loja.pedido_itens i on i.pedido_id = pe.id
     where (coalesce(pe.pago_em, pe.criado_em) at time zone 'America/Sao_Paulo')::date between $1::date and $2::date
     order by pe.criado_em, i.id`,
    [p.de, p.ate],
  );
  // =, +, -, @ no comeco viram formula no Excel: prefixa com apostrofo
  const cel = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const n = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ","));
  const cab = ["Pedido", "Data", "Origem", "Situação", "Cliente", "Pagamento", "Item", "Qtd", "Preço", "Custo", "Total do item"];
  const corpo = linhas.map((l) =>
    [l.codigo, l.data, l.origem === "site" ? "Site" : "Balcão", STATUS_PEDIDO[l.status as keyof typeof STATUS_PEDIDO] ?? l.status, l.cliente,
      PAGAMENTO[l.pagamento as keyof typeof PAGAMENTO] ?? l.pagamento, l.item, l.qtd, n(l.preco), n(l.custo), n(l.preco * l.qtd)].map(cel).join(";"),
  );
  return new Response("﻿" + [cab.join(";"), ...corpo].join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vendas-${p.de}-a-${p.ate}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
