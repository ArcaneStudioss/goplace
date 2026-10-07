"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { STATUS_PRODUTO } from "@/lib/comum";
import type { Produto } from "@/lib/produtos";
import { apagarProduto, mudarStatusProduto } from "@/app/admin/acoes";
import { BotaoJanela, FormJanela } from "./Janela";
import { FormProduto } from "./FormProduto";

export function NovoProduto({ laudoItens }: { laudoItens: string[] }) {
  return (
    <BotaoJanela rotulo="Novo produto" icone="novo" estilo="escuro" larga>
      <FormProduto laudoItens={laudoItens} />
    </BotaoJanela>
  );
}

export function AcoesProduto({ p, laudoItens, admin }: { p: Produto; laudoItens: string[]; admin: boolean }) {
  const [pendente, iniciar] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <label htmlFor={`st-${p.id}`} className="sr-only">Situação de {p.nome}</label>
        <select
          id={`st-${p.id}`}
          defaultValue={p.status}
          disabled={pendente}
          onChange={(e) => {
            const v = e.target.value;
            iniciar(async () => {
              await mudarStatusProduto(p.id, v);
            });
          }}
          className="campo h-[38px] w-[150px] rounded-full py-0 text-[14px]"
        >
          {Object.entries(STATUS_PRODUTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {pendente && <Loader2 className="absolute top-1/2 right-9 size-4 -translate-y-1/2 animate-spin text-suave" />}
      </div>
      <BotaoJanela rotulo="Editar" titulo={`Editar: ${p.nome}`} larga>
        <FormProduto p={p} laudoItens={laudoItens} />
      </BotaoJanela>
      {admin && (
        <BotaoJanela rotulo={<Trash2 className="size-4" aria-label="Apagar" />} titulo="Apagar produto" icone="nenhum" estilo="texto" className="!text-[#b42318]">
          <FormJanela acao={apagarProduto} salvar="Apagar de vez" perigo className="grid gap-2">
            <input type="hidden" name="id" value={p.id} />
            <p className="text-[15px]">Apagar <strong>{p.nome}</strong> e todas as fotos? Vendas antigas continuam nos relatórios.</p>
            <p className="text-[14px] text-suave">Se só vendeu, prefira mudar a situação para Vendido: o histórico fica mais completo.</p>
          </FormJanela>
        </BotaoJanela>
      )}
    </div>
  );
}
