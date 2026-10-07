import fs from "node:fs/promises";
import path from "node:path";
import type { Banco } from "./db";

// Aplica db/migrations/*.sql em ordem, uma vez cada (registra em loja.migracoes).
// Em producao roda via `npm run db:migrar`; no PGlite local roda sozinho.
export async function migrar(db: Banco, log: (m: string) => void = () => {}) {
  await db.exec(`
    do $$ begin if not exists (select 1 from pg_namespace where nspname = 'loja') then create schema loja; end if; end $$;
    create table if not exists loja.migracoes (
      nome text primary key,
      aplicada_em timestamptz not null default now()
    );
  `);
  const dir = path.join(process.cwd(), "db", "migrations");
  const arquivos = (await fs.readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  const feitas = new Set(
    (await db.query<{ nome: string }>("select nome from loja.migracoes")).map((r) => r.nome),
  );
  for (const arq of arquivos) {
    if (feitas.has(arq)) continue;
    const sql = await fs.readFile(path.join(dir, arq), "utf8");
    await db.tx(async (t) => {
      await t.exec(sql);
      await t.query("insert into loja.migracoes (nome) values ($1)", [arq]);
    });
    log(`migracao aplicada: ${arq}`);
  }
}
