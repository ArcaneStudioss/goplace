"use client";

import { Moon, Sun } from "lucide-react";

// Alterna claro/escuro e lembra a escolha. O icone certo e mostrado so pelo CSS (sem piscar na carga).
export function TemaBotao({ className = "" }: { className?: string }) {
  function trocar() {
    const d = document.documentElement;
    const novo = d.getAttribute("data-tema") === "escuro" ? "claro" : "escuro";
    d.classList.add("trocando-tema");
    d.setAttribute("data-tema", novo);
    try {
      localStorage.setItem("gp-tema", novo);
    } catch {}
    setTimeout(() => d.classList.remove("trocando-tema"), 500);
  }
  return (
    <button type="button" onClick={trocar} aria-label="Alternar tema claro ou escuro" title="Claro / escuro" className={`grid size-10 place-items-center rounded-full transition hover:bg-superficie-2 ${className}`}>
      <Sun className="hidden size-[19px] dark:block" strokeWidth={1.8} />
      <Moon className="size-[19px] dark:hidden" strokeWidth={1.8} />
    </button>
  );
}
