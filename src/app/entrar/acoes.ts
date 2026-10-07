"use server";

import { redirect } from "next/navigation";
import { entrar } from "@/lib/auth";
import { ipHashAtual } from "@/lib/ip";
import { excedeuIp } from "@/lib/limite";

export async function acaoEntrar(_: { erro?: string; email?: string } | null, fd: FormData): Promise<{ erro?: string; email?: string } | null> {
  const email = String(fd.get("email") ?? "").slice(0, 200);
  if (await excedeuIp("entrar", 20, 15 * 60_000)) return { erro: "Muitas tentativas. Espere alguns minutos.", email };
  const senha = String(fd.get("senha") ?? "").slice(0, 200);
  if (!email || !senha) return { erro: "Preencha e-mail e senha.", email };
  const r = await entrar(email, senha, await ipHashAtual());
  if (!r.ok) return { erro: r.erro, email };
  redirect("/admin");
}
