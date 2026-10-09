"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirAdmin, exigirEquipe, gerarHashSenha, senhaFraca } from "@/lib/auth";
import { CATEGORIAS, PAGAMENTO, STATUS_PEDIDO, STATUS_PRODUTO, lerReais, slugificar, soDigitos, type Laudo } from "@/lib/comum";
import { PADRAO, salvarConfig, type ConfigSite } from "@/lib/config";
import { banco } from "@/lib/db";
import { apagar, processarFoto, processarPoster, processarVideo } from "@/lib/midia";
import { criarVendaBalcao, ErroPedido, mudarStatus } from "@/lib/pedidos";
import { slugLivre } from "@/lib/produtos";

type R = { ok: boolean; msg?: string; erro?: string };
const txt = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);
const MAX_FOTOS = 12;

function atualizarSite() {
  revalidatePath("/", "layout");
}

// ---- produtos ---------------------------------------------------------------

const Produto = z.object({
  nome: z.string().min(2, "Dê um nome ao produto.").max(120),
  categoria: z.enum(CATEGORIAS.map((c) => c.id) as [string, ...string[]]),
  marca: z.string().max(60),
  condicao: z.enum(["novo", "seminovo", "usado"]),
  status: z.enum(Object.keys(STATUS_PRODUTO) as [string, ...string[]]),
  preco: z.number({ message: "Informe o preço." }).int().min(0),
  precoAntigo: z.number().int().min(0).nullable(),
  custo: z.number().int().min(0).nullable(),
  parcelas: z.number().int().min(1).max(24),
  estoque: z.number().int().min(0).max(9999),
  resumo: z.string().max(160),
  descricao: z.string().max(4000),
  destaque: z.boolean(),
});

type Ordem = { t: "e"; id: number } | { t: "n"; i: number };

export async function salvarProduto(fd: FormData): Promise<R & { id?: number }> {
  await exigirEquipe();
  const id = Number(fd.get("id")) || null;
  const r = Produto.safeParse({
    nome: txt(fd, "nome", 120),
    categoria: txt(fd, "categoria"),
    marca: txt(fd, "marca", 60),
    condicao: txt(fd, "condicao"),
    status: txt(fd, "status") || "disponivel",
    preco: lerReais(txt(fd, "preco")) ?? undefined,
    precoAntigo: lerReais(txt(fd, "precoAntigo")),
    custo: lerReais(txt(fd, "custo")),
    parcelas: Number(txt(fd, "parcelas")) || 1,
    estoque: Number(txt(fd, "estoque")) || 0,
    resumo: txt(fd, "resumo", 160),
    descricao: txt(fd, "descricao", 4000),
    destaque: fd.get("destaque") === "on",
  });
  if (!r.success) return { ok: false, erro: r.error.issues[0].message };
  const d = r.data;

  const bateria = Number(txt(fd, "bateria"));
  const laudo: Laudo = {
    armazenamento: txt(fd, "armazenamento", 30) || undefined,
    cor: txt(fd, "cor", 40) || undefined,
    bateria: bateria >= 1 && bateria <= 100 ? Math.round(bateria) : null,
    estado: txt(fd, "estado", 60) || undefined,
    garantia: txt(fd, "garantia", 80) || undefined,
    acompanha: txt(fd, "acompanha", 120) || undefined,
    verificados: fd.getAll("verificados").map(String).filter(Boolean).slice(0, 20),
  };

  let ordem: Ordem[];
  try {
    ordem = z
      .array(z.union([z.object({ t: z.literal("e"), id: z.number().int() }), z.object({ t: z.literal("n"), i: z.number().int().min(0) })]))
      .max(MAX_FOTOS, `No máximo ${MAX_FOTOS} fotos por produto.`)
      .parse(JSON.parse(txt(fd, "fotos", 4000) || "[]"));
  } catch (e) {
    return { ok: false, erro: e instanceof z.ZodError ? e.issues[0].message : "Fotos inválidas." };
  }

  // fotos novas: processa antes de abrir a transacao (redimensionar demora)
  const arquivos = fd.getAll("novas").filter((f): f is File => f instanceof File && f.size > 0);
  const novas: Awaited<ReturnType<typeof processarFoto>>[] = [];
  try {
    for (const o of ordem) {
      if (o.t !== "n") continue;
      const f = arquivos[o.i];
      if (!f) return { ok: false, erro: "Uma das fotos não chegou. Tente de novo." };
      novas[o.i] = await processarFoto(f);
    }
  } catch (e) {
    for (const n of novas) if (n) await Promise.all([apagar(n.grande), apagar(n.pequena)]);
    return { ok: false, erro: e instanceof Error ? e.message : "Não foi possível ler uma das fotos." };
  }

  const db = await banco();
  const removidas: string[] = [];
  const salvoId = await db.tx(async (t) => {
    const slug = await slugLivre(t, slugificar(d.nome), id ?? undefined);
    const valores = [d.nome, d.categoria, d.marca, d.condicao, d.status, d.preco, d.precoAntigo, d.custo, d.parcelas, d.estoque, d.resumo, d.descricao, JSON.stringify(laudo), d.destaque, slug];
    let pid: number;
    if (id) {
      const [l] = await t.query<{ id: number }>(
        `update loja.produtos set nome = $1, categoria = $2, marca = $3, condicao = $4, status = $5, preco_centavos = $6, preco_antigo_centavos = $7,
           custo_centavos = $8, parcelas_sem_juros = $9, estoque = $10, resumo = $11, descricao = $12, laudo = $13::jsonb, destaque = $14, slug = $15,
           exemplo = false, atualizado_em = now(), vendido_em = case when $5 = 'vendido' then coalesce(vendido_em, now()) else null end
         where id = $16 returning id`,
        [...valores, id],
      );
      if (!l) throw new ErroPedido("Produto não encontrado.");
      pid = l.id;
    } else {
      const [l] = await t.query<{ id: number }>(
        `insert into loja.produtos (nome, categoria, marca, condicao, status, preco_centavos, preco_antigo_centavos, custo_centavos, parcelas_sem_juros,
           estoque, resumo, descricao, laudo, destaque, slug) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14, $15) returning id`,
        valores,
      );
      pid = l.id;
    }
    const atuais = await t.query<{ id: number; grande: string; pequena: string }>("select id, grande, pequena from loja.fotos where produto_id = $1", [pid]);
    const manter = new Set(ordem.filter((o) => o.t === "e").map((o) => (o as { id: number }).id));
    for (const f of atuais) {
      if (!manter.has(f.id)) {
        removidas.push(f.grande, f.pequena);
        await t.query("delete from loja.fotos where id = $1", [f.id]);
      }
    }
    for (const [pos, o] of ordem.entries()) {
      if (o.t === "e") {
        await t.query("update loja.fotos set ordem = $1 where id = $2 and produto_id = $3", [pos, o.id, pid]);
      } else {
        const n = novas[o.i];
        await t.query("insert into loja.fotos (produto_id, grande, pequena, largura, altura, ordem) values ($1, $2, $3, $4, $5, $6)", [
          pid, n.grande, n.pequena, n.largura, n.altura, pos,
        ]);
      }
    }
    return pid;
  });
  await Promise.all(removidas.map(apagar));
  atualizarSite();
  return { ok: true, msg: id ? "Produto salvo" : "Produto publicado", id: salvoId };
}

export async function mudarStatusProduto(id: number, status: string): Promise<R> {
  await exigirEquipe();
  if (!(status in STATUS_PRODUTO)) return { ok: false, erro: "Situação inválida." };
  const db = await banco();
  await db.query(
    `update loja.produtos set status = $2, atualizado_em = now(), vendido_em = case when $2 = 'vendido' then coalesce(vendido_em, now()) else null end where id = $1`,
    [id, status],
  );
  atualizarSite();
  return { ok: true, msg: "Atualizado" };
}

export async function apagarProduto(fd: FormData): Promise<R> {
  await exigirAdmin();
  const id = Number(fd.get("id"));
  const db = await banco();
  const fotos = await db.query<{ grande: string; pequena: string }>("select grande, pequena from loja.fotos where produto_id = $1", [id]);
  await db.query("delete from loja.produtos where id = $1", [id]);
  await Promise.all(fotos.flatMap((f) => [apagar(f.grande), apagar(f.pequena)]));
  atualizarSite();
  return { ok: true, msg: "Produto apagado" };
}

// ---- pedidos ------------------------------------------------------------------

export async function acaoStatusPedido(id: number, status: string): Promise<R> {
  const u = await exigirEquipe();
  if (!(status in STATUS_PEDIDO)) return { ok: false, erro: "Situação inválida." };
  try {
    await mudarStatus(id, status as keyof typeof STATUS_PEDIDO, u.id);
  } catch (e) {
    return { ok: false, erro: e instanceof ErroPedido ? e.message : "Não foi possível atualizar." };
  }
  atualizarSite();
  return { ok: true, msg: "Pedido atualizado" };
}

const Balcao = z.object({
  nome: z.string().max(80),
  whatsapp: z.string().max(20),
  pagamento: z.enum(Object.keys(PAGAMENTO) as [string, ...string[]]),
  desconto: z.number().int().min(0),
  observacao: z.string().max(500),
  itens: z
    .array(z.object({ produtoId: z.number().int().positive().nullable(), nome: z.string().min(1).max(120), preco: z.number().int().min(0), quantidade: z.number().int().min(1).max(99) }))
    .min(1, "Adicione pelo menos um item.")
    .max(30),
});

export async function venderNoBalcao(fd: FormData): Promise<R> {
  const u = await exigirEquipe();
  let itens: unknown;
  try {
    itens = JSON.parse(txt(fd, "itens", 20000) || "[]");
  } catch {
    return { ok: false, erro: "Itens inválidos." };
  }
  const r = Balcao.safeParse({
    nome: txt(fd, "nome", 80),
    whatsapp: soDigitos(txt(fd, "whatsapp", 20)),
    pagamento: txt(fd, "pagamento"),
    desconto: lerReais(txt(fd, "desconto")) ?? 0,
    observacao: txt(fd, "observacao", 500),
    itens,
  });
  if (!r.success) return { ok: false, erro: r.error.issues[0].message };
  try {
    const codigo = await criarVendaBalcao({ ...r.data, pagamento: r.data.pagamento as keyof typeof PAGAMENTO, usuarioId: u.id });
    atualizarSite();
    return { ok: true, msg: `Venda ${codigo} registrada` };
  } catch (e) {
    return { ok: false, erro: e instanceof ErroPedido ? e.message : "Não foi possível registrar a venda." };
  }
}

// ---- site ---------------------------------------------------------------------

export async function salvarContato(fd: FormData): Promise<R> {
  await exigirAdmin();
  const whatsapp = soDigitos(txt(fd, "whatsapp", 20));
  if (whatsapp && (whatsapp.length < 10 || whatsapp.length > 13)) return { ok: false, erro: "WhatsApp com DDD, só números." };
  const instagram = txt(fd, "instagram", 40).replace(/^@/, "").replace(/[^a-zA-Z0-9._]/g, "");
  const operadora = txt(fd, "operadoraUrl", 300);
  if (operadora && !/^https:\/\/[^\s]+$/.test(operadora)) return { ok: false, erro: "O link da Nova Linha precisa começar com https://" };
  await salvarConfig({ whatsapp, instagram, operadoraUrl: operadora });
  atualizarSite();
  return { ok: true };
}

export async function salvarPagamento(fd: FormData): Promise<R> {
  await exigirAdmin();
  const parcelasMax = Math.min(24, Math.max(1, Number(txt(fd, "parcelasMax")) || 12));
  await salvarConfig({ parcelasMax, garantia: txt(fd, "garantia", 40) || PADRAO.garantia, crediario: txt(fd, "crediario", 220) || PADRAO.crediario });
  atualizarSite();
  return { ok: true };
}

export async function salvarLojas(fd: FormData): Promise<R> {
  await exigirAdmin();
  const lojas: ConfigSite["lojas"] = [0, 1].map((i) => ({
    cidade: txt(fd, `cidade${i}`, 60) || PADRAO.lojas[i].cidade,
    endereco: txt(fd, `endereco${i}`, 160),
    horario: txt(fd, `horario${i}`, 120),
    mapa: /^https:\/\//.test(txt(fd, `mapa${i}`, 400)) ? txt(fd, `mapa${i}`, 400) : "",
  }));
  await salvarConfig({ lojas });
  atualizarSite();
  return { ok: true };
}

export async function salvarLaudo(fd: FormData): Promise<R> {
  await exigirAdmin();
  const itens = txt(fd, "itens", 2000).split("\n").map((s) => s.trim().slice(0, 60)).filter(Boolean).slice(0, 12);
  if (itens.length < 3) return { ok: false, erro: "Coloque pelo menos 3 itens, um por linha." };
  await salvarConfig({ laudoItens: itens });
  atualizarSite();
  return { ok: true };
}

export async function salvarPrevia(fd: FormData): Promise<R> {
  await exigirAdmin();
  await salvarConfig({ previa: fd.get("previa") === "on" });
  atualizarSite();
  return { ok: true };
}

export async function salvarVideo(fd: FormData): Promise<R> {
  await exigirAdmin();
  const { lerConfig } = await import("@/lib/config");
  const atual = await lerConfig();
  if (fd.get("remover") === "1") {
    await salvarConfig({ videoTopo: null, posterTopo: null });
    await Promise.all([apagar(atual.videoTopo), apagar(atual.posterTopo)]);
    atualizarSite();
    return { ok: true, msg: "Vídeo removido" };
  }
  const video = fd.get("video");
  const poster = fd.get("poster");
  if (!(video instanceof File) || !video.size) return { ok: false, erro: "Escolha o arquivo do vídeo." };
  try {
    const urlVideo = await processarVideo(video);
    const urlPoster = poster instanceof File && poster.size ? await processarPoster(poster) : null;
    await salvarConfig({ videoTopo: urlVideo, posterTopo: urlPoster });
    await Promise.all([apagar(atual.videoTopo), apagar(atual.posterTopo)]);
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Não foi possível enviar o vídeo." };
  }
  atualizarSite();
  return { ok: true, msg: "Vídeo no ar" };
}

// ---- equipe -------------------------------------------------------------------

export async function salvarUsuario(fd: FormData): Promise<R> {
  const eu = await exigirAdmin();
  const id = Number(fd.get("id")) || null;
  const nome = txt(fd, "nome", 80);
  const email = txt(fd, "email", 200).toLowerCase();
  const papel = txt(fd, "papel") === "admin" ? "admin" : "vendedor";
  const ativo = id ? fd.get("ativo") === "on" : true;
  const senha = String(fd.get("senha") ?? "");
  if (nome.length < 2) return { ok: false, erro: "Informe o nome." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, erro: "E-mail inválido." };
  if (!id || senha) {
    const fraca = senhaFraca(senha, email, nome);
    if (fraca) return { ok: false, erro: fraca };
  }
  if (id === eu.id && (papel !== "admin" || !ativo)) return { ok: false, erro: "Você não pode tirar o seu próprio acesso de administrador." };
  const db = await banco();
  try {
    if (id) {
      await db.query("update loja.usuarios set nome = $1, email = $2, papel = $3, ativo = $4 where id = $5", [nome, email, papel, ativo, id]);
      if (senha) await db.query("update loja.usuarios set senha_hash = $1 where id = $2", [await gerarHashSenha(senha), id]);
      if (senha || !ativo) await db.query("delete from loja.sessoes where usuario_id = $1 and $1 <> $2", [id, eu.id]);
    } else {
      await db.query("insert into loja.usuarios (nome, email, papel, senha_hash) values ($1, $2, $3, $4)", [nome, email, papel, await gerarHashSenha(senha)]);
    }
  } catch (e) {
    if (String(e).includes("unique")) return { ok: false, erro: "Já existe alguém com esse e-mail." };
    throw e;
  }
  revalidatePath("/admin/equipe");
  return { ok: true };
}

export async function trocarMinhaSenha(fd: FormData): Promise<R> {
  const eu = await exigirEquipe();
  const { conferirSenha } = await import("@/lib/auth");
  const atual = String(fd.get("atual") ?? "");
  const nova = String(fd.get("nova") ?? "");
  const db = await banco();
  const [u] = await db.query<{ senha_hash: string }>("select senha_hash from loja.usuarios where id = $1", [eu.id]);
  if (!u || !(await conferirSenha(atual, u.senha_hash))) return { ok: false, erro: "Senha atual incorreta." };
  const fraca = senhaFraca(nova, eu.email, eu.nome);
  if (fraca) return { ok: false, erro: fraca };
  await db.query("update loja.usuarios set senha_hash = $1 where id = $2", [await gerarHashSenha(nova), eu.id]);
  return { ok: true, msg: "Senha trocada" };
}
