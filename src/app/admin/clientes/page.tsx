import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { exigirEquipe } from "@/lib/auth";
import { formatarTelefone, linkWhatsapp, reais } from "@/lib/comum";
import { clientes } from "@/lib/relatorios";
import { Titulo, Vazio } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Clientes" };

export default async function Clientes() {
  await exigirEquipe();
  const lista = await clientes();
  const data = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return (
    <div className="mx-auto max-w-[900px]">
      <Titulo titulo="Clientes" sub="Quem fez pedido pelo site ou deixou o WhatsApp numa venda de balcão." />
      {lista.length ? (
        <ul className="mt-6 grid gap-2.5">
          {lista.map((c) => (
            <li key={c.whatsapp} className="flex items-center gap-4 rounded-cartao bg-superficie p-4 ring-1 ring-linha">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{c.nome}</p>
                <p className="text-[13px] text-suave">{formatarTelefone(c.whatsapp)} · último pedido {data(c.ultimo)}</p>
              </div>
              <div className="text-right">
                <p className="num text-[15px] font-semibold">{reais(c.total)}</p>
                <p className="text-[12.5px] text-suave">{c.compras} {c.compras === 1 ? "compra" : "compras"} · {c.pedidos} {c.pedidos === 1 ? "pedido" : "pedidos"}</p>
              </div>
              <a href={linkWhatsapp(c.whatsapp, `Oi, ${c.nome.split(" ")[0]}! Aqui é da Loja Modelo.`)} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp de ${c.nome}`} className="grid size-10 shrink-0 place-items-center rounded-full ring-1 ring-linha hover:bg-superficie-2">
                <MessageCircle className="size-[18px]" />
              </a>
            </li>
          ))}
        </ul>
      ) : <div className="mt-6"><Vazio>Os clientes aparecem aqui conforme os pedidos chegam.</Vazio></div>}
    </div>
  );
}
