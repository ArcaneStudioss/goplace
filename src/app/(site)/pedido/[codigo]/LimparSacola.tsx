"use client";

import { useEffect } from "react";
import { useSacola } from "@/components/site/Sacola";

// Pedido enviado: esvazia a sacola deste aparelho.
export function LimparSacola() {
  const { limpar } = useSacola();
  useEffect(() => limpar(), [limpar]);
  return null;
}
