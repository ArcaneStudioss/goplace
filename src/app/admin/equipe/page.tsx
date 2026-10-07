import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import { banco } from "@/lib/db";
import { salvarUsuario, trocarMinhaSenha } from "../acoes";
import { BotaoJanela, Campo, FormJanela } from "@/components/admin/Janela";
import { Titulo } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Equipe" };

function CamposUsuario({ u }: { u?: { id: number; nome: string; email: string; papel: string; ativo: boolean } }) {
  return (
    <>
      {u && <input type="hidden" name="id" value={u.id} />}
      <Campo rotulo="Nome" nome="nome" defaultValue={u?.nome} required maxLength={80} />
      <Campo rotulo="E-mail" nome="email" type="email" defaultValue={u?.email} required />
      <div>
        <label htmlFor="c-papel" className="rotulo">Acesso</label>
        <select id="c-papel" name="papel" defaultValue={u?.papel ?? "vendedor"} className="campo">
          <option value="vendedor">Vendedor (produtos e pedidos)</option>
          <option value="admin">Administrador (tudo)</option>
        </select>
      </div>
      <Campo rotulo={u ? "Nova senha (opcional)" : "Senha inicial"} nome="senha" type="password" autoComplete="new-password" minLength={10} required={!u} dica="Mínimo de 10 caracteres." />
      {u && (
        <label className="flex cursor-pointer items-center gap-2.5 text-[14.5px] sm:col-span-2">
          <input type="checkbox" name="ativo" defaultChecked={u.ativo} /> Acesso ativo
        </label>
      )}
    </>
  );
}

export default async function Equipe() {
  const eu = await exigirAdmin();
  const db = await banco();
  const usuarios = await db.query<{ id: number; nome: string; email: string; papel: string; ativo: boolean; ultimo: Date | null }>(
    "select id, nome, email, papel, ativo, ultimo_acesso as ultimo from loja.usuarios order by ativo desc, nome",
  );
  return (
    <div className="mx-auto max-w-[800px]">
      <Titulo titulo="Equipe" sub="Quem pode entrar no painel.">
        <BotaoJanela rotulo="Minha senha" titulo="Trocar minha senha">
          <FormJanela acao={trocarMinhaSenha}>
            <Campo rotulo="Senha atual" nome="atual" type="password" autoComplete="current-password" required className="sm:col-span-2" />
            <Campo rotulo="Nova senha" nome="nova" type="password" autoComplete="new-password" minLength={10} required className="sm:col-span-2" dica="Mínimo de 10 caracteres." />
          </FormJanela>
        </BotaoJanela>
        <BotaoJanela rotulo="Nova pessoa" titulo="Dar acesso ao painel" icone="novo" estilo="escuro">
          <FormJanela acao={salvarUsuario} salvar="Criar acesso"><CamposUsuario /></FormJanela>
        </BotaoJanela>
      </Titulo>
      <ul className="mt-6 grid gap-2.5">
        {usuarios.map((u) => (
          <li key={u.id} className={`flex items-center gap-4 rounded-cartao bg-superficie p-4 ring-1 ring-linha ${u.ativo ? "" : "opacity-60"}`}>
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-superficie-2 text-[15px] font-semibold">{u.nome.slice(0, 1).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold">{u.nome} {u.id === eu.id && <span className="text-[13px] font-normal text-suave">(você)</span>}</p>
              <p className="truncate text-[13px] text-suave">{u.email} · {u.papel === "admin" ? "Administrador" : "Vendedor"}{u.ativo ? "" : " · sem acesso"}</p>
            </div>
            <BotaoJanela rotulo="Alterar" titulo={`Alterar ${u.nome}`}>
              <FormJanela acao={salvarUsuario}><CamposUsuario u={u} /></FormJanela>
            </BotaoJanela>
          </li>
        ))}
      </ul>
    </div>
  );
}
