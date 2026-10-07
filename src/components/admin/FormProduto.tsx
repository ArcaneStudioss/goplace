"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { CATEGORIAS, CONDICOES, STATUS_PRODUTO } from "@/lib/comum";
import type { Produto } from "@/lib/produtos";
import { salvarProduto } from "@/app/admin/acoes";
import { Aviso, Campo, Rodape, useFecharJanela } from "./Janela";

type ItemFoto = { chave: string; url: string } & ({ t: "e"; id: number } | { t: "n"; arquivo: File });

const MAX = 12;
const reaisCampo = (c: number | null | undefined) => (c == null ? "" : (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 }));

// Comprime no proprio aparelho antes de enviar: foto de iPhone (4 a 8 MB) vira ~300 KB, o envio fica rapido no 4G.
async function comprimir(f: File): Promise<File> {
  if (!f.type.startsWith("image/") || f.type === "image/gif") return f;
  try {
    const bmp = await createImageBitmap(f, { imageOrientation: "from-image" });
    const escala = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * escala);
    c.height = Math.round(bmp.height * escala);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/webp", 0.86));
    if (!blob || blob.size >= f.size) return f;
    return new File([blob], f.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return f; // HEIC em navegador que nao le: manda como esta e o servidor converte
  }
}

function Fotos({ itens, setItens }: { itens: ItemFoto[]; setItens: (f: (v: ItemFoto[]) => ItemFoto[]) => void }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState(false);
  const [lendo, setLendo] = useState(false);

  async function adicionar(lista: FileList | File[]) {
    const arquivos = Array.from(lista).filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (!arquivos.length) return;
    setLendo(true);
    const novos: ItemFoto[] = [];
    for (const a of arquivos) {
      const c = await comprimir(a);
      novos.push({ t: "n", arquivo: c, url: URL.createObjectURL(c), chave: `n${Date.now()}${Math.random()}` });
    }
    setItens((v) => [...v, ...novos].slice(0, MAX));
    setLendo(false);
  }
  const mover = (de: number, para: number) =>
    setItens((v) => {
      if (para < 0 || para >= v.length) return v;
      const n = [...v];
      const [x] = n.splice(de, 1);
      n.splice(para, 0, x);
      return n;
    });

  return (
    <div className="sm:col-span-2">
      <div className="flex items-baseline justify-between">
        <span className="rotulo">Fotos ({itens.length}/{MAX})</span>
        <span className="text-[12.5px] text-suave">A primeira é a capa. Arraste para reordenar.</span>
      </div>
      <div
        className={`grid grid-cols-3 gap-2 rounded-miudo p-1 transition sm:grid-cols-4 ${sobre ? "bg-acento-suave ring-2 ring-acento" : ""}`}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setSobre(true);
          }
        }}
        onDragLeave={() => setSobre(false)}
        onDrop={(e) => {
          if (e.dataTransfer.files.length) {
            e.preventDefault();
            setSobre(false);
            adicionar(e.dataTransfer.files);
          }
        }}
      >
        {itens.map((f, i) => (
          <div
            key={f.chave}
            draggable
            onDragStart={() => setArrastando(f.chave)}
            onDragEnd={() => setArrastando(null)}
            onDragOver={(e) => {
              if (!arrastando || arrastando === f.chave) return;
              e.preventDefault();
              const de = itens.findIndex((x) => x.chave === arrastando);
              if (de !== -1 && de !== i) mover(de, i);
            }}
            className={`group relative aspect-square cursor-grab overflow-hidden rounded-miudo bg-superficie-2 ring-1 ring-linha active:cursor-grabbing ${arrastando === f.chave ? "opacity-40" : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.url} alt={`Foto ${i + 1}`} className="size-full object-cover" draggable={false} />
            {i === 0 && <span className="selo absolute top-1.5 left-1.5 bg-inverso/85 text-[11px] text-sobre-inverso"><Star className="size-3" /> Capa</span>}
            <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between gap-1">
              <div className="flex gap-1">
                <button type="button" onClick={() => mover(i, i - 1)} disabled={i === 0} aria-label="Mover para a esquerda" className="grid size-7 place-items-center rounded-full bg-superficie/90 shadow disabled:opacity-0"><ArrowLeft className="size-3.5" /></button>
                <button type="button" onClick={() => mover(i, i + 1)} disabled={i === itens.length - 1} aria-label="Mover para a direita" className="grid size-7 place-items-center rounded-full bg-superficie/90 shadow disabled:opacity-0"><ArrowRight className="size-3.5" /></button>
              </div>
              <button type="button" onClick={() => setItens((v) => v.filter((x) => x.chave !== f.chave))} aria-label="Tirar foto" className="grid size-7 place-items-center rounded-full bg-superficie/90 text-[#b42318] shadow"><Trash2 className="size-3.5" /></button>
            </div>
          </div>
        ))}
        {itens.length < MAX && (
          <button type="button" onClick={() => entrada.current?.click()} className="grid aspect-square place-items-center rounded-miudo border-2 border-dashed border-linha text-suave transition hover:border-acento hover:text-acento">
            <span className="grid justify-items-center gap-1 text-[12.5px] font-medium">
              {lendo ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" strokeWidth={1.6} />}
              {lendo ? "Preparando" : "Adicionar"}
            </span>
          </button>
        )}
      </div>
      <input ref={entrada} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={(e) => { if (e.target.files) adicionar(e.target.files); e.target.value = ""; }} />
    </div>
  );
}

export function FormProduto({ p, laudoItens }: { p?: Produto; laudoItens: string[] }) {
  const fechar = useFecharJanela();
  const [pendente, iniciar] = useTransition();
  const [r, setR] = useState<{ ok: boolean; msg?: string; erro?: string } | null>(null);
  const [fotos, setFotos] = useState<ItemFoto[]>(() => (p?.fotos ?? []).map((f) => ({ t: "e" as const, id: f.id, url: f.pequena, chave: `e${f.id}` })));
  const [condicao, setCondicao] = useState<string>(p?.condicao ?? "seminovo");
  const [categoria, setCategoria] = useState<string>(p?.categoria ?? "iphone");
  const l = p?.laudo ?? {};
  const verificados = new Set(l.verificados ?? (p ? [] : laudoItens));

  useEffect(() => () => fotos.forEach((f) => f.t === "n" && URL.revokeObjectURL(f.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const novas = fotos.filter((f) => f.t === "n") as Extract<ItemFoto, { t: "n" }>[];
    novas.forEach((f) => fd.append("novas", f.arquivo));
    fd.set("fotos", JSON.stringify(fotos.map((f) => (f.t === "e" ? { t: "e", id: f.id } : { t: "n", i: novas.indexOf(f as Extract<ItemFoto, { t: "n" }>) }))));
    iniciar(async () => {
      try {
        const res = await salvarProduto(fd);
        setR(res);
        if (res.ok && fechar) setTimeout(fechar, 700);
      } catch {
        setR({ ok: false, erro: "Não foi possível salvar. Confira a internet e tente de novo." });
      }
    });
  }

  const comLaudo = condicao !== "novo" || categoria === "iphone";

  return (
    <form onSubmit={enviar}>
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Fotos itens={fotos} setItens={setFotos} />
        <Campo rotulo="Nome do produto" nome="nome" defaultValue={p?.nome} required maxLength={120} placeholder="iPhone 15 Pro 128 GB" className="sm:col-span-2" />
        <div>
          <label htmlFor="c-categoria" className="rotulo">Categoria</label>
          <select id="c-categoria" name="categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} className="campo">
            {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <Campo rotulo="Marca" nome="marca" defaultValue={p?.marca ?? "Apple"} maxLength={60} />
        <fieldset className="sm:col-span-2">
          <legend className="rotulo">Condição</legend>
          <div className="grid grid-cols-3 gap-2">
            {CONDICOES.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center justify-center rounded-miudo py-2.5 text-[14px] font-medium ring-1 ring-linha has-[:checked]:bg-acento-suave has-[:checked]:text-acento has-[:checked]:ring-acento">
                <input type="radio" name="condicao" value={c.id} checked={condicao === c.id} onChange={() => setCondicao(c.id)} className="sr-only" />
                {c.nome}
              </label>
            ))}
          </div>
        </fieldset>
        <Campo rotulo="Preço à vista (R$)" nome="preco" defaultValue={reaisCampo(p?.preco)} required inputMode="decimal" placeholder="4.899,00" />
        <Campo rotulo="Parcelas sem juros" nome="parcelas" type="number" min={1} max={24} defaultValue={p?.parcelasSemJuros ?? 12} />
        <Campo rotulo="Preço antigo (opcional)" nome="precoAntigo" defaultValue={reaisCampo(p?.precoAntigo)} inputMode="decimal" dica="Aparece riscado ao lado do preço." />
        <Campo rotulo="Custo (só no painel)" nome="custo" defaultValue={reaisCampo(p?.custo)} inputMode="decimal" dica="Usado para calcular o lucro nos relatórios." />
        <Campo rotulo="Estoque" nome="estoque" type="number" min={0} max={9999} defaultValue={p?.estoque ?? 1} />
        <div>
          <label htmlFor="c-status" className="rotulo">Situação</label>
          <select id="c-status" name="status" defaultValue={p?.status ?? "disponivel"} className="campo">
            {Object.entries(STATUS_PRODUTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <Campo rotulo="Resumo (uma linha)" nome="resumo" defaultValue={p?.resumo} maxLength={160} placeholder="Titânio azul, bateria 92%, com laudo." className="sm:col-span-2" />
        <div className="sm:col-span-2">
          <label htmlFor="c-descricao" className="rotulo">Descrição</label>
          <textarea id="c-descricao" name="descricao" defaultValue={p?.descricao} rows={3} maxLength={4000} className="campo resize-y" />
        </div>

        <details open={comLaudo} className="rounded-miudo bg-fundo p-4 ring-1 ring-linha sm:col-span-2">
          <summary className="text-[14.5px] font-semibold">Laudo e ficha técnica</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Armazenamento" nome="armazenamento" defaultValue={l.armazenamento} placeholder="128 GB" maxLength={30} />
            <Campo rotulo="Cor" nome="cor" defaultValue={l.cor} placeholder="Titânio azul" maxLength={40} />
            <Campo rotulo="Saúde da bateria (%)" nome="bateria" type="number" min={1} max={100} defaultValue={l.bateria ?? ""} placeholder="92" />
            <Campo rotulo="Estado" nome="estado" defaultValue={l.estado} placeholder="Marcas mínimas de uso" maxLength={60} />
            <Campo rotulo="Garantia" nome="garantia" defaultValue={l.garantia} placeholder="Em branco = garantia padrão do site" maxLength={80} />
            <Campo rotulo="Acompanha" nome="acompanha" defaultValue={l.acompanha} placeholder="Cabo USB-C" maxLength={120} />
            {condicao !== "novo" && (
              <fieldset className="sm:col-span-2">
                <legend className="rotulo">Itens conferidos neste aparelho</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {laudoItens.map((t) => (
                    <label key={t} className="flex cursor-pointer items-center gap-2.5 text-[14px]">
                      <input type="checkbox" name="verificados" value={t} defaultChecked={verificados.has(t)} /> {t}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
        </details>
        <label className="flex cursor-pointer items-center gap-2.5 text-[14.5px] sm:col-span-2">
          <input type="checkbox" name="destaque" defaultChecked={p?.destaque} /> Mostrar em destaque na página inicial
        </label>
      </div>
      <Rodape>
        <button className="btn btn-escuro btn-pequeno" disabled={pendente}>
          {pendente && <Loader2 className="size-4 animate-spin" />} {p ? "Salvar" : "Publicar produto"}
        </button>
        {fechar && <button type="button" onClick={fechar} className="btn btn-claro btn-pequeno">Cancelar</button>}
        <Aviso r={r} />
      </Rodape>
    </form>
  );
}
