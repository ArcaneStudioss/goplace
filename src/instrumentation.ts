// Roda uma vez quando o servidor sobe.
// - Abre o banco (e aplica migracoes) antes do primeiro visitante.
// - Backup diario: a cada hora confere se o ultimo backup tem mais de 23 h; se tiver, faz outro
//   (so em producao e com o armazenamento BACKUP_S3_* configurado). Ver src/lib/backup.ts.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.DATABASE_URL) return; // banco local de desenvolvimento: nada a fazer
  const { banco } = await import("./lib/db");
  banco().catch((e) => console.error("[db] nao abriu na subida", e));

  const { configS3, fazerBackup } = await import("./lib/backup");
  if (!configS3() || !process.env.BACKUP_CHAVE) {
    console.warn("[backup] BACKUP_S3_* / BACKUP_CHAVE nao configurados: SEM backup automatico");
    return;
  }
  let rodando = false;
  const talvez = async () => {
    if (rodando) return;
    rodando = true;
    try {
      const db = await banco();
      const [l] = await db.query<{ em: string }>("select valor->>'em' as em from loja.config where chave = '_ultimo_backup'");
      if (l?.em && Date.now() - Date.parse(l.em) < 23 * 3600_000) return;
      const r = await fazerBackup(db);
      console.info(`[backup] ok: ${(r.bytes / 1024).toFixed(0)} KB -> ${r.enviados.join(", ")}`);
    } catch (e) {
      console.error("[backup] FALHOU", e);
    } finally {
      rodando = false;
    }
  };
  setTimeout(talvez, 60_000).unref?.();
  setInterval(talvez, 3600_000).unref?.();
}
