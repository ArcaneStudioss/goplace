import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-pedidos-"));
process.env.PGLITE_DIR = path.join(dir, "db");
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }), headers: async () => new Headers() }));

describe("pedidos e estoque", () => {
  let db: Awaited<ReturnType<typeof import("../db").banco>>;
  let ped: typeof import("../pedidos");
  const estoque = async (id: number) => (await db.query<{ estoque: number; status: string }>("select estoque, status from loja.produtos where id = $1", [id]))[0];
  let iphone: number;
  let fonte: number;

  beforeAll(async () => {
    db = await (await import("../db")).banco();
    ped = await import("../pedidos");
    [{ id: iphone }] = await db.query<{ id: number }>(
      "insert into loja.produtos (slug, nome, categoria, preco_centavos, custo_centavos, estoque) values ('teste-iphone', 'iPhone teste', 'iphone', 300000, 250000, 1) returning id",
    );
    [{ id: fonte }] = await db.query<{ id: number }>(
      "insert into loja.produtos (slug, nome, categoria, preco_centavos, estoque) values ('teste-fonte', 'Fonte teste', 'acessorios', 35000, 5) returning id",
    );
  });

  it("pedido do site usa o preco do banco, nao o do navegador", async () => {
    const codigo = await ped.criarPedidoSite(
      { nome: "Cliente", whatsapp: "51999990000", recebimento: "retirada_sap", pagamento: "pix", observacao: "", itens: [{ id: iphone, quantidade: 1 }, { id: fonte, quantidade: 2 }] },
      null,
    );
    const p = await ped.porCodigo(codigo);
    expect(p?.total).toBe(300000 + 2 * 35000);
    expect(p?.status).toBe("novo");
    expect((await estoque(iphone)).estoque).toBe(1); // pedido novo nao mexe no estoque
  });

  it("recusa quantidade acima do estoque e produto indisponivel", async () => {
    await expect(
      ped.criarPedidoSite({ nome: "X", whatsapp: "51999990000", recebimento: "entrega", pagamento: "pix", observacao: "", itens: [{ id: fonte, quantidade: 9 }] }, null),
    ).rejects.toThrow(/Temos só 5/);
  });

  it("confirmar reserva o aparelho unico; pagar baixa o estoque uma vez so; cancelar devolve", async () => {
    const [p] = await ped.listarPedidos({ status: "novo" });
    const [{ id: u }] = await db.query<{ id: number }>("insert into loja.usuarios (email, nome, senha_hash) values ('t@t.t', 'T', 'x') returning id");
    await ped.mudarStatus(p.id, "confirmado", u);
    expect((await estoque(iphone)).status).toBe("reservado");
    await ped.mudarStatus(p.id, "pago", u);
    await ped.mudarStatus(p.id, "entregue", u);
    expect(await estoque(iphone)).toEqual({ estoque: 0, status: "vendido" });
    expect((await estoque(fonte)).estoque).toBe(3);
    await ped.mudarStatus(p.id, "cancelado", u);
    expect(await estoque(iphone)).toEqual({ estoque: 1, status: "disponivel" });
    expect((await estoque(fonte)).estoque).toBe(5);
  });

  it("venda de balcao entra paga, aplica desconto e baixa estoque", async () => {
    const [{ id: u }] = await db.query<{ id: number }>("select id from loja.usuarios where email = 't@t.t'");
    const codigo = await ped.criarVendaBalcao({
      nome: "", whatsapp: "", pagamento: "dinheiro", desconto: 5000, observacao: "",
      itens: [{ produtoId: fonte, nome: "Fonte teste", preco: 35000, quantidade: 1 }, { produtoId: null, nome: "Película", preco: 4000, quantidade: 1 }],
      usuarioId: u,
    });
    const p = await ped.porCodigo(codigo);
    expect(p?.status).toBe("entregue");
    expect(p?.total).toBe(35000 + 4000 - 5000);
    expect((await estoque(fonte)).estoque).toBe(4);
  });

  it("codigo do pedido tem formato facil de ditar", () => {
    for (let i = 0; i < 50; i++) expect(ped.gerarCodigo()).toMatch(/^GP[A-HJ-NP-Z2-9]{6}$/);
  });
});
