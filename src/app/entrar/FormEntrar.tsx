"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { acaoEntrar } from "./acoes";

export function FormEntrar() {
  const [estado, acao, enviando] = useActionState(acaoEntrar, null);
  const [ver, setVer] = useState(false);
  return (
    <form action={acao} className="mt-7 grid gap-4">
      <div>
        <label htmlFor="email" className="rotulo">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="username" required autoFocus={!estado?.email} defaultValue={estado?.email} key={estado?.email} className="campo" />
      </div>
      <div>
        <label htmlFor="senha" className="rotulo">Senha</label>
        <div className="relative">
          <input id="senha" name="senha" type={ver ? "text" : "password"} autoComplete="current-password" required autoFocus={!!estado?.email} className="campo pr-12" />
          <button type="button" onClick={() => setVer(!ver)} aria-label={ver ? "Esconder senha" : "Mostrar senha"} className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-suave hover:bg-superficie-2">
            {ver ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      {estado?.erro && <p role="alert" className="rounded-miudo bg-[#c2410c]/10 px-4 py-3 text-[14px] text-[#9a3412] dark:text-[#fdba74]">{estado.erro}</p>}
      <button className="btn btn-escuro mt-1 w-full" disabled={enviando}>
        {enviando && <Loader2 className="size-4 animate-spin" />} Entrar
      </button>
    </form>
  );
}
