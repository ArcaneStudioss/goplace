"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Foto } from "@/lib/produtos";

// Galeria do produto: no celular desliza com o dedo (encaixe nativo), no PC tem miniaturas e setas.
// O indicador acompanha a foto visivel por IntersectionObserver (sem ouvir o scroll).
export function Galeria({ fotos, nome }: { fotos: Foto[]; nome: string }) {
  const trilho = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(0);

  useEffect(() => {
    const t = trilho.current;
    if (!t) return;
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setAtual(Number((e.target as HTMLElement).dataset.i))),
      { root: t, threshold: 0.6 },
    );
    t.querySelectorAll("[data-i]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [fotos.length]);

  const ir = (i: number) => {
    const t = trilho.current;
    const n = Math.max(0, Math.min(fotos.length - 1, i));
    t?.querySelector<HTMLElement>(`[data-i="${n}"]`)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest", inline: "start" });
  };

  if (!fotos.length) {
    return <div className="grid aspect-[4/5] place-items-center rounded-cartao bg-superficie-2"><span className="simbolo size-14 opacity-25" /></div>;
  }

  return (
    <div className="lg:flex lg:flex-row-reverse lg:gap-4">
      <div className="relative min-w-0 flex-1">
        <div
          ref={trilho}
          className="palco flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-cartao bg-superficie-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-roledescription="carrossel"
          aria-label={`Fotos de ${nome}`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") ir(atual + 1);
            if (e.key === "ArrowLeft") ir(atual - 1);
          }}
        >
          {fotos.map((f, i) => (
            <div key={f.id} data-i={i} className="aspect-[4/5] w-full shrink-0 snap-start" aria-label={`Foto ${i + 1} de ${fotos.length}`} role="group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.grande}
                srcSet={`${f.pequena} 640w, ${f.grande} ${f.largura}w`}
                sizes="(min-width: 1024px) 50vw, 100vw"
                width={f.largura}
                height={f.altura}
                alt={i === 0 ? nome : `${nome}, foto ${i + 1}`}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : undefined}
                className="size-full object-cover"
                draggable={false}
              />
            </div>
          ))}
        </div>
        {fotos.length > 1 && (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden>
              {fotos.map((f, i) => (
                <span key={f.id} className={`h-1.5 rounded-full bg-white shadow transition-all duration-300 ${i === atual ? "w-5 opacity-100" : "w-1.5 opacity-60"}`} />
              ))}
            </div>
            <button type="button" onClick={() => ir(atual - 1)} disabled={atual === 0} aria-label="Foto anterior" className="absolute top-1/2 left-3 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-superficie/85 shadow-suave backdrop-blur transition disabled:opacity-0 lg:grid">
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" onClick={() => ir(atual + 1)} disabled={atual === fotos.length - 1} aria-label="Próxima foto" className="absolute top-1/2 right-3 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-superficie/85 shadow-suave backdrop-blur transition disabled:opacity-0 lg:grid">
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>
      {fotos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto lg:mt-0 lg:w-[76px] lg:flex-col">
          {fotos.map((f, i) => (
            <button key={f.id} type="button" onClick={() => ir(i)} aria-label={`Ver foto ${i + 1}`} aria-current={i === atual} className={`aspect-square w-16 shrink-0 overflow-hidden rounded-miudo bg-superficie-2 ring-2 transition lg:w-full ${i === atual ? "ring-acento" : "ring-transparent opacity-70 hover:opacity-100"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.pequena} alt="" loading="lazy" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
