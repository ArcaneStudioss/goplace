"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SELETOR = "[data-revelar]:not(.visto), .item-laudo:not(.visto)";

// Um observador so para a pagina inteira: marca .visto em [data-revelar] e nos itens do laudo quando entram na tela.
// Tambem pega o que aparecer depois (paginas que carregam por partes).
export function Revelador() {
  const caminho = usePathname();
  useEffect(() => {
    if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.querySelectorAll(SELETOR).forEach((a) => a.classList.add("visto"));
      return;
    }
    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) {
            e.target.classList.add("visto");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );
    const observar = () => document.querySelectorAll(SELETOR).forEach((a) => io.observe(a));
    observar();
    const mo = new MutationObserver(observar);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [caminho]);
  return null;
}
