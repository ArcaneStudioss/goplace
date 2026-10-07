"use client";

import { createContext, useContext, useEffect, useRef, useState, useTransition } from "react";
import { Check, Loader2, Pencil, Plus, X } from "lucide-react";

// Regra do painel: tela limpa. Quem precisa preencher algo ve um resumo + um botao;
// o formulario abre numa janela no meio da tela (dialog nativo, com foco preso e Esc para fechar).

const Fechar = createContext<(() => void) | null>(null);
export const useFecharJanela = () => useContext(Fechar);

export function Janela({ titulo, fechar, children, larga = false }: { titulo: string; fechar: () => void; children: React.ReactNode; larga?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`janela ${larga ? "larga" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        fechar();
      }}
      onMouseDown={(e) => e.target === ref.current && fechar()}
      aria-labelledby="titulo-janela"
    >
      <div className="flex max-h-[calc(100dvh-24px)] flex-col overflow-hidden rounded-cartao bg-superficie text-left shadow-suave ring-1 ring-linha">
        <div className="flex items-center justify-between gap-4 border-b border-linha px-5 py-4 sm:px-6">
          <h2 id="titulo-janela" className="text-[17px] font-semibold tracking-[-0.015em]">{titulo}</h2>
          <button type="button" onClick={fechar} aria-label="Fechar" className="grid size-9 place-items-center rounded-full text-suave hover:bg-superficie-2 hover:text-texto">
            <X className="size-[18px]" />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pt-5 sm:px-6">
          <Fechar.Provider value={fechar}>{children}</Fechar.Provider>
        </div>
      </div>
    </dialog>
  );
}

const ESTILOS = {
  escuro: "btn btn-escuro btn-pequeno",
  claro: "btn btn-claro btn-pequeno",
  texto: "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13.5px] font-medium text-acento hover:bg-acento-suave",
} as const;

export function BotaoJanela({
  rotulo, titulo, children, icone = "editar", estilo = "claro", larga = false, className = "",
}: {
  rotulo: React.ReactNode; titulo?: string; children: React.ReactNode; icone?: "editar" | "novo" | "nenhum"; estilo?: keyof typeof ESTILOS; larga?: boolean; className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const Icone = icone === "editar" ? Pencil : icone === "novo" ? Plus : null;
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className={`${ESTILOS[estilo]} ${className}`}>
        {Icone && <Icone className="size-4" />} {rotulo}
      </button>
      {aberto && (
        <Janela titulo={titulo ?? String(rotulo)} fechar={() => setAberto(false)} larga={larga}>
          {children}
        </Janela>
      )}
    </>
  );
}

export type Resposta = { ok: boolean; msg?: string; erro?: string } | void;

export function Rodape({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-5 mt-6 flex flex-wrap items-center gap-3 border-t border-linha bg-superficie px-5 py-3.5 sm:-mx-6 sm:px-6">
      {children}
    </div>
  );
}

export function Aviso({ r }: { r: { ok: boolean; msg?: string; erro?: string } | null }) {
  if (!r) return null;
  return r.ok ? (
    <span role="status" className="entra inline-flex items-center gap-1.5 text-[14px] font-medium text-acento"><Check className="size-4" /> {r.msg ?? "Salvo"}</span>
  ) : (
    <span role="alert" className="entra text-[14px] font-medium text-[#c2410c] dark:text-[#fb923c]">{r.erro}</span>
  );
}

// Formulario de janela: chama a acao do servidor, mostra o resultado e fecha sozinho quando deu certo.
export function FormJanela({
  acao, children, salvar = "Salvar", className = "grid gap-4 sm:grid-cols-2", extra, perigo = false,
}: {
  acao: (fd: FormData) => Promise<Resposta>; children: React.ReactNode; salvar?: string; className?: string; extra?: React.ReactNode; perigo?: boolean;
}) {
  const fechar = useFecharJanela();
  const [pendente, iniciar] = useTransition();
  const [r, setR] = useState<{ ok: boolean; msg?: string; erro?: string } | null>(null);
  return (
    // onSubmit (e nao action=): com action o React limpa os campos depois de enviar, e um erro faria a pessoa digitar tudo de novo
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        iniciar(async () => {
          try {
            const res = (await acao(fd)) ?? { ok: true };
            setR(res);
            if (res.ok && fechar) setTimeout(fechar, 650);
          } catch {
            setR({ ok: false, erro: "Não foi possível salvar. Tente de novo." });
          }
        });
      }}
    >
      <div className={className}>{children}</div>
      <Rodape>
        <button className={`btn btn-pequeno ${perigo ? "bg-[#b42318] text-white" : "btn-escuro"}`} disabled={pendente}>
          {pendente && <Loader2 className="size-4 animate-spin" />} {salvar}
        </button>
        {fechar && <button type="button" onClick={fechar} className="btn btn-claro btn-pequeno">Cancelar</button>}
        {extra}
        <Aviso r={r} />
      </Rodape>
    </form>
  );
}

// Cartao com estado + botao que abre o formulario
export function CartaoConfig({
  titulo, resumo, children, botao = "Alterar", larga = false, icone,
}: {
  titulo: string; resumo: React.ReactNode; children: React.ReactNode; botao?: string; larga?: boolean; icone?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-cartao bg-superficie p-5 ring-1 ring-linha sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {icone && <span className="grid size-10 shrink-0 place-items-center rounded-miudo bg-acento-suave text-acento">{icone}</span>}
          <h2 className="text-[16.5px] font-semibold tracking-[-0.015em]">{titulo}</h2>
        </div>
        <BotaoJanela rotulo={botao} titulo={titulo} larga={larga}>{children}</BotaoJanela>
      </div>
      <div className="text-[14px] leading-relaxed text-suave">{resumo}</div>
    </section>
  );
}

export function Campo({ rotulo, nome, className = "", dica, ...props }: { rotulo: string; nome: string; dica?: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <label htmlFor={`c-${nome}`} className="rotulo">{rotulo}</label>
      <input id={`c-${nome}`} name={nome} className="campo" autoComplete="off" {...props} />
      {dica && <p className="mt-1 text-[12.5px] text-suave">{dica}</p>}
    </div>
  );
}

export function Dados({ itens }: { itens: [string, React.ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {itens.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-[12px] font-medium text-suave">{k}</dt>
          <dd className="truncate text-[14.5px] text-texto">{v || <span className="text-suave">não informado</span>}</dd>
        </div>
      ))}
    </dl>
  );
}
