import "server-only";
import { cache } from "react";
import { banco, type Banco } from "./db";
import type { Laudo, StatusProduto } from "./comum";

export type Foto = { id: number; grande: string; pequena: string; largura: number; altura: number; ordem: number };

export type Produto = {
  id: number;
  slug: string;
  nome: string;
  categoria: string;
  marca: string;
  condicao: "novo" | "seminovo" | "usado";
  preco: number;
  precoAntigo: number | null;
  custo: number | null;
  parcelasSemJuros: number;
  resumo: string;
  descricao: string;
  laudo: Laudo;
  estoque: number;
  status: StatusProduto;
  destaque: boolean;
  exemplo: boolean;
  visitas: number;
  criadoEm: string;
  atualizadoEm: string;
  vendidoEm: string | null;
  fotos: Foto[];
};

const CAMPOS = `p.id, p.slug, p.nome, p.categoria, p.marca, p.condicao, p.preco_centavos as "preco", p.preco_antigo_centavos as "precoAntigo",
  p.custo_centavos as "custo", p.parcelas_sem_juros as "parcelasSemJuros", p.resumo, p.descricao, p.laudo, p.estoque, p.status,
  p.destaque, p.exemplo, p.visitas, p.criado_em as "criadoEm", p.atualizado_em as "atualizadoEm", p.vendido_em as "vendidoEm",
  coalesce((select json_agg(json_build_object('id', f.id, 'grande', f.grande, 'pequena', f.pequena, 'largura', f.largura,
    'altura', f.altura, 'ordem', f.ordem) order by f.ordem, f.id) from loja.fotos f where f.produto_id = p.id), '[]'::json) as fotos`;

// o driver do Postgres devolve json como objeto; o PGlite tambem. Datas viram texto ISO pra atravessar pro navegador.
function normalizar(l: Record<string, unknown>): Produto {
  const data = (v: unknown) => (v == null ? null : v instanceof Date ? v.toISOString() : String(v));
  const json = <T,>(v: unknown, padrao: T): T => (v == null ? padrao : typeof v === "string" ? (JSON.parse(v) as T) : (v as T));
  return {
    ...(l as unknown as Produto),
    laudo: json<Laudo>(l.laudo, {}),
    fotos: json<Foto[]>(l.fotos, []),
    criadoEm: data(l.criadoEm)!,
    atualizadoEm: data(l.atualizadoEm)!,
    vendidoEm: data(l.vendidoEm),
  };
}

export type FiltroVitrine = { categoria?: string; condicao?: string; busca?: string; ordem?: "recentes" | "menor" | "maior" };

// Vitrine publica: so o que esta a venda ou reservado (reservado aparece com selo, vendido some).
export async function listarVitrine(f: FiltroVitrine = {}, limite = 120): Promise<Produto[]> {
  const db = await banco();
  const params: unknown[] = [];
  const onde = ["p.status in ('disponivel', 'reservado')"];
  if (f.categoria) onde.push(`p.categoria = $${params.push(f.categoria)}`);
  if (f.condicao) onde.push(`p.condicao = $${params.push(f.condicao)}`);
  if (f.busca) onde.push(`(p.nome ilike $${params.push(`%${f.busca.replace(/[%_\\]/g, "")}%`)} or p.marca ilike $${params.length})`);
  const ordem =
    f.ordem === "menor" ? "p.preco_centavos asc" : f.ordem === "maior" ? "p.preco_centavos desc" : "p.status = 'disponivel' desc, p.destaque desc, p.criado_em desc";
  const linhas = await db.query(`select ${CAMPOS} from loja.produtos p where ${onde.join(" and ")} order by ${ordem} limit ${Number(limite)}`, params);
  return linhas.map(normalizar);
}

export async function destaques(limite = 8): Promise<Produto[]> {
  const db = await banco();
  const linhas = await db.query(
    `select ${CAMPOS} from loja.produtos p where p.status = 'disponivel'
     order by p.destaque desc, (p.categoria = 'iphone') desc, p.criado_em desc limit ${Number(limite)}`,
  );
  return linhas.map(normalizar);
}

export const porSlug = cache(async (slug: string): Promise<Produto | null> => {
  const db = await banco();
  const [l] = await db.query(`select ${CAMPOS} from loja.produtos p where p.slug = $1 and p.status <> 'oculto'`, [slug]);
  return l ? normalizar(l) : null;
});

export async function relacionados(p: Produto, limite = 4): Promise<Produto[]> {
  const db = await banco();
  const linhas = await db.query(
    `select ${CAMPOS} from loja.produtos p where p.status = 'disponivel' and p.id <> $1
     order by (p.categoria = $2) desc, abs(p.preco_centavos - $3) asc limit ${Number(limite)}`,
    [p.id, p.categoria, p.preco],
  );
  return linhas.map(normalizar);
}

export async function contarVisita(id: number) {
  const db = await banco();
  await db.query("update loja.produtos set visitas = visitas + 1 where id = $1", [id]);
}

export async function contagemPorCategoria(): Promise<Record<string, number>> {
  const db = await banco();
  const linhas = await db.query<{ categoria: string; n: number }>(
    "select categoria, count(*)::int as n from loja.produtos where status in ('disponivel', 'reservado') group by categoria",
  );
  return Object.fromEntries(linhas.map((l) => [l.categoria, l.n]));
}

export async function slugsPublicos(): Promise<{ slug: string; atualizadoEm: string }[]> {
  const db = await banco();
  const linhas = await db.query<{ slug: string; a: Date | string }>(
    "select slug, atualizado_em as a from loja.produtos where status in ('disponivel', 'reservado')",
  );
  return linhas.map((l) => ({ slug: l.slug, atualizadoEm: l.a instanceof Date ? l.a.toISOString() : String(l.a) }));
}

// ---- painel ----------------------------------------------------------------

export type FiltroPainel = { status?: string; categoria?: string; busca?: string };

export async function listarPainel(f: FiltroPainel = {}): Promise<Produto[]> {
  const db = await banco();
  const params: unknown[] = [];
  const onde = ["true"];
  if (f.status) onde.push(`p.status = $${params.push(f.status)}`);
  if (f.categoria) onde.push(`p.categoria = $${params.push(f.categoria)}`);
  if (f.busca) onde.push(`p.nome ilike $${params.push(`%${f.busca.replace(/[%_\\]/g, "")}%`)}`);
  const linhas = await db.query(
    `select ${CAMPOS} from loja.produtos p where ${onde.join(" and ")}
     order by case p.status when 'disponivel' then 0 when 'reservado' then 1 when 'oculto' then 2 else 3 end, p.atualizado_em desc limit 500`,
    params,
  );
  return linhas.map(normalizar);
}

export async function porId(id: number, db?: Banco): Promise<Produto | null> {
  const b = db ?? (await banco());
  const [l] = await b.query(`select ${CAMPOS} from loja.produtos p where p.id = $1`, [id]);
  return l ? normalizar(l) : null;
}

export async function slugLivre(db: Banco, base: string, id?: number) {
  let slug = base || "produto";
  for (let i = 2; ; i++) {
    const [l] = await db.query<{ id: number }>("select id from loja.produtos where slug = $1", [slug]);
    if (!l || l.id === id) return slug;
    slug = `${base}-${i}`;
  }
}
