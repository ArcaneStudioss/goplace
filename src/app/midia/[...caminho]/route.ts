import fs from "node:fs";
import { Readable } from "node:stream";
import { caminhoLocal, nomeSeguro, TIPOS } from "@/lib/midia";

// Serve as fotos/videos guardados no disco (desenvolvimento, ou producao sem Supabase).
// Aceita Range: o Safari do iPhone so toca video se o servidor responder por pedacos.
export async function GET(req: Request, ctx: RouteContext<"/midia/[...caminho]">) {
  const { caminho } = await ctx.params;
  const nome = nomeSeguro(caminho.join("/"));
  if (!nome) return new Response("Não encontrado", { status: 404 });
  const arq = caminhoLocal(nome);
  let tamanho: number;
  try {
    tamanho = (await fs.promises.stat(arq)).size;
  } catch {
    return new Response("Não encontrado", { status: 404 });
  }
  const tipo = TIPOS[nome.split(".").pop() as keyof typeof TIPOS];
  const base = {
    "Content-Type": tipo,
    "Cache-Control": "public, max-age=31536000, immutable",
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
  };
  const range = req.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (range && (range[1] || range[2])) {
    let ini = range[1] ? Number(range[1]) : tamanho - Number(range[2]);
    let fim = range[1] && range[2] ? Number(range[2]) : tamanho - 1;
    ini = Math.max(0, ini);
    fim = Math.min(fim, tamanho - 1, ini + 4 * 1024 * 1024 - 1); // no maximo 4 MB por pedaco
    if (ini > fim || ini >= tamanho) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${tamanho}` } });
    }
    const corpo = Readable.toWeb(fs.createReadStream(arq, { start: ini, end: fim })) as ReadableStream;
    return new Response(corpo, {
      status: 206,
      headers: { ...base, "Content-Range": `bytes ${ini}-${fim}/${tamanho}`, "Content-Length": String(fim - ini + 1) },
    });
  }
  return new Response(Readable.toWeb(fs.createReadStream(arq)) as ReadableStream, {
    headers: { ...base, "Content-Length": String(tamanho) },
  });
}
