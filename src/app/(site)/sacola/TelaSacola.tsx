"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, Loader2, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { PAGAMENTO, PAGAMENTO_SITE, RECEBIMENTO, reais } from "@/lib/comum";
import { useSacola } from "@/components/site/Sacola";
import { enviarPedido, type EstadoPedido } from "../acoes";

function Erro({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1.5 text-[13px] text-[#c2410c] dark:text-[#fb923c]">{msg}</p> : null;
}

export function TelaSacola({ parcelasMax }: { parcelasMax: number }) {
  const { itens, total, alterar, remover } = useSacola();
  const [estado, acao, enviando] = useActionState<EstadoPedido, FormData>(enviarPedido, null);
  const c = estado?.campos ?? {};

  if (!itens.length) {
    return (
      <div className="mx-auto max-w-[640px] px-4 pt-20 text-center sm:px-6">
        <ShoppingBag className="entra mx-auto size-10 text-suave" strokeWidth={1.5} />
        <h1 className="entra mt-5 text-[32px] font-semibold tracking-[-0.04em]">Sua sacola está vazia.</h1>
        <p className="entra mt-2 text-[16px] text-suave">Escolha um aparelho e ele aparece aqui.</p>
        <Link href="/loja" className="btn btn-escuro entra mt-8">Ir para a loja <ArrowRight className="size-4" /></Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 pt-8 sm:px-6 sm:pt-12">
      <h1 className="entra text-[36px] font-semibold tracking-[-0.04em] sm:text-[48px]">Sacola</h1>
      <div className="mt-8 lg:grid lg:grid-cols-[1.1fr_1fr] lg:items-start lg:gap-12">
        <ul className="grid gap-3">
          {itens.map((i) => (
            <li key={i.id} className="flex gap-4 rounded-cartao bg-superficie p-3 ring-1 ring-linha">
              <Link href={`/produto/${i.slug}`} className="size-24 shrink-0 overflow-hidden rounded-miudo bg-superficie-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {i.foto && <img src={i.foto} alt="" className="size-full object-cover" />}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <Link href={`/produto/${i.slug}`} className="text-[15.5px] leading-snug font-semibold hover:underline">{i.nome}</Link>
                <p className="num mt-1 text-[15px]">{reais(i.preco * i.quantidade)}</p>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <div className="flex items-center rounded-full ring-1 ring-linha">
                    <button type="button" onClick={() => alterar(i.id, i.quantidade - 1)} aria-label="Diminuir" className="grid size-9 place-items-center rounded-full hover:bg-superficie-2"><Minus className="size-4" /></button>
                    <span className="num w-7 text-center text-[14px] font-semibold" aria-live="polite">{i.quantidade}</span>
                    <button type="button" onClick={() => alterar(i.id, i.quantidade + 1)} disabled={i.quantidade >= i.max} aria-label="Aumentar" className="grid size-9 place-items-center rounded-full hover:bg-superficie-2 disabled:opacity-30"><Plus className="size-4" /></button>
                  </div>
                  <button type="button" onClick={() => remover(i.id)} aria-label={`Tirar ${i.nome} da sacola`} className="grid size-9 place-items-center rounded-full text-suave hover:bg-superficie-2 hover:text-texto"><Trash2 className="size-4" /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <form action={acao} className="mt-8 rounded-cartao bg-superficie p-5 ring-1 ring-linha sm:p-6 lg:sticky lg:top-24 lg:mt-0" noValidate>
          <input type="hidden" name="itens" value={JSON.stringify(itens.map((i) => ({ id: i.id, quantidade: i.quantidade })))} />
          <div className="flex items-baseline justify-between">
            <span className="text-[15px] text-suave">Total</span>
            <span className="num text-[28px] font-semibold tracking-[-0.03em]">{reais(total)}</span>
          </div>
          <p className="mt-1 text-right text-[13px] text-suave">Pix, cartão em até {parcelasMax}x ou crediário Loja Modelo</p>

          <div className="mt-6 grid gap-4">
            <div>
              <label htmlFor="nome" className="rotulo">Seu nome</label>
              <input id="nome" name="nome" autoComplete="name" required className="campo" aria-invalid={!!c.nome} />
              <Erro msg={c.nome} />
            </div>
            <div>
              <label htmlFor="whatsapp" className="rotulo">WhatsApp com DDD</label>
              <input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(51) 99999-9999" required className="campo" aria-invalid={!!c.whatsapp} />
              <Erro msg={c.whatsapp} />
            </div>
            <fieldset>
              <legend className="rotulo">Como prefere receber</legend>
              <div className="grid gap-2">
                {Object.entries(RECEBIMENTO).map(([k, v], n) => (
                  <label key={k} className="flex cursor-pointer items-center gap-3 rounded-miudo px-3.5 py-3 ring-1 ring-linha transition has-[:checked]:bg-acento-suave has-[:checked]:ring-acento">
                    <input type="radio" name="recebimento" value={k} defaultChecked={n === 0} />
                    <span className="text-[14.5px]">{v}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="rotulo">Como pretende pagar</legend>
              <div className="grid grid-cols-3 gap-2">
                {PAGAMENTO_SITE.map((k, n) => (
                  <label key={k} className="flex cursor-pointer items-center justify-center rounded-miudo px-2 py-3 text-center text-[13.5px] font-medium ring-1 ring-linha transition has-[:checked]:bg-acento-suave has-[:checked]:text-acento has-[:checked]:ring-acento">
                    <input type="radio" name="pagamento" value={k} defaultChecked={n === 0} className="sr-only" />
                    {PAGAMENTO[k].replace("Cartão de crédito", "Cartão").replace(" Loja Modelo", "")}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor="observacao" className="rotulo">Observação (opcional)</label>
              <textarea id="observacao" name="observacao" rows={2} maxLength={500} className="campo resize-none" placeholder="Cor preferida, melhor horário..." />
            </div>
          </div>

          {estado?.erro && <p role="alert" className="mt-4 rounded-miudo bg-[#c2410c]/10 px-4 py-3 text-[14px] text-[#9a3412] dark:text-[#fdba74]">{estado.erro}</p>}

          <button className="btn btn-escuro mt-6 w-full" disabled={enviando}>
            {enviando ? <Loader2 className="size-[18px] animate-spin" /> : null}
            {enviando ? "Enviando..." : "Enviar pedido"}
          </button>
          <p className="mt-3 text-center text-[12.5px] leading-relaxed text-suave">
            Nada é cobrado agora. A gente confirma a disponibilidade e combina o pagamento pelo WhatsApp.
          </p>
        </form>
      </div>
    </div>
  );
}
