"use client";

import { useId, useState } from "react";

// Duas abas (Novos / Seminovos). As duas listas ja chegam prontas do servidor; aqui so alterna qual aparece.
export function Abas({ abas }: { abas: { id: string; nome: string; descricao: string; conteudo: React.ReactNode }[] }) {
  const [ativa, setAtiva] = useState(abas[0]?.id);
  const base = useId();
  const atual = abas.find((a) => a.id === ativa) ?? abas[0];
  return (
    <div>
      <div role="tablist" aria-label="Novos ou seminovos" className="inline-flex gap-1 rounded-full bg-superficie-2 p-1">
        {abas.map((a) => (
          <button
            key={a.id}
            id={`${base}-${a.id}`}
            role="tab"
            type="button"
            aria-selected={a.id === ativa}
            aria-controls={`${base}-p`}
            onClick={() => setAtiva(a.id)}
            className={`rounded-full px-5 py-2.5 text-[14.5px] font-semibold transition ${a.id === ativa ? "bg-superficie text-texto shadow-suave" : "text-suave hover:text-texto"}`}
          >
            {a.nome}
          </button>
        ))}
      </div>
      <p className="mt-3 max-w-[60ch] text-[14.5px] text-suave">{atual.descricao}</p>
      <div id={`${base}-p`} role="tabpanel" aria-labelledby={`${base}-${atual.id}`} key={atual.id} className="entra mt-6">
        {atual.conteudo}
      </div>
    </div>
  );
}
