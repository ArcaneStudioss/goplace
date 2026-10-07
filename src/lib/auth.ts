import "server-only";
import crypto from "node:crypto";
import { promisify } from "node:util";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { banco, type Banco } from "./db";

// Login do painel: e-mail + senha (scrypt). A sessao e um token aleatorio num cookie httpOnly;
// no banco fica so o hash do token. Erros de senha sao contados por e-mail e por IP.

export const COOKIE = "gp_sessao";
const DIAS_SESSAO = 14;
const MAX_FALHAS_EMAIL = 6; // por 15 min
const MAX_FALHAS_IP = 25; // por hora

export type Usuario = { id: number; email: string; nome: string; papel: "admin" | "vendedor" };

const scrypt = promisify(crypto.scrypt) as (s: string, salt: Buffer, n: number, o: crypto.ScryptOptions) => Promise<Buffer>;
const OPCOES: crypto.ScryptOptions = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export async function gerarHashSenha(senha: string) {
  const salt = crypto.randomBytes(16);
  const h = await scrypt(senha, salt, 64, OPCOES);
  return `scrypt$${salt.toString("base64")}$${h.toString("base64")}`;
}

export async function conferirSenha(senha: string, guardado: string) {
  const [tipo, salt64, hash64] = guardado.split("$");
  if (tipo !== "scrypt" || !salt64 || !hash64) return false;
  const esperado = Buffer.from(hash64, "base64");
  const h = await scrypt(senha, Buffer.from(salt64, "base64"), esperado.length, OPCOES);
  return crypto.timingSafeEqual(h, esperado);
}

// hash de uma senha qualquer: comparar com ele quando o e-mail nao existe gasta o mesmo tempo
let hashFalso: Promise<string> | null = null;

const COMUNS = /^(0123456789|1234567890|9876543210|senha|password|qwerty|abcdef|goplace|iphone)/i;
export function senhaFraca(senha: string, email = "", nome = ""): string | null {
  if (senha.length < 10) return "A senha precisa de pelo menos 10 caracteres.";
  if (/^(.)\1+$/.test(senha) || COMUNS.test(senha) || new Set(senha).size < 5) return "Essa senha é fácil demais de adivinhar.";
  const partes = [email.split("@")[0], ...nome.split(/\s+/)].map((x) => x.toLowerCase()).filter((x) => x.length >= 3);
  if (partes.some((x) => senha.toLowerCase().includes(x))) return "A senha não pode ter o seu nome ou e-mail.";
  return null;
}

// Primeiro acesso: sem nenhum usuario no banco, cria o admin de ADMIN_EMAIL/ADMIN_SENHA (se configurados).
export async function garantirPrimeiroAdmin(db: Banco) {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const senha = process.env.ADMIN_SENHA;
  if (!email || !senha) return;
  const [{ n }] = await db.query<{ n: number }>("select count(*)::int as n from loja.usuarios");
  if (n > 0) return;
  await db.query(
    "insert into loja.usuarios (email, nome, senha_hash, papel) values ($1, $2, $3, 'admin') on conflict (email) do nothing",
    [email, "Administrador", await gerarHashSenha(senha)],
  );
}

export async function entrar(
  emailBruto: string,
  senha: string,
  ipHash: string | null,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const email = emailBruto.trim().toLowerCase();
  const db = await banco();
  await garantirPrimeiroAdmin(db);
  const [lim] = await db.query<{ e: number; i: number }>(
    `select (select count(*) from loja.falhas_login where email = $1 and criado_em > now() - interval '15 minutes')::int as e,
            (select count(*) from loja.falhas_login where $2::text is not null and ip_hash = $2 and criado_em > now() - interval '1 hour')::int as i`,
    [email, ipHash],
  );
  if (lim.e >= MAX_FALHAS_EMAIL || lim.i >= MAX_FALHAS_IP) {
    return { ok: false, erro: "Muitas tentativas erradas. Espere 15 minutos e tente de novo." };
  }
  const [u] = await db.query<{ id: number; senha_hash: string; ativo: boolean }>(
    "select id, senha_hash, ativo from loja.usuarios where email = $1",
    [email],
  );
  hashFalso ??= gerarHashSenha(crypto.randomBytes(12).toString("hex"));
  const certo = await conferirSenha(senha, u?.senha_hash ?? (await hashFalso));
  if (!u || !certo || !u.ativo) {
    await db.query("insert into loja.falhas_login (email, ip_hash) values ($1, $2)", [email, ipHash]);
    db.query("delete from loja.falhas_login where criado_em < now() - interval '1 day'").catch(() => {});
    return { ok: false, erro: "E-mail ou senha incorretos." };
  }
  const token = crypto.randomBytes(32).toString("base64url");
  await db.query(
    `insert into loja.sessoes (token_hash, usuario_id, expira_em) values ($1, $2, now() + interval '${DIAS_SESSAO} days')`,
    [sha(token), u.id],
  );
  await db.query("update loja.usuarios set ultimo_acesso = now() where id = $1", [u.id]);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DIAS_SESSAO * 24 * 3600,
  });
  return { ok: true };
}

export async function sair() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    const db = await banco();
    await db.query("delete from loja.sessoes where token_hash = $1", [sha(token)]);
  }
  jar.delete(COOKIE);
}

export const usuarioAtual = cache(async (): Promise<Usuario | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const db = await banco();
  const [u] = await db.query<Usuario>(
    `select u.id, u.email, u.nome, u.papel from loja.sessoes s join loja.usuarios u on u.id = s.usuario_id
     where s.token_hash = $1 and s.expira_em > now() and u.ativo`,
    [sha(token)],
  );
  return u ?? null;
});

// Toda pagina e toda acao do painel chama isto (o layout sozinho nao protege acoes).
export async function exigirEquipe(): Promise<Usuario> {
  const u = await usuarioAtual();
  if (!u) redirect("/entrar");
  return u;
}

export async function exigirAdmin(): Promise<Usuario> {
  const u = await exigirEquipe();
  if (u.papel !== "admin") redirect("/admin?aviso=so-admin");
  return u;
}
