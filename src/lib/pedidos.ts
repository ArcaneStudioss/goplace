import "server-only";
import crypto from "node:crypto";
import { banco, type Banco } from "./db";
import type { Pagamento, Recebimento, StatusPedido } from "./comum";

export type ItemPedido = { id: number; produtoId: number | null; nome: string; categoria: string; preco: number; custo: number | null; quantidade: number; slug: string | null; foto: string | null };
export type Pedido = {
  id: number;
  codigo: string;
  origem: "site" | "balcao";
  nome: string;
  whatsapp: string;
  recebimento: Recebimento;
  pagamento: Pagamento;
  observacao: string;
  total: number;
  desconto: number;
  status: StatusPedido;
  vendedor: string | null;
  criadoEm: string;
  pagoEm: string | null;
  itens: ItemPedido[];
};

// codigo curto, facil de ditar no WhatsApp (sem 0/O, 1/I)
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function gerarCodigo() {
  const b = crypto.randomBytes(6);
  return "GP" + Array.from(b, (x) => ALFABETO[x % ALFABETO.length]).join("");
}

const CAMPOS = `pe.id, pe.codigo, pe.origem, pe.nome, pe.whatsapp, pe.recebimento, pe.pagamento, pe.observacao,
  pe.total_centavos as total, pe.desconto_centavos as desconto, pe.status, u.nome as vendedor,
  pe.criado_em as "criadoEm", pe.pago_em as "pagoEm",
  coalesce((select json_agg(json_build_object('id', i.id, 'produtoId', i.produto_id, 'nome', i.nome, 'categoria', i.categoria,
    'preco', i.preco_centavos, 'custo', i.custo_centavos, 'quantidade', i.quantidade, 'slug', pr.slug,
    'foto', (select f.pequena from loja.fotos f where f.produto_id = i.produto_id order by f.ordem, f.id limit 1)) order by i.id)
    from loja.pedido_itens i left join loja.produtos pr on pr.id = i.produto_id where i.pedido_id = pe.id), '[]'::json) as itens`;

function normalizar(l: Record<string, unknown>): Pedido {
  const data = (v: unknown) => (v == null ? null : v instanceof Date ? v.toISOString() : String(v));
  return {
    ...(l as unknown as Pedido),
    itens: typeof l.itens === "string" ? JSON.parse(l.itens) : (l.itens as ItemPedido[]),
    criadoEm: data(l.criadoEm)!,
    pagoEm: data(l.pagoEm),
  };
}

export class ErroPedido extends Error {}

type Pedir = { nome: string; whatsapp: string; recebimento: Recebimento; pagamento: Pagamento; observacao: string; itens: { id: number; quantidade: number }[] };

// Pedido feito pelo site: precos e disponibilidade sempre conferidos aqui (o navegador so manda ids e quantidades).
export async function criarPedidoSite(p: Pedir, ipHash: string | null): Promise<string> {
  const db = await banco();
  if (ipHash) {
    const [{ n }] = await db.query<{ n: number }>(
      "select count(*)::int as n from loja.pedidos where ip_hash = $1 and criado_em > now() - interval '1 hour'",
      [ipHash],
    );
    if (n >= 8) throw new ErroPedido("Muitos pedidos seguidos deste aparelho. Fale com a gente no WhatsApp.");
  }
  return db.tx(async (t) => {
    const ids = p.itens.map((i) => i.id);
    const prods = await t.query<{ id: number; nome: string; categoria: string; preco_centavos: number; custo_centavos: number | null; estoque: number; status: string }>(
      `select id, nome, categoria, preco_centavos, custo_centavos, estoque, status from loja.produtos where id = any($1::int[]) for update`,
      [ids],
    );
    const porId = new Map(prods.map((x) => [x.id, x]));
    let total = 0;
    for (const i of p.itens) {
      const pr = porId.get(i.id);
      if (!pr || pr.status !== "disponivel") throw new ErroPedido(`${pr?.nome ?? "Um item"} não está mais disponível. Atualize a sacola.`);
      if (i.quantidade > pr.estoque) throw new ErroPedido(`Temos só ${pr.estoque} de ${pr.nome}.`);
      total += pr.preco_centavos * i.quantidade;
    }
    const codigo = gerarCodigo();
    const [{ id }] = await t.query<{ id: number }>(
      `insert into loja.pedidos (codigo, origem, nome, whatsapp, recebimento, pagamento, observacao, total_centavos, ip_hash)
       values ($1, 'site', $2, $3, $4, $5, $6, $7, $8) returning id`,
      [codigo, p.nome, p.whatsapp, p.recebimento, p.pagamento, p.observacao, total, ipHash],
    );
    for (const i of p.itens) {
      const pr = porId.get(i.id)!;
      await t.query(
        `insert into loja.pedido_itens (pedido_id, produto_id, nome, categoria, preco_centavos, custo_centavos, quantidade) values ($1, $2, $3, $4, $5, $6, $7)`,
        [id, pr.id, pr.nome, pr.categoria, pr.preco_centavos, pr.custo_centavos, i.quantidade],
      );
    }
    await t.query("insert into loja.historico_pedidos (pedido_id, de, para) values ($1, null, 'novo')", [id]);
    return codigo;
  });
}

type Balcao = {
  nome: string;
  whatsapp: string;
  pagamento: Pagamento;
  desconto: number;
  observacao: string;
  itens: { produtoId: number | null; nome: string; preco: number; quantidade: number }[];
  usuarioId: number;
};

// Venda feita na loja: entra ja como paga e baixa o estoque na hora.
export async function criarVendaBalcao(v: Balcao): Promise<string> {
  const db = await banco();
  return db.tx(async (t) => {
    const codigo = gerarCodigo();
    const bruto = v.itens.reduce((s, i) => s + i.preco * i.quantidade, 0);
    const desconto = Math.min(v.desconto, bruto);
    const [{ id }] = await t.query<{ id: number }>(
      `insert into loja.pedidos (codigo, origem, nome, whatsapp, recebimento, pagamento, observacao, total_centavos, desconto_centavos, status, vendedor_id, pago_em)
       values ($1, 'balcao', $2, $3, 'retirada_sap', $4, $5, $6, $7, 'entregue', $8, now()) returning id`,
      [codigo, v.nome || "Cliente no balcão", v.whatsapp, v.pagamento, v.observacao, bruto - desconto, desconto, v.usuarioId],
    );
    for (const i of v.itens) {
      let categoria = "";
      let custo: number | null = null;
      if (i.produtoId) {
        const [pr] = await t.query<{ categoria: string; custo_centavos: number | null; estoque: number; nome: string }>(
          "select categoria, custo_centavos, estoque, nome from loja.produtos where id = $1 for update",
          [i.produtoId],
        );
        if (!pr) throw new ErroPedido("Produto não encontrado.");
        if (pr.estoque < i.quantidade) throw new ErroPedido(`${pr.nome}: estoque insuficiente (${pr.estoque}).`);
        categoria = pr.categoria;
        custo = pr.custo_centavos;
      }
      await t.query(
        `insert into loja.pedido_itens (pedido_id, produto_id, nome, categoria, preco_centavos, custo_centavos, quantidade) values ($1, $2, $3, $4, $5, $6, $7)`,
        [id, i.produtoId, i.nome, categoria, i.preco, custo, i.quantidade],
      );
    }
    await baixarEstoque(t, id);
    await t.query("insert into loja.historico_pedidos (pedido_id, de, para, usuario_id) values ($1, null, 'entregue', $2)", [id, v.usuarioId]);
    return codigo;
  });
}

// Venda concluida (pago/entregue) tira do estoque uma vez so; cancelar depois devolve.
async function baixarEstoque(t: Banco, pedidoId: number) {
  const [pe] = await t.query<{ estoque_baixado: boolean }>("select estoque_baixado from loja.pedidos where id = $1 for update", [pedidoId]);
  if (pe.estoque_baixado) return;
  await t.query(
    `update loja.produtos p set estoque = greatest(0, p.estoque - i.q), atualizado_em = now(),
       status = case when p.estoque - i.q <= 0 then 'vendido' else p.status end,
       vendido_em = case when p.estoque - i.q <= 0 then now() else p.vendido_em end
     from (select produto_id, sum(quantidade)::int as q from loja.pedido_itens where pedido_id = $1 and produto_id is not null group by produto_id) i
     where p.id = i.produto_id`,
    [pedidoId],
  );
  await t.query("update loja.pedidos set estoque_baixado = true where id = $1", [pedidoId]);
}

async function devolverEstoque(t: Banco, pedidoId: number) {
  const [pe] = await t.query<{ estoque_baixado: boolean }>("select estoque_baixado from loja.pedidos where id = $1 for update", [pedidoId]);
  if (!pe.estoque_baixado) return;
  await t.query(
    `update loja.produtos p set estoque = p.estoque + i.q, atualizado_em = now(),
       status = case when p.status in ('vendido', 'reservado') then 'disponivel' else p.status end, vendido_em = null
     from (select produto_id, sum(quantidade)::int as q from loja.pedido_itens where pedido_id = $1 and produto_id is not null group by produto_id) i
     where p.id = i.produto_id`,
    [pedidoId],
  );
  await t.query("update loja.pedidos set estoque_baixado = false where id = $1", [pedidoId]);
}

export async function mudarStatus(pedidoId: number, para: StatusPedido, usuarioId: number) {
  const db = await banco();
  await db.tx(async (t) => {
    const [pe] = await t.query<{ status: StatusPedido }>("select status from loja.pedidos where id = $1 for update", [pedidoId]);
    if (!pe) throw new ErroPedido("Pedido não encontrado.");
    if (pe.status === para) return;
    await t.query(
      `update loja.pedidos set status = $2, atualizado_em = now(),
         pago_em = case when $2 in ('pago', 'entregue') then coalesce(pago_em, now()) when $2 = 'cancelado' then null else pago_em end
       where id = $1`,
      [pedidoId, para],
    );
    if (para === "confirmado") {
      // confirmado = separado para o cliente: o aparelho some da venda (aparece como reservado)
      await t.query(
        `update loja.produtos p set status = 'reservado', atualizado_em = now()
         from loja.pedido_itens i where i.pedido_id = $1 and i.produto_id = p.id and p.status = 'disponivel' and p.estoque <= i.quantidade`,
        [pedidoId],
      );
    }
    if (para === "pago" || para === "entregue") await baixarEstoque(t, pedidoId);
    if (para === "cancelado" || para === "novo") {
      await devolverEstoque(t, pedidoId);
      await t.query(
        `update loja.produtos p set status = 'disponivel', atualizado_em = now()
         from loja.pedido_itens i where i.pedido_id = $1 and i.produto_id = p.id and p.status = 'reservado' and p.estoque > 0`,
        [pedidoId],
      );
    }
    await t.query("insert into loja.historico_pedidos (pedido_id, de, para, usuario_id) values ($1, $2, $3, $4)", [pedidoId, pe.status, para, usuarioId]);
  });
}

export async function porCodigo(codigo: string): Promise<Pedido | null> {
  const db = await banco();
  const [l] = await db.query(`select ${CAMPOS} from loja.pedidos pe left join loja.usuarios u on u.id = pe.vendedor_id where pe.codigo = $1`, [codigo]);
  return l ? normalizar(l) : null;
}

export async function listarPedidos(f: { status?: string; busca?: string; origem?: string } = {}): Promise<Pedido[]> {
  const db = await banco();
  const params: unknown[] = [];
  const onde = ["true"];
  if (f.status) onde.push(`pe.status = $${params.push(f.status)}`);
  if (f.origem) onde.push(`pe.origem = $${params.push(f.origem)}`);
  if (f.busca) {
    const b = f.busca.replace(/[%_\\]/g, "");
    onde.push(`(pe.nome ilike $${params.push(`%${b}%`)} or pe.codigo ilike $${params.length} or pe.whatsapp like $${params.push(`%${b.replace(/\D/g, "") || "-"}%`)})`);
  }
  const linhas = await db.query(
    `select ${CAMPOS} from loja.pedidos pe left join loja.usuarios u on u.id = pe.vendedor_id where ${onde.join(" and ")} order by pe.criado_em desc limit 300`,
    params,
  );
  return linhas.map(normalizar);
}

export async function contarPorStatus(): Promise<Record<string, number>> {
  const db = await banco();
  const linhas = await db.query<{ status: string; n: number }>("select status, count(*)::int as n from loja.pedidos group by status");
  return Object.fromEntries(linhas.map((l) => [l.status, l.n]));
}
