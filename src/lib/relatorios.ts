import "server-only";
import { banco } from "./db";

// Numeros do painel. Venda = pedido pago ou entregue, contada na data do pagamento (pago_em), horario de Brasilia.
const TZ = "America/Sao_Paulo";
const VENDA = "pe.status in ('pago', 'entregue')";

export type Periodo = { de: string; ate: string }; // yyyy-mm-dd, inclusivo

export function periodoPadrao(dias = 30): Periodo {
  const hoje = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  const de = new Date(hoje);
  de.setDate(de.getDate() - (dias - 1));
  const f = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { de: f(de), ate: f(hoje) };
}

export function lerPeriodo(de?: string, ate?: string, dias = 30): Periodo {
  const ok = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
  if (ok(de) && ok(ate) && de! <= ate!) return { de: de!, ate: ate! };
  return periodoPadrao(dias);
}

const NO_PERIODO = `(pe.pago_em at time zone '${TZ}')::date between $1::date and $2::date`;

export type Resumo = { faturamento: number; vendas: number; ticket: number; lucro: number | null; itens: number; semCusto: number };

export async function resumo(p: Periodo): Promise<Resumo> {
  const db = await banco();
  const [r] = await db.query<{ fat: number; vendas: number; itens: number; custo: number; com_custo_fat: number; sem_custo: number }>(
    `select coalesce(sum(pe.total_centavos), 0)::int as fat, count(*)::int as vendas,
       coalesce((select sum(i.quantidade) from loja.pedido_itens i join loja.pedidos pe on pe.id = i.pedido_id where ${VENDA} and ${NO_PERIODO}), 0)::int as itens,
       coalesce((select sum(i.custo_centavos * i.quantidade) from loja.pedido_itens i join loja.pedidos pe on pe.id = i.pedido_id where ${VENDA} and ${NO_PERIODO} and i.custo_centavos is not null), 0)::int as custo,
       coalesce((select sum(i.preco_centavos * i.quantidade) from loja.pedido_itens i join loja.pedidos pe on pe.id = i.pedido_id where ${VENDA} and ${NO_PERIODO} and i.custo_centavos is not null), 0)::int as com_custo_fat,
       coalesce((select count(*) from loja.pedido_itens i join loja.pedidos pe on pe.id = i.pedido_id where ${VENDA} and ${NO_PERIODO} and i.custo_centavos is null), 0)::int as sem_custo
     from loja.pedidos pe where ${VENDA} and ${NO_PERIODO}`,
    [p.de, p.ate],
  );
  return {
    faturamento: r.fat,
    vendas: r.vendas,
    ticket: r.vendas ? Math.round(r.fat / r.vendas) : 0,
    lucro: r.com_custo_fat ? r.com_custo_fat - r.custo : null,
    itens: r.itens,
    semCusto: r.sem_custo,
  };
}

export async function vendasPorDia(p: Periodo): Promise<{ dia: string; valor: number; vendas: number }[]> {
  const db = await banco();
  const linhas = await db.query<{ dia: string; valor: number; vendas: number }>(
    `select to_char(d::date, 'YYYY-MM-DD') as dia,
       coalesce((select sum(pe.total_centavos) from loja.pedidos pe where ${VENDA} and (pe.pago_em at time zone '${TZ}')::date = d::date), 0)::int as valor,
       coalesce((select count(*) from loja.pedidos pe where ${VENDA} and (pe.pago_em at time zone '${TZ}')::date = d::date), 0)::int as vendas
     from generate_series($1::date, $2::date, interval '1 day') d order by d`,
    [p.de, p.ate],
  );
  return linhas;
}

export async function porCategoria(p: Periodo): Promise<{ categoria: string; valor: number; itens: number }[]> {
  const db = await banco();
  return db.query(
    `select coalesce(nullif(i.categoria, ''), 'outros') as categoria, sum(i.preco_centavos * i.quantidade)::int as valor, sum(i.quantidade)::int as itens
     from loja.pedido_itens i join loja.pedidos pe on pe.id = i.pedido_id where ${VENDA} and ${NO_PERIODO}
     group by 1 order by 2 desc`,
    [p.de, p.ate],
  );
}

export async function porPagamento(p: Periodo): Promise<{ pagamento: string; valor: number; vendas: number }[]> {
  const db = await banco();
  return db.query(
    `select pe.pagamento, sum(pe.total_centavos)::int as valor, count(*)::int as vendas
     from loja.pedidos pe where ${VENDA} and ${NO_PERIODO} group by 1 order by 2 desc`,
    [p.de, p.ate],
  );
}

export async function porOrigem(p: Periodo): Promise<{ origem: string; valor: number; vendas: number }[]> {
  const db = await banco();
  return db.query(
    `select pe.origem, sum(pe.total_centavos)::int as valor, count(*)::int as vendas
     from loja.pedidos pe where ${VENDA} and ${NO_PERIODO} group by 1 order by 2 desc`,
    [p.de, p.ate],
  );
}

export async function maisVendidos(p: Periodo, limite = 8): Promise<{ nome: string; itens: number; valor: number }[]> {
  const db = await banco();
  return db.query(
    `select i.nome, sum(i.quantidade)::int as itens, sum(i.preco_centavos * i.quantidade)::int as valor
     from loja.pedido_itens i join loja.pedidos pe on pe.id = i.pedido_id where ${VENDA} and ${NO_PERIODO}
     group by i.nome order by 3 desc limit ${Number(limite)}`,
    [p.de, p.ate],
  );
}

// Pedidos do site que nao viraram venda: quantos e quanto dinheiro ficou na mesa
export async function funilSite(p: Periodo): Promise<{ pedidos: number; vendidos: number; cancelados: number; abertos: number; valorPerdido: number }> {
  const db = await banco();
  const [r] = await db.query<{ pedidos: number; vendidos: number; cancelados: number; abertos: number; perdido: number }>(
    `select count(*)::int as pedidos,
       count(*) filter (where pe.status in ('pago', 'entregue'))::int as vendidos,
       count(*) filter (where pe.status = 'cancelado')::int as cancelados,
       count(*) filter (where pe.status in ('novo', 'confirmado'))::int as abertos,
       coalesce(sum(pe.total_centavos) filter (where pe.status = 'cancelado'), 0)::int as perdido
     from loja.pedidos pe where pe.origem = 'site' and (pe.criado_em at time zone '${TZ}')::date between $1::date and $2::date`,
    [p.de, p.ate],
  );
  return { ...r, valorPerdido: r.perdido };
}

export async function estoqueParado(dias = 30): Promise<{ id: number; nome: string; dias: number; preco: number }[]> {
  const db = await banco();
  return db.query(
    `select id, nome, (current_date - criado_em::date)::int as dias, preco_centavos as preco from loja.produtos
     where status = 'disponivel' and criado_em < now() - make_interval(days => $1::int) order by criado_em asc limit 10`,
    [dias],
  );
}

export async function maisVistos(limite = 6): Promise<{ id: number; nome: string; visitas: number; status: string }[]> {
  const db = await banco();
  return db.query(`select id, nome, visitas, status from loja.produtos where visitas > 0 order by visitas desc limit ${Number(limite)}`);
}

export async function valorEmEstoque(): Promise<{ itens: number; venda: number; custo: number | null }> {
  const db = await banco();
  const [r] = await db.query<{ itens: number; venda: number; custo: number | null }>(
    `select coalesce(sum(estoque), 0)::int as itens, coalesce(sum(estoque * preco_centavos), 0)::int as venda,
       sum(estoque * custo_centavos)::int as custo from loja.produtos where status in ('disponivel', 'reservado')`,
  );
  return r;
}

export async function clientes(): Promise<{ nome: string; whatsapp: string; pedidos: number; compras: number; total: number; ultimo: string }[]> {
  const db = await banco();
  const linhas = await db.query<{ nome: string; whatsapp: string; pedidos: number; compras: number; total: number; ultimo: Date | string }>(
    `select (array_agg(nome order by criado_em desc))[1] as nome, whatsapp, count(*)::int as pedidos,
       count(*) filter (where status in ('pago', 'entregue'))::int as compras,
       coalesce(sum(total_centavos) filter (where status in ('pago', 'entregue')), 0)::int as total, max(criado_em) as ultimo
     from loja.pedidos where whatsapp <> '' group by whatsapp order by max(criado_em) desc limit 500`,
  );
  return linhas.map((l) => ({ ...l, ultimo: l.ultimo instanceof Date ? l.ultimo.toISOString() : String(l.ultimo) }));
}
