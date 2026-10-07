import Link from "next/link";

export function Titulo({ titulo, sub, children }: { titulo: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.035em] sm:text-[32px]">{titulo}</h1>
        {sub && <p className="mt-1 text-[14.5px] text-suave">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Abas({ itens, ativo }: { itens: { id: string; nome: string; href: string; n?: number }[]; ativo: string }) {
  return (
    <div className="trilho -mx-4 px-4 sm:mx-0 sm:px-0" role="tablist">
      {itens.map((a) => (
        <Link key={a.id} href={a.href} role="tab" aria-selected={a.id === ativo} className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13.5px] font-medium transition ${a.id === ativo ? "bg-inverso text-sobre-inverso" : "bg-superficie text-suave ring-1 ring-linha hover:text-texto"}`}>
          {a.nome}
          {a.n ? <span className={`num rounded-full px-1.5 text-[11.5px] ${a.id === ativo ? "bg-sobre-inverso/20" : "bg-superficie-2"}`}>{a.n}</span> : null}
        </Link>
      ))}
    </div>
  );
}

export function Painel({ titulo, children, extra, className = "" }: { titulo?: string; children: React.ReactNode; extra?: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-cartao bg-superficie p-5 ring-1 ring-linha ${className}`}>
      {(titulo || extra) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {titulo && <h2 className="text-[15.5px] font-semibold tracking-[-0.01em]">{titulo}</h2>}
          {extra}
        </div>
      )}
      {children}
    </section>
  );
}

export function Numero({ rotulo, valor, detalhe, destaque = false }: { rotulo: string; valor: React.ReactNode; detalhe?: React.ReactNode; destaque?: boolean }) {
  return (
    <div className={`rounded-cartao p-5 ring-1 ${destaque ? "bg-inverso text-sobre-inverso ring-transparent" : "bg-superficie ring-linha"}`}>
      <p className={`text-[13px] ${destaque ? "opacity-70" : "text-suave"}`}>{rotulo}</p>
      <p className="num mt-1.5 text-[26px] font-semibold tracking-[-0.03em]">{valor}</p>
      {detalhe && <p className={`mt-1 text-[12.5px] ${destaque ? "opacity-70" : "text-suave"}`}>{detalhe}</p>}
    </div>
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return <div className="rounded-cartao border border-dashed border-linha px-6 py-12 text-center text-[14.5px] text-suave">{children}</div>;
}

const CORES_STATUS: Record<string, string> = {
  disponivel: "selo-acento",
  novo: "selo-acento",
  reservado: "bg-[#b45309]/12 text-[#92400e] dark:text-[#fbbf24]",
  confirmado: "bg-[#b45309]/12 text-[#92400e] dark:text-[#fbbf24]",
  pago: "bg-inverso text-sobre-inverso",
  entregue: "bg-superficie-2 text-texto",
  vendido: "bg-superficie-2 text-suave",
  oculto: "bg-superficie-2 text-suave",
  cancelado: "bg-[#b42318]/10 text-[#b42318] dark:text-[#fda29b]",
};
export function SeloStatus({ status, texto }: { status: string; texto: string }) {
  return <span className={`selo ${CORES_STATUS[status] ?? ""}`}>{texto}</span>;
}
