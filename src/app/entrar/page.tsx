import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/auth";
import { FormEntrar } from "./FormEntrar";

export const metadata: Metadata = { title: "Entrar no painel", robots: { index: false, follow: false } };

export default async function Entrar() {
  if (await usuarioAtual()) redirect("/admin");
  return (
    <div className="grid min-h-dvh place-items-center bg-fundo px-4">
      <div className="entra w-full max-w-[380px]">
        <div className="flex items-center gap-2.5">
          <span className="simbolo size-8" aria-hidden />
          <span className="text-[22px] font-semibold tracking-[-0.03em]">GoPlace</span>
          <span className="ml-1 rounded-full bg-superficie-2 px-2.5 py-0.5 text-[12px] font-semibold text-suave">Painel</span>
        </div>
        <h1 className="mt-8 text-[28px] font-semibold tracking-[-0.035em]">Entrar</h1>
        <p className="mt-1 text-[15px] text-suave">Gestão da loja, dos produtos e das vendas.</p>
        <FormEntrar />
      </div>
    </div>
  );
}
