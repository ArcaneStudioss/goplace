"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { PAGAMENTO_SITE, RECEBIMENTO, soDigitos } from "@/lib/comum";
import { ipHashAtual } from "@/lib/ip";
import { excedeuIp } from "@/lib/limite";
import { criarPedidoSite, ErroPedido } from "@/lib/pedidos";

const Pedido = z.object({
  nome: z.string().trim().min(2, "Informe seu nome.").max(80),
  whatsapp: z
    .string()
    .transform(soDigitos)
    .refine((v) => v.length >= 10 && v.length <= 13, "Informe um WhatsApp com DDD."),
  recebimento: z.enum(Object.keys(RECEBIMENTO) as [keyof typeof RECEBIMENTO]),
  pagamento: z.enum(PAGAMENTO_SITE as [string, ...string[]]),
  observacao: z.string().trim().max(500).default(""),
  itens: z
    .string()
    .transform((s, ctx) => {
      try {
        return JSON.parse(s);
      } catch {
        ctx.addIssue({ code: "custom", message: "Sacola inválida." });
        return z.NEVER;
      }
    })
    .pipe(z.array(z.object({ id: z.number().int().positive(), quantidade: z.number().int().min(1).max(20) })).min(1, "Sua sacola está vazia.").max(30)),
});

export type EstadoPedido = { erro?: string; campos?: Record<string, string> } | null;

export async function enviarPedido(_: EstadoPedido, fd: FormData): Promise<EstadoPedido> {
  if (await excedeuIp("pedido", 10, 10 * 60_000)) return { erro: "Muitas tentativas seguidas. Espere alguns minutos." };
  const r = Pedido.safeParse(Object.fromEntries(fd));
  if (!r.success) {
    const campos: Record<string, string> = {};
    for (const i of r.error.issues) campos[String(i.path[0])] ??= i.message;
    return { erro: campos.itens ?? "Confira os campos destacados.", campos };
  }
  let codigo: string;
  try {
    codigo = await criarPedidoSite(
      { ...r.data, pagamento: r.data.pagamento as never, itens: r.data.itens },
      await ipHashAtual(),
    );
  } catch (e) {
    if (e instanceof ErroPedido) return { erro: e.message };
    console.error("[pedido]", e);
    return { erro: "Não conseguimos registrar agora. Tente de novo ou chame no WhatsApp." };
  }
  redirect(`/pedido/${codigo}?novo=1`);
}
