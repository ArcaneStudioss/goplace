"use client";

import { useEffect, useRef } from "react";

// Video de fundo do topo. Sem som, em loop. Quem pediu "menos movimento" no sistema ve so a imagem parada (poster).
export function HeroVideo({ proprio, posterProprio }: { proprio: string | null; posterProprio: string | null }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      v.pause();
      return;
    }
    v.play().catch(() => {}); // modo de economia de dados pode bloquear: fica o poster
  }, []);
  return (
    <video
      ref={ref}
      className="absolute inset-0 size-full object-cover"
      poster={posterProprio ?? "/video/hero-v.jpg"}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden
      tabIndex={-1}
    >
      {proprio ? (
        <source src={proprio} />
      ) : (
        <>
          <source src="/video/hero-h.mp4" type="video/mp4" media="(min-width: 900px)" />
          <source src="/video/hero-v.mp4" type="video/mp4" />
        </>
      )}
    </video>
  );
}
