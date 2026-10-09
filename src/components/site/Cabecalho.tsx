"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { CATEGORIAS, linkWhatsapp } from "@/lib/comum";
import { TemaBotao } from "./TemaBotao";
import { useSacola } from "./Sacola";

export function Marca({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="simbolo size-[26px]" aria-hidden />
      <span className="text-[19px] font-semibold tracking-[-0.03em]">Loja Modelo</span>
    </span>
  );
}

function ContadorSacola() {
  const { quantidade } = useSacola();
  return (
    <Link href="/sacola" aria-label={`Sacola, ${quantidade} ${quantidade === 1 ? "item" : "itens"}`} className="relative grid size-10 place-items-center rounded-full transition hover:bg-superficie-2">
      <ShoppingBag className="size-[19px]" strokeWidth={1.8} />
      {quantidade > 0 && (
        <span key={quantidade} className="entra num absolute -top-0.5 -right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-acento px-1 text-[11px] font-bold text-sobre-acento">
          {quantidade}
        </span>
      )}
    </Link>
  );
}

export function Cabecalho({ whatsapp }: { whatsapp: string }) {
  const [aberto, setAberto] = useState(false);
  const dlg = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  return (
    <header className="sticky top-0 z-40 border-b border-linha bg-fundo/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-[60px] max-w-[1240px] items-center justify-between gap-4 px-4 sm:px-6 lg:h-[68px]">
        <Link href="/" aria-label="Loja Modelo, página inicial" className="shrink-0">
          <Marca />
        </Link>
        <nav aria-label="Categorias" className="hidden items-center gap-1 lg:flex">
          {CATEGORIAS.map((c) => (
            <Link key={c.id} href={`/loja?categoria=${c.id}`} className="rounded-full px-3 py-2 text-[14px] text-suave transition hover:bg-superficie-2 hover:text-texto">
              {c.curto}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-0.5">
          <Link href="/loja" aria-label="Buscar produtos" className="hidden size-10 place-items-center rounded-full transition hover:bg-superficie-2 sm:grid">
            <Search className="size-[19px]" strokeWidth={1.8} />
          </Link>
          <TemaBotao />
          <ContadorSacola />
          <button type="button" onClick={() => setAberto(true)} aria-label="Abrir menu" className="grid size-10 place-items-center rounded-full transition hover:bg-superficie-2 lg:hidden">
            <Menu className="size-[20px]" strokeWidth={1.8} />
          </button>
        </div>
      </div>

      <dialog
        ref={dlg}
        onClose={() => setAberto(false)}
        onClick={(e) => (e.target === dlg.current || (e.target as HTMLElement).closest("a")) && setAberto(false)}
        className="m-0 ml-auto h-dvh max-h-dvh w-[min(100vw,420px)] max-w-none bg-fundo p-0 text-texto backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      >
        <div className="flex h-full flex-col px-6 pt-4 pb-8">
          <div className="flex items-center justify-between">
            <Marca />
            <button type="button" onClick={() => setAberto(false)} aria-label="Fechar menu" className="grid size-10 place-items-center rounded-full hover:bg-superficie-2">
              <X className="size-5" />
            </button>
          </div>
          <nav aria-label="Categorias" className="mt-8 flex flex-col">
            <Link href="/loja" className="border-b border-linha py-3.5 text-[26px] font-semibold tracking-[-0.03em]">Tudo</Link>
            {CATEGORIAS.map((c, i) => (
              <Link key={c.id} href={`/loja?categoria=${c.id}`} style={{ "--atraso": `${60 + i * 45}ms` } as React.CSSProperties} className="entra border-b border-linha py-3.5 text-[26px] font-semibold tracking-[-0.03em]">
                {c.nome}
              </Link>
            ))}
          </nav>
          <div className="mt-auto grid gap-3">
            {whatsapp && (
              <a href={linkWhatsapp(whatsapp, "Oi, Loja Modelo! Vim pelo site.")} target="_blank" rel="noopener noreferrer" className="btn btn-escuro w-full">
                Falar no WhatsApp
              </a>
            )}
            <Link href="/#lojas" className="btn btn-claro w-full">Nossas lojas</Link>
          </div>
        </div>
      </dialog>
    </header>
  );
}
