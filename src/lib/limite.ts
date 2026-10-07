import "server-only";
import { headers } from "next/headers";
import { ipDosCabecalhos } from "./ip";

// Limite de chamadas por chave numa janela fixa, em memoria (o site roda numa instancia so).
// Serve pra travar quem tenta adivinhar cupom, inundar o banco ou martelar o webhook.
type Balde = { n: number; ate: number };
const g = globalThis as typeof globalThis & { __gpLimite?: Map<string, Balde> };
const baldes = () => (g.__gpLimite ??= new Map());

/** true quando a chave passou do maximo dentro da janela (conta esta chamada). */
export function excedeu(chave: string, max: number, janelaMs: number): boolean {
  const m = baldes();
  const agora = Date.now();
  if (m.size > 5000) for (const [k, b] of m) if (b.ate < agora) m.delete(k); // limpeza
  const b = m.get(chave);
  if (!b || b.ate < agora) {
    m.set(chave, { n: 1, ate: agora + janelaMs });
    return false;
  }
  b.n++;
  return b.n > max;
}

/** Igual a excedeu(), por IP do visitante. Sem IP identificavel nao limita (evita travar todo mundo junto). */
export async function excedeuIp(nome: string, max: number, janelaMs: number): Promise<boolean> {
  let ip: string | null = null;
  try {
    ip = ipDosCabecalhos(await headers());
  } catch {
    /* fora de requisicao */
  }
  return ip ? excedeu(`${nome}:${ip}`, max, janelaMs) : false;
}
