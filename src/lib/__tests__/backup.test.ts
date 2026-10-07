import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";

// Teste de restauracao de verdade: backup do banco de exemplo -> cifra -> restaura num banco novo -> compara.
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }), headers: async () => new Headers() }));

describe("backup e restauracao", () => {
  it("restaura tudo igual num banco novo e recusa chave errada", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-bak-"));
    const { PGlite } = await import("@electric-sql/pglite");
    const { migrar } = await import("../migracoes");
    const { semear } = await import("../semente");
    const bk = await import("../backup");
    type B = import("../db").Banco;
    const abrir = async (sub: string): Promise<B> => {
      const pg = new PGlite(path.join(dir, sub));
      const wrap = (s: typeof pg | Parameters<Parameters<typeof pg.transaction>[0]>[0], emTx: boolean): B => ({
        query: async (q, p = []) => (await s.query(q, p as unknown[])).rows as never,
        exec: async (q) => void (await s.exec(q)),
        tx: async (fn) => (emTx ? fn(wrap(s, true)) : pg.transaction((t) => fn(wrap(t, true)))),
      });
      const db = wrap(pg, false);
      await migrar(db);
      return db;
    };
    const origem = await abrir("origem");
    await semear(origem);
    const chave = crypto.randomBytes(32);
    const arq = await bk.empacotar(await bk.exportar(origem), chave);
    await expect(bk.desempacotar(arq, crypto.randomBytes(32))).rejects.toThrow();

    const destino = await abrir("destino");
    await bk.restaurar(destino, await bk.desempacotar(arq, chave));
    for (const t of ["produtos", "fotos", "pedidos", "pedido_itens", "usuarios"]) {
      const a = await origem.query(`select * from loja.${t} order by id`);
      const b = await destino.query(`select * from loja.${t} order by id`);
      expect(b).toEqual(a);
    }
    // sequencia ajustada: um produto novo nao colide com os restaurados
    const [{ id }] = await destino.query<{ id: number }>("insert into loja.produtos (slug, nome, categoria, preco_centavos) values ('novo', 'Novo', 'iphone', 1) returning id");
    expect(id).toBeGreaterThan(8);
    // nunca restaura por cima de um banco com dados
    await expect(bk.restaurar(destino, await bk.desempacotar(arq, chave))).rejects.toThrow(/já tem produtos/);
  });

  it("nomes de retencao cobrem 7 dias, 4 semanas e 12 meses", async () => {
    const { nomesDoDia } = await import("../backup");
    const nomes = new Set<string>();
    for (let d = 0; d < 400; d++) nomesDoDia(new Date(Date.UTC(2026, 0, 1) + d * 864e5)).forEach((n) => nomes.add(n));
    expect([...nomes].filter((n) => n.includes("diario")).length).toBe(7);
    expect([...nomes].filter((n) => n.includes("semanal")).length).toBe(4);
    expect([...nomes].filter((n) => n.includes("mensal")).length).toBe(12);
  });
});
