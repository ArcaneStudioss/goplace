"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BarChart3, ExternalLink, LayoutGrid, LogOut, Menu, Package, Receipt, Settings2, Users, UserCog, X } from "lucide-react";
import { TemaBotao } from "@/components/site/TemaBotao";

const SECOES = [
  { titulo: "Vendas", itens: [
    { href: "/admin", nome: "Visão geral", icone: LayoutGrid },
    { href: "/admin/pedidos", nome: "Pedidos e vendas", icone: Receipt, contador: true },
    { href: "/admin/clientes", nome: "Clientes", icone: Users },
  ] },
  { titulo: "Catálogo", itens: [{ href: "/admin/produtos", nome: "Produtos", icone: Package }] },
  { titulo: "Gestão", itens: [
    { href: "/admin/relatorios", nome: "Relatórios", icone: BarChart3 },
    { href: "/admin/site", nome: "Site", icone: Settings2 },
    { href: "/admin/equipe", nome: "Equipe", icone: UserCog, soAdmin: true },
  ] },
];

function Lista({ novos, admin, sair }: { novos: number; admin: boolean; sair: () => Promise<void> }) {
  const caminho = usePathname();
  return (
    <div className="flex h-full flex-col">
      <nav aria-label="Painel" className="grid gap-6">
        {SECOES.map((s) => (
          <div key={s.titulo}>
            <p className="px-3 text-[11px] font-semibold tracking-[0.12em] text-suave uppercase">{s.titulo}</p>
            <ul className="mt-1.5 grid gap-0.5">
              {s.itens.filter((i) => !("soAdmin" in i) || admin).map((i) => {
                const ativo = i.href === "/admin" ? caminho === "/admin" : caminho.startsWith(i.href);
                const Icone = i.icone;
                return (
                  <li key={i.href}>
                    <Link href={i.href} aria-current={ativo ? "page" : undefined} className={`flex items-center gap-3 rounded-miudo px-3 py-2.5 text-[14.5px] transition ${ativo ? "bg-superficie font-semibold text-texto shadow-suave ring-1 ring-linha" : "text-suave hover:bg-superficie-2 hover:text-texto"}`}>
                      <Icone className="size-[18px]" strokeWidth={1.8} />
                      <span className="flex-1">{i.nome}</span>
                      {"contador" in i && novos > 0 && <span className="num rounded-full bg-acento px-1.5 text-[11.5px] font-bold text-sobre-acento">{novos}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="mt-auto grid gap-1 border-t border-linha pt-4">
        <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-miudo px-3 py-2.5 text-[14px] text-suave hover:bg-superficie-2 hover:text-texto">
          <ExternalLink className="size-[18px]" strokeWidth={1.8} /> Ver o site
        </a>
        <div className="flex items-center justify-between">
          <form action={sair}>
            <button className="flex items-center gap-3 rounded-miudo px-3 py-2.5 text-[14px] text-suave hover:bg-superficie-2 hover:text-texto">
              <LogOut className="size-[18px]" strokeWidth={1.8} /> Sair
            </button>
          </form>
          <TemaBotao />
        </div>
      </div>
    </div>
  );
}

export function NavAdmin({ novos, admin, nome, sair }: { novos: number; admin: boolean; nome: string; sair: () => Promise<void> }) {
  const [aberto, setAberto] = useState(false);
  const dlg = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  const marca = (
    <Link href="/admin" className="flex items-center gap-2">
      <span className="simbolo size-6" aria-hidden />
      <span className="text-[17px] font-semibold tracking-[-0.03em]">GoPlace</span>
    </Link>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-linha px-3 py-5 lg:flex">
        <div className="px-3">{marca}</div>
        <p className="mt-1 truncate px-3 text-[12.5px] text-suave">{nome}</p>
        <div className="mt-7 flex-1"><Lista novos={novos} admin={admin} sair={sair} /></div>
      </aside>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-linha bg-fundo/85 px-4 backdrop-blur-xl lg:hidden">
        {marca}
        <button type="button" onClick={() => setAberto(true)} aria-label="Abrir menu" className="relative grid size-10 place-items-center rounded-full hover:bg-superficie-2">
          <Menu className="size-5" />
          {novos > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-acento" />}
        </button>
      </header>
      <dialog ref={dlg} onClose={() => setAberto(false)} onClick={(e) => (e.target === dlg.current || (e.target as HTMLElement).closest("a")) && setAberto(false)} className="m-0 h-dvh max-h-dvh w-[min(86vw,320px)] bg-fundo p-0 text-texto backdrop:bg-black/40">
        <div className="flex h-full flex-col px-3 py-4">
          <div className="flex items-center justify-between px-3">
            {marca}
            <button type="button" onClick={() => setAberto(false)} aria-label="Fechar menu" className="grid size-9 place-items-center rounded-full hover:bg-superficie-2"><X className="size-5" /></button>
          </div>
          <div className="mt-6 flex-1"><Lista novos={novos} admin={admin} sair={sair} /></div>
        </div>
      </dialog>
    </>
  );
}
