import crypto from "node:crypto";
import zlib from "node:zlib";
import { promisify } from "node:util";
import type { Banco } from "./db";

// Backup do banco da GoPlace (playbooks/backup.md, tipo C).
//  - copia consistente (uma transacao so, leitura repetivel) de todas as tabelas do esquema loja, em JSON
//  - gzip + AES-256-GCM com a chave BACKUP_CHAVE (base64 de 32 bytes), que fica FORA do servidor tambem
//  - envia para armazenamento S3 compativel (Cloudflare R2 / Backblaze B2) fora da hospedagem
//  - retencao pelo nome do arquivo, sem precisar listar nem apagar: diario-<dia da semana> (7),
//    semanal-<semana % 4> (4) e mensal-<mes> (12). Cada envio sobrescreve o mais antigo do mesmo tipo.
// Sessoes e tentativas de login ficam de fora (sao descartaveis e sensiveis).

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
const MAGIA = Buffer.from("GPBAK1\n");

// ordem de restauracao (respeita as chaves estrangeiras)
export const TABELAS = ["usuarios", "produtos", "fotos", "pedidos", "pedido_itens", "historico_pedidos", "config", "migracoes"] as const;

export type Copia = { versao: 1; criadoEm: string; tabelas: Record<string, Record<string, unknown>[]> };

export async function exportar(db: Banco): Promise<Copia> {
  return db.tx(async (t) => {
    await t.query("set transaction isolation level repeatable read").catch(() => {});
    const tabelas: Copia["tabelas"] = {};
    for (const nome of TABELAS) tabelas[nome] = await t.query(`select * from loja.${nome} order by 1`);
    return { versao: 1, criadoEm: new Date().toISOString(), tabelas };
  });
}

export function lerChave(b64 = process.env.BACKUP_CHAVE): Buffer {
  const k = Buffer.from(b64 ?? "", "base64");
  if (k.length !== 32) throw new Error("BACKUP_CHAVE precisa ser base64 de 32 bytes (openssl rand -base64 32).");
  return k;
}

export async function empacotar(c: Copia, chave: Buffer): Promise<Buffer> {
  const dados = await gzip(Buffer.from(JSON.stringify(c)));
  const iv = crypto.randomBytes(12);
  const cif = crypto.createCipheriv("aes-256-gcm", chave, iv);
  const corpo = Buffer.concat([cif.update(dados), cif.final()]);
  return Buffer.concat([MAGIA, iv, corpo, cif.getAuthTag()]);
}

export async function desempacotar(arq: Buffer, chave: Buffer): Promise<Copia> {
  if (!arq.subarray(0, MAGIA.length).equals(MAGIA)) throw new Error("Arquivo não é um backup da GoPlace.");
  const iv = arq.subarray(MAGIA.length, MAGIA.length + 12);
  const tag = arq.subarray(arq.length - 16);
  const corpo = arq.subarray(MAGIA.length + 12, arq.length - 16);
  const dec = crypto.createDecipheriv("aes-256-gcm", chave, iv);
  dec.setAuthTag(tag);
  const dados = Buffer.concat([dec.update(corpo), dec.final()]); // chave errada ou arquivo alterado: lanca erro aqui
  const c = JSON.parse((await gunzip(dados)).toString("utf8")) as Copia;
  if (c.versao !== 1 || !c.tabelas) throw new Error("Versão de backup desconhecida.");
  return c;
}

// Restaura num banco VAZIO (ja migrado). Nunca roda por cima de um banco com produtos, para nao misturar dados.
export async function restaurar(db: Banco, c: Copia) {
  await db.tx(async (t) => {
    const [{ n }] = await t.query<{ n: number }>("select count(*)::int as n from loja.produtos");
    if (n > 0) throw new Error("O banco de destino já tem produtos. Restaure num banco novo.");
    await t.query("delete from loja.config");
    await t.query("delete from loja.usuarios");
    for (const nome of TABELAS) {
      if (nome === "migracoes") continue;
      const json = new Set(
        (await t.query<{ c: string }>(
          "select column_name as c from information_schema.columns where table_schema = 'loja' and table_name = $1 and data_type in ('jsonb', 'json')",
          [nome],
        )).map((x) => x.c),
      );
      for (const l of c.tabelas[nome] ?? []) {
        const cols = Object.keys(l).filter((k) => /^[a-z_]+$/.test(k));
        const vals = cols.map((k) => (json.has(k) ? JSON.stringify(l[k]) : l[k]));
        await t.query(
          `insert into loja.${nome} (${cols.join(", ")}) values (${cols.map((k, i) => (json.has(k) ? `$${i + 1}::jsonb` : `$${i + 1}`)).join(", ")})`,
          vals,
        );
      }
      if (nome !== "config") {
        await t.query(`select setval(pg_get_serial_sequence('loja.${nome}', 'id'), coalesce((select max(id) from loja.${nome}), 0) + 1, false)`);
      }
    }
  });
}

// ---- envio S3 compativel (assinatura SigV4, sem dependencias) -------------------

type S3 = { endpoint: string; bucket: string; regiao: string; id: string; segredo: string };
export function configS3(): S3 | null {
  const e = process.env;
  if (!e.BACKUP_S3_ENDPOINT || !e.BACKUP_S3_BUCKET || !e.BACKUP_S3_CHAVE_ID || !e.BACKUP_S3_SEGREDO) return null;
  return { endpoint: e.BACKUP_S3_ENDPOINT.replace(/\/+$/, ""), bucket: e.BACKUP_S3_BUCKET, regiao: e.BACKUP_S3_REGIAO || "auto", id: e.BACKUP_S3_CHAVE_ID, segredo: e.BACKUP_S3_SEGREDO };
}

const hmac = (k: Buffer | string, s: string) => crypto.createHmac("sha256", k).update(s).digest();
const sha = (b: Buffer | string) => crypto.createHash("sha256").update(b).digest("hex");

export async function s3(metodo: "PUT" | "GET", cfg: S3, chave: string, corpo?: Buffer): Promise<Buffer> {
  const url = new URL(`${cfg.endpoint}/${cfg.bucket}/${chave}`);
  const agora = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dia = agora.slice(0, 8);
  const hashCorpo = sha(corpo ?? Buffer.alloc(0));
  const cab: Record<string, string> = { host: url.host, "x-amz-content-sha256": hashCorpo, "x-amz-date": agora };
  const nomes = Object.keys(cab).sort();
  const canonico = [metodo, url.pathname, "", ...nomes.map((n) => `${n}:${cab[n]}`), "", nomes.join(";"), hashCorpo].join("\n");
  const escopo = `${dia}/${cfg.regiao}/s3/aws4_request`;
  const assinar = ["AWS4-HMAC-SHA256", agora, escopo, sha(canonico)].join("\n");
  const kAss = hmac(hmac(hmac(hmac(`AWS4${cfg.segredo}`, dia), cfg.regiao), "s3"), "aws4_request");
  const assinatura = crypto.createHmac("sha256", kAss).update(assinar).digest("hex");
  const r = await fetch(url, {
    method: metodo,
    headers: { ...cab, Authorization: `AWS4-HMAC-SHA256 Credential=${cfg.id}/${escopo}, SignedHeaders=${nomes.join(";")}, Signature=${assinatura}` },
    body: corpo ? new Uint8Array(corpo) : undefined,
  });
  if (!r.ok) throw new Error(`S3 ${metodo} ${chave}: ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

export function nomesDoDia(d = new Date()): string[] {
  const inicioAno = Date.UTC(d.getUTCFullYear(), 0, 1);
  const semana = Math.floor((d.getTime() - inicioAno) / (7 * 864e5));
  return [`goplace/diario-${d.getUTCDay()}.gpbak`, `goplace/semanal-${semana % 4}.gpbak`, `goplace/mensal-${String(d.getUTCMonth() + 1).padStart(2, "0")}.gpbak`];
}

// Faz o backup completo: exporta, cifra, envia e confere lendo de volta o arquivo diario.
export async function fazerBackup(db: Banco): Promise<{ bytes: number; enviados: string[] }> {
  const cfg = configS3();
  if (!cfg) throw new Error("Armazenamento de backup não configurado (BACKUP_S3_*).");
  const chave = lerChave();
  const arq = await empacotar(await exportar(db), chave);
  const nomes = nomesDoDia();
  for (const n of nomes) await s3("PUT", cfg, n, arq);
  const volta = await s3("GET", cfg, nomes[0]);
  await desempacotar(volta, chave); // verificado: decifra e le o JSON
  await db.query(
    `insert into loja.config (chave, valor, atualizado_em) values ('_ultimo_backup', $1::jsonb, now())
     on conflict (chave) do update set valor = excluded.valor, atualizado_em = now()`,
    [JSON.stringify({ em: new Date().toISOString(), bytes: arq.length })],
  );
  return { bytes: arq.length, enviados: nomes };
}

// true quando nao ha armazenamento configurado ou o ultimo backup bom tem mais de 36 h (alerta do painel)
export async function backupAtrasado(db: Banco): Promise<boolean> {
  if (!configS3() || !process.env.BACKUP_CHAVE) return true;
  const [l] = await db.query<{ em: string | null }>("select valor->>'em' as em from loja.config where chave = '_ultimo_backup'");
  return !l?.em || Date.now() - Date.parse(l.em) > 36 * 3600_000;
}
