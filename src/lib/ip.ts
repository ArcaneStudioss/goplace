import "server-only";
import crypto from "node:crypto";
import { headers } from "next/headers";

// IP do visitante guardado so como hash (LGPD). Cabecalhos do proxy: cf-connecting-ip > x-real-ip > ULTIMO do x-forwarded-for
// (o ultimo e o que o proxy da hospedagem acrescenta; o primeiro o visitante pode forjar).
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const chave = process.env.SESSION_SECRET || "dev-demo-nao-use-em-producao";
  return crypto.createHmac("sha256", chave).update(ip.trim()).digest("hex").slice(0, 32);
}

export function ipDosCabecalhos(h: Headers): string | null {
  return h.get("cf-connecting-ip")?.trim() || h.get("x-real-ip")?.trim() || (h.get("x-forwarded-for") ?? "").split(",").pop()?.trim() || null;
}

export async function ipHashAtual(): Promise<string | null> {
  try {
    return hashIp(ipDosCabecalhos(await headers()));
  } catch {
    return null;
  }
}
