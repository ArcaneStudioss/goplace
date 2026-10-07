"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import { useSacola, type ItemSacola } from "./Sacola";

export function BotaoSacola({ item, disponivel }: { item: Omit<ItemSacola, "quantidade">; disponivel: boolean }) {
  const { adicionar, itens } = useSacola();
  const [ok, setOk] = useState(false);
  const naSacola = itens.find((i) => i.id === item.id)?.quantidade ?? 0;
  if (!disponivel) {
    return <button type="button" disabled className="btn btn-claro w-full">Reservado para outro cliente</button>;
  }
  const cheio = naSacola >= item.max;
  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={cheio}
        onClick={() => {
          adicionar(item);
          setOk(true);
          setTimeout(() => setOk(false), 1800);
        }}
        className="btn btn-escuro w-full"
      >
        {ok ? <Check className="entra size-[18px]" /> : <ShoppingBag className="size-[18px]" />}
        {ok ? "Na sacola" : cheio ? "Você já pegou todos" : "Colocar na sacola"}
      </button>
      {naSacola > 0 && (
        <Link href="/sacola" className="entra text-center text-[14px] font-medium text-acento hover:underline">
          Ver sacola ({naSacola}) e finalizar
        </Link>
      )}
    </div>
  );
}
