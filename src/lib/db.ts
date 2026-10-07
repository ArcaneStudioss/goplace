import "server-only";
import path from "node:path";
import { migrar } from "./migracoes";

// Uma interface so pra dois bancos:
//  - producao: Postgres do Supabase, via DATABASE_URL
//  - desenvolvimento: PGlite (Postgres em WASM, arquivo local), quando nao ha
//    DATABASE_URL. Assim da pra rodar e testar a loja sem tocar no banco real.
// Todo SQL e escrito uma vez so, com parametros $1, $2...

export type Linha = Record<string, unknown>;

export interface Banco {
  query<T = Linha>(sql: string, params?: unknown[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
  tx<T>(fn: (db: Banco) => Promise<T>): Promise<T>;
}

type Global = typeof globalThis & { __gpBanco?: Promise<Banco> };
const g = globalThis as Global;

export function banco(): Promise<Banco> {
  if (!g.__gpBanco) {
    // em producao o banco local nao serve (o disco da hospedagem pode ser apagado): exige o Supabase
    if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL && !process.env.PERMITIR_BANCO_LOCAL) {
      throw new Error("DATABASE_URL nao configurada: em producao o site precisa do banco do Supabase.");
    }
    g.__gpBanco = (process.env.DATABASE_URL ? abrirPostgres(process.env.DATABASE_URL) : abrirPglite()).catch(
      (e) => {
        g.__gpBanco = undefined;
        throw e;
      },
    );
  }
  return g.__gpBanco;
}

// O driver do Postgres, ao ver `$1::jsonb`, serializa a string em JSON DE NOVO (vira um texto
// dentro do jsonb). Passando por `::text` ele manda a string como esta e o banco converte.
// O banco local (PGlite) nao tem esse problema, por isso so aqui.
const jsonComoTexto = (q: string) => q.replace(/\$(\d+)::jsonb/g, "$$$1::text::jsonb");

class ConsultaTravou extends Error {}

async function abrirPostgres(url: string): Promise<Banco> {
  const { default: postgres } = await import("postgres");
  // Pooler do Supabase em modo SESSAO (porta 5432; o modo transacao na 6543 pendurava conexoes a partir da Discloud).
  // prepare:false continua valendo nos dois modos.
  // Conexoes ficam abertas por ate 2 min parados: abrir uma nova custa ~700 ms da hospedagem ate o banco,
  // entao reaproveitar e o que deixa o painel rapido. keep_alive (TCP) evita que a rede derrube a conexao parada.
  const criar = () =>
    postgres(url, { prepare: false, max: 10, idle_timeout: 120, max_lifetime: 900, connect_timeout: 8, keep_alive: 30 });
  let sql = criar();
  let recriadoEm = 0;
  type Consulta = { unsafe: (q: string, p?: never[]) => Promise<unknown> };
  const LIMITE_MS = 10_000;
  const comLimite = <T,>(p: Promise<T>) =>
    Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new ConsultaTravou("consulta ao banco travou")), LIMITE_MS))]);
  // Consulta pendurada: troca o pool por um novo. O antigo NAO e derrubado na hora (isso matava as consultas
  // de outras pessoas que estavam em andamento); ele fecha sozinho quando as consultas dele terminarem.
  const recriar = (doPool: ReturnType<typeof criar>) => {
    if (doPool !== sql || Date.now() - recriadoEm < 5_000) return; // outra consulta ja trocou
    console.error("[db] consulta travou (>10s): abrindo conexoes novas com o banco");
    recriadoEm = Date.now();
    sql = criar();
    void doPool.end({ timeout: 30 }).catch(() => {});
  };
  const somenteLeitura = (q: string) => /^\s*(select|with)\b/i.test(q) && !/\b(insert|update|delete)\b/i.test(q);
  const wrap = (s: () => Consulta, emTx: boolean): Banco => ({
    async query<T>(q: string, params: unknown[] = []) {
      const exec = () => s().unsafe(jsonComoTexto(q), params as never[]) as unknown as Promise<T[]>;
      if (emTx) return exec();
      const pool = sql;
      try {
        return await comLimite(exec());
      } catch (e) {
        if (!(e instanceof ConsultaTravou)) throw e;
        recriar(pool);
        if (!somenteLeitura(q)) throw e; // escrita: nao repete sozinho (poderia duplicar)
        return comLimite(exec());
      }
    },
    async exec(q: string) {
      await s().unsafe(q);
    },
    async tx<T>(fn: (db: Banco) => Promise<T>) {
      if (emTx) return fn(wrap(s, true)); // ja dentro de transacao
      return (await sql.begin((t) => fn(wrap(() => t as unknown as Consulta, true)))) as T;
    },
  });
  const db = wrap(() => sql as unknown as Consulta, false);
  await migrar(db, (m) => console.info("[db]", m)); // cada migracao roda uma vez so (fica registrada em loja.migracoes)
  return db;
}

const atrasoSimulado = Number(process.env.DB_LATENCIA_MS) || 0;

async function abrirPglite(): Promise<Banco> {
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.PGLITE_DIR || path.join(process.cwd(), ".dados", "pglite");
  await (await import("node:fs/promises")).mkdir(path.dirname(dir), { recursive: true });
  const pg = new PGlite(dir);
  type Tx = Parameters<Parameters<typeof pg.transaction>[0]>[0];
  const wrap = (s: typeof pg | Tx, emTx: boolean): Banco => ({
    async query<T>(q: string, params: unknown[] = []) {
      // so pra medir: DB_LATENCIA_MS simula o tempo de ida e volta ate o banco da hospedagem (~130 ms)
      if (atrasoSimulado) await new Promise((r) => setTimeout(r, atrasoSimulado));
      return (await s.query<T>(q, params as unknown[])).rows as T[];
    },
    async exec(q: string) {
      await s.exec(q);
    },
    async tx<T>(fn: (db: Banco) => Promise<T>) {
      if (emTx) return fn(wrap(s, true));
      return (pg as typeof pg).transaction((t) => fn(wrap(t, true)));
    },
  });
  const db = wrap(pg, false);
  await migrar(db);
  const [{ n }] = await db.query<{ n: number }>("select count(*)::int as n from loja.produtos");
  if (n === 0 && !process.env.SEM_SEMENTE) {
    const { semear } = await import("./semente");
    await semear(db);
  }
  return db;
}
