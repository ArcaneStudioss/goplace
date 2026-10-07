import "server-only";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

// Onde ficam as fotos dos produtos e o video do topo.
//  - producao: Supabase Storage (SUPABASE_URL + SUPABASE_SERVICE_KEY). O disco da hospedagem
//    pode ser apagado num deploy, entao nada de midia do cliente fica so nele.
//  - desenvolvimento: pasta local (.dados/midia), servida pela rota /midia/...
// Os nomes sao aleatorios: um arquivo nunca muda depois de enviado (cache longo e seguro).

const LOCAL = path.join(process.cwd(), ".dados", "midia");
const supa = () =>
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
    ? { url: process.env.SUPABASE_URL.replace(/\/+$/, ""), chave: process.env.SUPABASE_SERVICE_KEY, balde: process.env.SUPABASE_BUCKET || "goplace" }
    : null;

export const TIPOS = { webp: "image/webp", jpg: "image/jpeg", mp4: "video/mp4", webm: "video/webm" } as const;
export type Extensao = keyof typeof TIPOS;

export function nomeSeguro(caminho: string): string | null {
  // so "pasta/arquivo.ext" com letras, numeros e hifen: nada de "..", barra no comeco ou extensao estranha
  return /^(produtos|site)\/[a-z0-9-]{8,80}\.(webp|jpg|mp4|webm)$/.test(caminho) ? caminho : null;
}

export async function guardar(pasta: "produtos" | "site", ext: Extensao, dados: Buffer): Promise<string> {
  if (process.env.NODE_ENV === "production" && !supa() && !process.env.PERMITIR_MIDIA_LOCAL) {
    throw new Error("Armazenamento de fotos nao configurado (SUPABASE_URL / SUPABASE_SERVICE_KEY).");
  }
  const nome = `${pasta}/${Date.now().toString(36)}-${crypto.randomBytes(8).toString("hex")}.${ext}`;
  const s = supa();
  if (s) {
    const r = await fetch(`${s.url}/storage/v1/object/${s.balde}/${nome}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${s.chave}`,
        "Content-Type": TIPOS[ext],
        "Cache-Control": "31536000",
        "x-upsert": "false",
      },
      body: new Uint8Array(dados),
    });
    if (!r.ok) throw new Error(`Falha ao enviar arquivo (${r.status})`);
    return `${s.url}/storage/v1/object/public/${s.balde}/${nome}`;
  }
  const destino = path.join(LOCAL, nome);
  await fs.mkdir(path.dirname(destino), { recursive: true });
  await fs.writeFile(destino, dados);
  return `/midia/${nome}`;
}

export async function apagar(url: string | null | undefined) {
  if (!url) return;
  const s = supa();
  try {
    if (s && url.startsWith(`${s.url}/storage/v1/object/public/${s.balde}/`)) {
      const nome = url.slice(`${s.url}/storage/v1/object/public/${s.balde}/`.length);
      await fetch(`${s.url}/storage/v1/object/${s.balde}/${nome}`, { method: "DELETE", headers: { Authorization: `Bearer ${s.chave}` } });
    } else if (url.startsWith("/midia/")) {
      const nome = nomeSeguro(url.slice("/midia/".length));
      if (nome) await fs.rm(path.join(LOCAL, nome), { force: true });
    }
  } catch (e) {
    console.error("[midia] nao apagou", e);
  }
}

export const caminhoLocal = (nome: string) => path.join(LOCAL, nome);

// Recebe a foto enviada pelo painel e gera duas versoes webp (grande e miniatura), sem dados de GPS/EXIF.
export async function processarFoto(arquivo: File) {
  if (arquivo.size > 15 * 1024 * 1024) throw new Error("Foto maior que 15 MB.");
  const sharp = (await import("sharp")).default;
  const entrada = Buffer.from(await arquivo.arrayBuffer());
  const base = sharp(entrada, { failOn: "error", limitInputPixels: 60_000_000 }).rotate();
  const meta = await base.metadata().catch(() => {
    throw new Error(`"${arquivo.name.slice(0, 40)}" não é uma foto válida.`);
  });
  if (!meta.format || !["jpeg", "png", "webp", "heif", "avif"].includes(meta.format)) throw new Error("Formato de foto não aceito.");
  const grande = await base.clone().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const pequena = await base.clone().resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
  const [urlGrande, urlPequena] = await Promise.all([guardar("produtos", "webp", grande.data), guardar("produtos", "webp", pequena)]);
  return { grande: urlGrande, pequena: urlPequena, largura: grande.info.width, altura: grande.info.height };
}

// Video do topo: so confere o tipo pelos primeiros bytes (mp4/webm) e guarda como veio.
export async function processarVideo(arquivo: File) {
  if (arquivo.size > 30 * 1024 * 1024) throw new Error("Vídeo maior que 30 MB. Exporte em 1080p, até 20 segundos.");
  const dados = Buffer.from(await arquivo.arrayBuffer());
  const mp4 = dados.subarray(4, 8).toString("latin1") === "ftyp";
  const webm = dados.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (!mp4 && !webm) throw new Error("Envie o vídeo em MP4 (ou WebM).");
  return guardar("site", mp4 ? "mp4" : "webm", dados);
}

export async function processarPoster(arquivo: File) {
  const sharp = (await import("sharp")).default;
  const buf = await sharp(Buffer.from(await arquivo.arrayBuffer()), { limitInputPixels: 60_000_000 })
    .rotate()
    .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  return guardar("site", "webp", buf);
}
