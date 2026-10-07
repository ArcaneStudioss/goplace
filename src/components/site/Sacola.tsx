"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

// Sacola guardada no proprio aparelho (localStorage). O preco aqui e so para mostrar:
// na hora de enviar o pedido o servidor confere tudo de novo.

export type ItemSacola = { id: number; slug: string; nome: string; preco: number; foto: string | null; quantidade: number; max: number };

const CHAVE = "gp-sacola";
const ouvintes = new Set<() => void>();
let cache: { bruto: string | null; itens: ItemSacola[] } = { bruto: null, itens: [] };
const VAZIA: ItemSacola[] = [];

function ler(): ItemSacola[] {
  let bruto: string | null = null;
  try {
    bruto = localStorage.getItem(CHAVE);
  } catch {}
  if (bruto === cache.bruto) return cache.itens;
  let itens: ItemSacola[] = [];
  try {
    const v = bruto ? JSON.parse(bruto) : [];
    if (Array.isArray(v)) itens = v.filter((i) => i && Number.isInteger(i.id) && i.quantidade > 0).slice(0, 30);
  } catch {}
  cache = { bruto, itens };
  return itens;
}

function gravar(itens: ItemSacola[]) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(itens));
  } catch {}
  ouvintes.forEach((f) => f());
}

function assinar(f: () => void) {
  ouvintes.add(f);
  const outraAba = (e: StorageEvent) => e.key === CHAVE && f();
  window.addEventListener("storage", outraAba);
  return () => {
    ouvintes.delete(f);
    window.removeEventListener("storage", outraAba);
  };
}

type Ctx = {
  itens: ItemSacola[];
  quantidade: number;
  total: number;
  adicionar: (i: Omit<ItemSacola, "quantidade">, q?: number) => void;
  alterar: (id: number, q: number) => void;
  remover: (id: number) => void;
  limpar: () => void;
};
const Contexto = createContext<Ctx | null>(null);

export function SacolaProvider({ children }: { children: React.ReactNode }) {
  const itens = useSyncExternalStore(assinar, ler, () => VAZIA);
  const adicionar = useCallback<Ctx["adicionar"]>((i, q = 1) => {
    const atual = ler();
    const ja = atual.find((x) => x.id === i.id);
    gravar(ja ? atual.map((x) => (x.id === i.id ? { ...x, ...i, quantidade: Math.min(i.max, x.quantidade + q) } : x)) : [...atual, { ...i, quantidade: Math.min(i.max, q) }]);
  }, []);
  const alterar = useCallback((id: number, q: number) => {
    gravar(ler().flatMap((x) => (x.id !== id ? [x] : q <= 0 ? [] : [{ ...x, quantidade: Math.min(x.max, q) }])));
  }, []);
  const remover = useCallback((id: number) => gravar(ler().filter((x) => x.id !== id)), []);
  const limpar = useCallback(() => gravar([]), []);
  const valor = useMemo<Ctx>(
    () => ({
      itens,
      quantidade: itens.reduce((s, i) => s + i.quantidade, 0),
      total: itens.reduce((s, i) => s + i.preco * i.quantidade, 0),
      adicionar,
      alterar,
      remover,
      limpar,
    }),
    [itens, adicionar, alterar, remover, limpar],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSacola() {
  const c = useContext(Contexto);
  if (!c) throw new Error("useSacola fora do SacolaProvider");
  return c;
}
