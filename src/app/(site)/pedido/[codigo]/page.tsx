import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { PAGAMENTO, RECEBIMENTO, STATUS_PEDIDO, linkWhatsapp, reais } from "@/lib/comum";
import { lerConfig } from "@/lib/config";
import { porCodigo } from "@/lib/pedidos";
import { LimparSacola } from "./LimparSacola";

export const metadata: Metadata = { title: "Pedido", robots: { index: false } };

export default async function PaginaPedido({ params, searchParams }: PageProps<"/pedido/[codigo]">) {
  const { codigo } = await params;
  const { novo } = await searchParams;
  if (!/^GP[A-Z0-9]{6}$/.test(codigo)) notFound();
  const [pedido, config] = await Promise.all([porCodigo(codigo), lerConfig()]);
  if (!pedido || pedido.origem !== "site") notFound();
  const primeiroNome = pedido.nome.split(" ")[0];
  const msg = [
    `Oi, Loja Modelo! Fiz o pedido ${pedido.codigo} pelo site.`,
    ...pedido.itens.map((i) => `- ${i.quantidade}x ${i.nome}`),
    `Total: ${reais(pedido.total)}`,
    `Pagamento: ${PAGAMENTO[pedido.pagamento]}`,
    `Recebimento: ${RECEBIMENTO[pedido.recebimento]}`,
  ].join("\n");

  return (
    <div className="mx-auto max-w-[620px] px-4 pt-12 sm:px-6 sm:pt-16">
      {novo && <LimparSacola />}
      <CheckCircle2 className="entra size-12 text-acento" strokeWidth={1.6} />
      <h1 className="entra mt-5 text-[34px] leading-tight font-semibold tracking-[-0.04em] sm:text-[44px]" style={{ "--atraso": "60ms" } as React.CSSProperties}>
        Pedido recebido, {primeiroNome}.
      </h1>
      <p className="entra mt-3 text-[16.5px] leading-relaxed text-suave" style={{ "--atraso": "120ms" } as React.CSSProperties}>
        Mande no WhatsApp para a gente separar tudo e combinar o pagamento. O código do seu pedido é <strong className="font-mono text-texto">{pedido.codigo}</strong>.
      </p>
      {config.whatsapp && (
        <a href={linkWhatsapp(config.whatsapp, msg)} target="_blank" rel="noopener noreferrer" className="btn btn-acento entra mt-7 w-full sm:w-auto" style={{ "--atraso": "180ms" } as React.CSSProperties}>
          <MessageCircle className="size-[18px]" /> Enviar no WhatsApp
        </a>
      )}

      <section className="entra mt-10 rounded-cartao bg-superficie p-5 ring-1 ring-linha sm:p-6" style={{ "--atraso": "240ms" } as React.CSSProperties}>
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-semibold">Resumo</h2>
          <span className="selo">{STATUS_PEDIDO[pedido.status]}</span>
        </div>
        <ul className="mt-4 grid gap-3">
          {pedido.itens.map((i) => (
            <li key={i.id} className="flex items-center gap-3">
              <span className="size-12 shrink-0 overflow-hidden rounded-miudo bg-superficie-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {i.foto && <img src={i.foto} alt="" className="size-full object-cover" />}
              </span>
              <span className="flex-1 text-[14.5px]">{i.quantidade}x {i.nome}</span>
              <span className="num text-[14.5px]">{reais(i.preco * i.quantidade)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-5 grid gap-2 border-t border-linha pt-4 text-[14px]">
          <div className="flex justify-between gap-4"><dt className="text-suave">Pagamento</dt><dd>{PAGAMENTO[pedido.pagamento]}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-suave">Recebimento</dt><dd className="text-right">{RECEBIMENTO[pedido.recebimento]}</dd></div>
          <div className="flex justify-between gap-4 text-[16px] font-semibold"><dt>Total</dt><dd className="num">{reais(pedido.total)}</dd></div>
        </dl>
      </section>
      <Link href="/loja" className="mt-8 inline-block text-[14.5px] font-medium text-acento hover:underline">Continuar olhando a loja</Link>
    </div>
  );
}
