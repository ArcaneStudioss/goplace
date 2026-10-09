// Comandos fora do Next (npm run db:migrar / admin:criar / backup / restaurar).
// Usa DATABASE_URL se existir; senao, o banco local de teste (.dados/pglite).
//   --producao  le .env.production.local em vez de .env.local
//   admin:criar email "Nome"          (a senha vem de ADMIN_SENHA no ambiente, nunca na linha de comando)
//   backup                            faz o backup agora e envia para o BACKUP_S3_*
//   restaurar <arquivo.gpbak | loja/diario-3.gpbak>   restaura num banco VAZIO (pede BACKUP_CHAVE)
import fs from "node:fs";
import path from "node:path";

const arquivos = process.argv.includes("--producao") ? [".env.production.local", ".env"] : [".env.local", ".env"];
for (const arq of arquivos) {
  const p = path.join(process.cwd(), arq);
  if (!fs.existsSync(p)) continue;
  for (const linha of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function main() {
  const [cmd, a1, a2] = process.argv.slice(2).filter((x) => !x.startsWith("--"));
  if (cmd === "restaurar") process.env.SEM_SEMENTE = "1";
  const { banco } = await import("../src/lib/db");
  const db = await banco();
  console.log(`> ${cmd} em ${process.env.DATABASE_URL ? "DATABASE_URL" : "banco local (.dados/pglite)"}`);

  if (cmd === "migrar") {
    const { migrar } = await import("../src/lib/migracoes");
    await migrar(db, console.log);
    console.log("ok: tabelas em dia");
  } else if (cmd === "admin") {
    const { gerarHashSenha, senhaFraca } = await import("../src/lib/auth");
    const senha = process.env.ADMIN_SENHA ?? "";
    if (!a1 || !a2) throw new Error('uso: npm run admin:criar -- email@loja.com "Nome"');
    const fraca = senhaFraca(senha, a1, a2);
    if (fraca) throw new Error(`ADMIN_SENHA: ${fraca}`);
    await db.query(
      `insert into loja.usuarios (email, nome, senha_hash, papel) values ($1, $2, $3, 'admin')
       on conflict (email) do update set senha_hash = excluded.senha_hash, papel = 'admin', ativo = true`,
      [a1.toLowerCase(), a2, await gerarHashSenha(senha)],
    );
    console.log(`ok: ${a1} e administrador`);
  } else if (cmd === "backup") {
    const { fazerBackup } = await import("../src/lib/backup");
    console.log(await fazerBackup(db));
  } else if (cmd === "restaurar") {
    const bk = await import("../src/lib/backup");
    if (!a1) throw new Error("uso: npm run restaurar -- <arquivo.gpbak | loja/diario-N.gpbak>");
    const cfg = bk.configS3();
    const arq = fs.existsSync(a1) ? fs.readFileSync(a1) : cfg ? await bk.s3("GET", cfg, a1) : null;
    if (!arq) throw new Error("arquivo nao encontrado (nem local, nem no armazenamento)");
    const copia = await bk.desempacotar(arq, bk.lerChave());
    await bk.restaurar(db, copia);
    console.log(`ok: restaurado o backup de ${copia.criadoEm}`, Object.fromEntries(Object.entries(copia.tabelas).map(([k, v]) => [k, v.length])));
  } else {
    console.log("comandos: migrar | admin | backup | restaurar");
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
