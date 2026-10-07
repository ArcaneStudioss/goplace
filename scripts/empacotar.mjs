// Gera goplace-discloud.zip pronto para subir na Discloud (app NOVO; nunca por cima de outro app).
//   npm run empacotar
// Confere o .env.production.local, roda o build AQUI (a Discloud com 1 GB nao builda Next) e deixa de fora
// tudo que e cache/desenvolvimento (node_modules, banco local, .env.local).
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { ZipArchive } from "archiver";

const raiz = process.cwd();
const saida = path.join(raiz, "goplace-discloud.zip");
const envArq = path.join(raiz, ".env.production.local");
if (!fs.existsSync(envArq)) {
  console.error("Faltou o arquivo .env.production.local (valores de producao). Veja .env.example.");
  process.exit(1);
}
const env = Object.fromEntries(
  fs.readFileSync(envArq, "utf8").split(/\r?\n/).map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2]]),
);
const obrigatorias = ["DATABASE_URL", "SITE_URL", "SESSION_SECRET", "SUPABASE_URL", "SUPABASE_SERVICE_KEY", "BACKUP_CHAVE", "BACKUP_S3_ENDPOINT", "BACKUP_S3_BUCKET", "BACKUP_S3_CHAVE_ID", "BACKUP_S3_SEGREDO"];
const faltando = obrigatorias.filter((k) => !env[k]);
if (faltando.length) {
  console.error(`Preencha em .env.production.local antes de empacotar: ${faltando.join(", ")}`);
  process.exit(1);
}
if ((env.SESSION_SECRET ?? "").length < 32) {
  console.error("SESSION_SECRET curto demais (use openssl rand -base64 48).");
  process.exit(1);
}

console.log("> next build (local)...");
execSync("npm run build", { stdio: "inherit" });
const FORA = new Set(["node_modules", ".git", ".dados", ".vscode"]);
const FORA_NEXT = [".next/cache", ".next/dev", ".next/types", ".next/diagnostics"];
const FORA_ARQ = [/^\.env\.local$/, /^\.env\.development\.local$/, /\.zip$/, /^next-env\.d\.ts$/, /\.tsbuildinfo$/, /\.gpbak$/];

const out = fs.createWriteStream(saida);
const zip = new ZipArchive({ zlib: { level: 9 } });
zip.pipe(out);
let n = 0;
(function andar(dir, rel = "") {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (FORA.has(e.name)) continue;
      if (FORA_NEXT.includes(path.posix.join(rel, e.name))) continue;
      andar(path.join(dir, e.name), path.posix.join(rel, e.name));
    } else if (!FORA_ARQ.some((r) => r.test(e.name))) {
      zip.file(path.join(dir, e.name), { name: path.posix.join(rel, e.name) });
      n++;
    }
  }
})(raiz);
out.on("close", () => console.log(`ok: ${n} arquivos, ${(zip.pointer() / 1024 / 1024).toFixed(1)} MB -> ${path.basename(saida)}`));
await zip.finalize();
