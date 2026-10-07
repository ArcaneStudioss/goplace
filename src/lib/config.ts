import "server-only";
import { cache } from "react";
import { banco } from "./db";

// Configuracoes do site que o proprio cliente altera no painel (aba Site).
// Ficam em loja.config como JSON; o que nao foi salvo usa o padrao daqui.

export type Loja = { cidade: string; endereco: string; horario: string; mapa: string };

export type ConfigSite = {
  whatsapp: string; // so digitos, com DDD
  instagram: string; // @usuario
  parcelasMax: number; // "em ate N vezes no cartao"
  crediario: string; // texto curto sobre o crediario
  lojas: Loja[];
  vibraUrl: string;
  videoTopo: string | null; // URL do video do topo (se vazio, usa a foto)
  posterTopo: string | null;
  laudoItens: string[]; // o que a loja confere em todo seminovo
  previa: boolean; // faixa "previa, catalogo de exemplo"
};

export const PADRAO: ConfigSite = {
  whatsapp: "",
  instagram: "goplaceoficial",
  parcelasMax: 18,
  crediario: "Compre no crediário GoPlace, com análise na hora, direto na loja.",
  lojas: [
    { cidade: "Santo Antônio da Patrulha", endereco: "", horario: "", mapa: "" },
    { cidade: "Capão da Canoa", endereco: "", horario: "", mapa: "" },
  ],
  vibraUrl: "",
  videoTopo: null,
  posterTopo: null,
  laudoItens: [
    "Saúde da bateria medida",
    "Face ID e câmeras",
    "Tela, toque e True Tone",
    "Alto-falantes e microfones",
    "Botões e vibração",
    "Wi-Fi, Bluetooth e sinal",
    "Sem bloqueio de conta",
    "IMEI regular",
  ],
  previa: true,
};

export const lerConfig = cache(async (): Promise<ConfigSite> => {
  const db = await banco();
  const linhas = await db.query<{ chave: string; valor: unknown }>("select chave, valor from loja.config");
  const salvo = Object.fromEntries(linhas.map((l) => [l.chave, l.valor]));
  return { ...PADRAO, ...salvo } as ConfigSite;
});

export async function salvarConfig(parcial: Partial<ConfigSite>) {
  const db = await banco();
  await db.tx(async (t) => {
    for (const [chave, valor] of Object.entries(parcial)) {
      if (!(chave in PADRAO)) continue;
      await t.query(
        `insert into loja.config (chave, valor, atualizado_em) values ($1, $2::jsonb, now())
         on conflict (chave) do update set valor = excluded.valor, atualizado_em = now()`,
        [chave, JSON.stringify(valor)],
      );
    }
  });
}
