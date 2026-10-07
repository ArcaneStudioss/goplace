"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, MessageCircle, Plus, Store, Trash2 } from "lucide-react";
import { PAGAMENTO, RECEBIMENTO, STATUS_PEDIDO, formatarTelefone, lerReais, linkWhatsapp, reais, type StatusPedido } from "@/lib/comum";
import type { Pedido } from "@/lib/pedidos";
import { acaoStatusPedido, venderNoBalcao } from "@/app/admin/acoes";
import { Aviso, Campo, FormJanela, Janela } from "./Janela";
import { SeloStatus } from "./ui";

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

// proximos passos possiveis a partir de cada situacao
const PASSOS: Record<StatusPedido, { para: StatusPedido; rotulo: string; forte?: boolean }[]> = {
  novo: [{ para: "confirmado", rotulo: "Confirmar e reservar", forte: true }, { para: "pago", rotulo: "Marcar como pago" }, { para: "cancelado", rotulo: "Cancelar" }],
  confirmado: [{ para: "pago", rotulo: "Marcar como pago", forte: true }, { para: "entregue", rotulo: "Pago e entregue" }, { para: "cancelado", rotulo: "Cancelar" }],
  pago: [{ para: "entregue", rotulo: "Marcar como entregue", forte: true }, { para: "cancelado", rotulo: "Cancelar (devolve ao estoque)" }],
  entregue: [{ para: "cancelado", rotulo: "Cancelar venda (devolve ao estoque)" }],
  cancelado: [{ para: "novo", rotulo: "Reabrir pedido" }],
};

function Detalhe({ p }: { p: Pedido }) {
  const [pendente, iniciar] = useTransition();
  const [r, setR] = useState<{ ok: boolean; msg?: string; erro?: string } | null>(null);
  const msg = `Oi, ${p.nome.split(" ")[0]}! Aqui é da GoPlace, sobre o seu pedido ${p.codigo}.`;
  return (
    <div className="pb-5">
      <div className="flex flex-wrap items-center gap-2">
        <SeloStatus status={p.status} texto={STATUS_PEDIDO[p.status]} />
        <span className="selo">{p.origem === "site" ? "Pelo site" : "Balcão"}</span>
        <span className="text-[13px] text-suave">{quando(p.criadoEm)}</span>
      </div>
      <div className="mt-4 grid gap-1 text-[14.5px]">
        <p><strong>{p.nome}</strong></p>
        {p.whatsapp && <p className="text-suave">{formatarTelefone(p.whatsapp)}</p>}
        <p className="text-suave">{PAGAMENTO[p.pagamento]} · {p.origem === "site" ? RECEBIMENTO[p.recebimento] : `vendido por ${p.vendedor ?? "equipe"}`}</p>
        {p.observacao && <p className="mt-1 rounded-miudo bg-fundo px-3 py-2">{p.observacao}</p>}
      </div>
      <ul className="mt-4 grid gap-2 border-y border-linha py-4">
        {p.itens.map((i) => (
          <li key={i.id} className="flex items-center gap-3 text-[14.5px]">
            <span className="size-10 shrink-0 overflow-hidden rounded-[10px] bg-superficie-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {i.foto && <img src={i.foto} alt="" className="size-full object-cover" />}
            </span>
            <span className="flex-1">{i.quantidade}x {i.nome}</span>
            <span className="num">{reais(i.preco * i.quantidade)}</span>
          </li>
        ))}
      </ul>
      {p.desconto > 0 && <p className="num mt-3 flex justify-between text-[14px] text-suave"><span>Desconto</span><span>- {reais(p.desconto)}</span></p>}
      <p className="num mt-2 flex justify-between text-[17px] font-semibold"><span>Total</span><span>{reais(p.total)}</span></p>

      <div className="mt-6 flex flex-wrap gap-2">
        {PASSOS[p.status].map((s) => (
          <button
            key={s.para}
            type="button"
            disabled={pendente}
            onClick={() => iniciar(async () => setR(await acaoStatusPedido(p.id, s.para)))}
            className={`btn btn-pequeno ${s.forte ? "btn-escuro" : s.para === "cancelado" ? "btn-claro !text-[#b42318]" : "btn-claro"}`}
          >
            {pendente && s.forte && <Loader2 className="size-4 animate-spin" />} {s.rotulo}
          </button>
        ))}
        {p.whatsapp && (
          <a href={linkWhatsapp(p.whatsapp, msg)} target="_blank" rel="noopener noreferrer" className="btn btn-claro btn-pequeno">
            <MessageCircle className="size-4" /> WhatsApp do cliente
          </a>
        )}
      </div>
      <div className="mt-3 min-h-6"><Aviso r={r} /></div>
    </div>
  );
}

export function CartaoPedido({ p }: { p: Pedido }) {
  const [aberto, setAberto] = useState(false);
  return (
    <li>
      <button type="button" onClick={() => setAberto(true)} className="flex w-full items-center gap-4 rounded-cartao bg-superficie p-4 text-left ring-1 ring-linha transition hover:ring-texto/25">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[13px] text-suave">{p.codigo}</span>
            <SeloStatus status={p.status} texto={STATUS_PEDIDO[p.status]} />
            {p.origem === "balcao" && <span className="selo text-[11.5px]"><Store className="size-3" /> Balcão</span>}
          </p>
          <p className="mt-1 truncate text-[15px] font-semibold">{p.nome}</p>
          <p className="truncate text-[13px] text-suave">{p.itens.map((i) => `${i.quantidade}x ${i.nome}`).join(", ")}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="num text-[15.5px] font-semibold">{reais(p.total)}</p>
          <p className="text-[12.5px] text-suave">{quando(p.criadoEm)}</p>
        </div>
      </button>
      {aberto && (
        <Janela titulo={`Pedido ${p.codigo}`} fechar={() => setAberto(false)}>
          <Detalhe p={p} />
        </Janela>
      )}
    </li>
  );
}

type Opcao = { id: number; nome: string; preco: number; estoque: number };
type Linha = { chave: string; produtoId: number | null; nome: string; preco: number; quantidade: number };

export function FormBalcao({ produtos }: { produtos: Opcao[] }) {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [busca, setBusca] = useState("");
  const [avulso, setAvulso] = useState({ nome: "", preco: "" });
  const achados = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return b ? produtos.filter((p) => p.nome.toLowerCase().includes(b)).slice(0, 6) : [];
  }, [busca, produtos]);
  const total = linhas.reduce((s, l) => s + l.preco * l.quantidade, 0);

  const adicionar = (p: Opcao) => {
    setLinhas((v) => (v.some((l) => l.produtoId === p.id) ? v : [...v, { chave: `p${p.id}`, produtoId: p.id, nome: p.nome, preco: p.preco, quantidade: 1 }]));
    setBusca("");
  };

  return (
    <FormJanela acao={venderNoBalcao} salvar="Registrar venda" className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="itens" value={JSON.stringify(linhas.map(({ produtoId, nome, preco, quantidade }) => ({ produtoId, nome, preco, quantidade })))} />
      <div className="relative sm:col-span-2">
        <label htmlFor="busca-produto" className="rotulo">Produto do estoque</label>
        <input id="busca-produto" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite para buscar: iPhone 14, AirPods..." autoComplete="off" className="campo" />
        {achados.length > 0 && (
          <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-miudo bg-superficie shadow-suave ring-1 ring-linha" role="listbox">
            {achados.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => adicionar(p)} className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[14.5px] hover:bg-superficie-2">
                  <span>{p.nome}</span>
                  <span className="num text-suave">{reais(p.preco)} · {p.estoque} em estoque</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex items-end gap-2 sm:col-span-2">
        <div className="flex-1">
          <label htmlFor="avulso-nome" className="rotulo">Ou um item avulso</label>
          <input id="avulso-nome" value={avulso.nome} onChange={(e) => setAvulso({ ...avulso, nome: e.target.value })} placeholder="Película, capinha..." className="campo" autoComplete="off" />
        </div>
        <div className="w-28">
          <label htmlFor="avulso-preco" className="sr-only">Preço do item avulso</label>
          <input id="avulso-preco" value={avulso.preco} onChange={(e) => setAvulso({ ...avulso, preco: e.target.value })} placeholder="R$ 0,00" inputMode="decimal" className="campo" autoComplete="off" />
        </div>
        <button
          type="button"
          aria-label="Adicionar item avulso"
          onClick={() => {
            const preco = lerReais(avulso.preco);
            if (!avulso.nome.trim() || preco == null) return;
            setLinhas((v) => [...v, { chave: `a${Date.now()}`, produtoId: null, nome: avulso.nome.trim(), preco, quantidade: 1 }]);
            setAvulso({ nome: "", preco: "" });
          }}
          className="btn btn-claro h-[50px] w-[50px] shrink-0 p-0"
        >
          <Plus className="size-5" />
        </button>
      </div>
      <ul className="grid gap-2 sm:col-span-2">
        {linhas.map((l) => (
          <li key={l.chave} className="flex items-center gap-3 rounded-miudo bg-fundo px-3 py-2 text-[14.5px] ring-1 ring-linha">
            <span className="flex-1">{l.nome}</span>
            <input aria-label={`Quantidade de ${l.nome}`} type="number" min={1} max={99} value={l.quantidade} onChange={(e) => setLinhas((v) => v.map((x) => (x.chave === l.chave ? { ...x, quantidade: Math.max(1, Number(e.target.value) || 1) } : x)))} className="campo h-9 w-16 px-2 py-0 text-center" />
            <span className="num w-24 text-right">{reais(l.preco * l.quantidade)}</span>
            <button type="button" onClick={() => setLinhas((v) => v.filter((x) => x.chave !== l.chave))} aria-label={`Tirar ${l.nome}`} className="grid size-8 place-items-center rounded-full text-suave hover:bg-superficie-2"><Trash2 className="size-4" /></button>
          </li>
        ))}
        {linhas.length > 0 && <li className="num flex justify-between px-3 text-[15px] font-semibold"><span>Subtotal</span><span>{reais(total)}</span></li>}
      </ul>
      <div>
        <label htmlFor="c-pagamento" className="rotulo">Pagamento</label>
        <select id="c-pagamento" name="pagamento" defaultValue="pix" className="campo">
          {Object.entries(PAGAMENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <Campo rotulo="Desconto (R$)" nome="desconto" inputMode="decimal" placeholder="0,00" />
      <Campo rotulo="Nome do cliente" nome="nome" placeholder="Opcional" maxLength={80} />
      <Campo rotulo="WhatsApp do cliente" nome="whatsapp" type="tel" inputMode="tel" placeholder="Opcional" maxLength={20} />
      <Campo rotulo="Observação" nome="observacao" maxLength={500} className="sm:col-span-2" placeholder="IMEI, garantia combinada, aparelho dado na troca..." />
    </FormJanela>
  );
}
