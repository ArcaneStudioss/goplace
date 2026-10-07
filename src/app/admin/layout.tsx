import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { exigirEquipe, sair } from "@/lib/auth";
import { contarPorStatus } from "@/lib/pedidos";
import { NavAdmin } from "@/components/admin/Nav";

export const metadata: Metadata = { title: { default: "Painel", template: "%s · Painel GoPlace" }, robots: { index: false, follow: false } };

async function acaoSair() {
  "use server";
  await sair();
  redirect("/entrar");
}

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const u = await exigirEquipe();
  const status = await contarPorStatus();
  return (
    <div className="min-h-dvh bg-fundo lg:flex">
      <NavAdmin novos={status.novo ?? 0} admin={u.papel === "admin"} nome={u.nome} sair={acaoSair} />
      <main className="min-w-0 flex-1 px-4 pt-6 pb-20 sm:px-6 lg:px-10 lg:pt-9">{children}</main>
    </div>
  );
}
