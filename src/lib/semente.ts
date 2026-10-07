import type { Banco } from "./db";
import type { Laudo } from "./comum";
import { gerarHashSenha } from "./auth";

// Catalogo de EXEMPLO para desenvolvimento e para a previa mostrada ao cliente.
// Fotos sao do Instagram da GoPlace; precos marcados com * vieram dos stories, o resto e exemplo.
// Todos os produtos entram com exemplo = true (o painel mostra o selo "Exemplo").

const DIM: Record<string, [number, number]> = {
  airpods: [1200, 1731], carregadores: [1200, 1433], "drone-neo": [1200, 1695], "iphone-14-leque": [1200, 1536],
  "iphone-15-pro": [1200, 1413], "lark-m2": [1200, 1409], "osmo-mobile": [1200, 1751], scooter: [1200, 1821], "scooter-loja": [1200, 1095],
};

type Semente = {
  slug: string; nome: string; categoria: string; marca: string; condicao: "novo" | "seminovo" | "usado";
  preco: number; parcelas: number; resumo: string; descricao: string; laudo?: Laudo; estoque?: number; destaque?: boolean; fotos: string[]; custo?: number;
};

const PRODUTOS: Semente[] = [
  {
    slug: "iphone-15-pro-128gb-titanio-azul", nome: "iPhone 15 Pro 128 GB", categoria: "iphone", marca: "Apple", condicao: "seminovo",
    preco: 489900, custo: 410000, parcelas: 12, destaque: true, fotos: ["iphone-15-pro"],
    resumo: "Titânio azul, bateria 92%, com laudo completo.",
    descricao: "Aparelho revisado na loja, com todos os itens do laudo conferidos. Disponível também no crediário GoPlace.",
    laudo: { armazenamento: "128 GB", cor: "Titânio azul", bateria: 92, estado: "Marcas mínimas de uso", garantia: "3 meses de garantia GoPlace", acompanha: "Cabo USB-C" },
  },
  {
    slug: "iphone-14-128gb", nome: "iPhone 14 128 GB", categoria: "iphone", marca: "Apple", condicao: "seminovo",
    preco: 299900, custo: 245000, parcelas: 12, destaque: true, estoque: 4, fotos: ["iphone-14-leque"],
    resumo: "Meia-noite, azul, roxo e estelar. Bateria acima de 85%.",
    descricao: "Quatro cores à pronta entrega. Cada aparelho tem o próprio laudo; pergunte pela cor no WhatsApp. Disponível no crediário GoPlace.",
    laudo: { armazenamento: "128 GB", cor: "4 cores", bateria: 87, estado: "Ótimo estado", garantia: "3 meses de garantia GoPlace", acompanha: "Cabo" },
  },
  {
    slug: "scooter-eletrica-magias-modena-x13", nome: "Scooter elétrica Magias Modena X13", categoria: "mobilidade", marca: "Magias", condicao: "novo",
    preco: 989000, custo: 760000, parcelas: 12, destaque: true, estoque: 2, fotos: ["scooter", "scooter-loja"],
    resumo: "R$ 9.890 à vista, 12x sem juros no cartão ou até 24x. Garantia de 1 ano.*",
    descricao: "Pneus largos, banco em couro marrom e farol redondo. Possibilidade de parcelamento em até 24x. Garantia de 1 ano.",
    laudo: { garantia: "1 ano de garantia" },
  },
  {
    slug: "airpods-4", nome: "AirPods 4", categoria: "audio", marca: "Apple", condicao: "novo",
    preco: 189000, custo: 150000, parcelas: 18, destaque: true, estoque: 3, fotos: ["airpods"],
    resumo: "R$ 1.890 em até 18x sem juros.*",
    descricao: "Lacrado, com nota fiscal.",
  },
  {
    slug: "drone-dji-neo", nome: "Drone DJI Neo", categoria: "cameras", marca: "DJI", condicao: "novo",
    preco: 258000, custo: 205000, parcelas: 12, estoque: 2, fotos: ["drone-neo"],
    resumo: "12x de R$ 215.*", descricao: "Drone compacto que decola da palma da mão e segue você gravando em 4K.",
  },
  {
    slug: "gimbal-dji-osmo-mobile-se", nome: "Gimbal DJI Osmo Mobile SE", categoria: "criadores", marca: "DJI", condicao: "novo",
    preco: 114000, custo: 85000, parcelas: 12, estoque: 3, fotos: ["osmo-mobile"],
    resumo: "12x de R$ 95.*", descricao: "Estabilizador de 3 eixos para celular, dobrável.",
  },
  {
    slug: "microfone-hollyland-lark-m2", nome: "Microfone Hollyland Lark M2", categoria: "criadores", marca: "Hollyland", condicao: "novo",
    preco: 139900, custo: 98000, parcelas: 12, estoque: 4, fotos: ["lark-m2"],
    resumo: "O microfone de lapela que a gente usa na loja.*", descricao: "Microfone sem fio de lapela, dois transmissores e receptor para celular ou câmera.",
  },
  {
    slug: "fonte-e-cabo-originais-apple", nome: "Fonte + cabo originais Apple", categoria: "acessorios", marca: "Apple", condicao: "novo",
    preco: 35000, custo: 22000, parcelas: 3, estoque: 12, fotos: ["carregadores"],
    resumo: "Fonte USB-C 20W e cabo, originais.*", descricao: "Carregador original Apple com cabo USB-C.",
  },
];

export async function semear(db: Banco) {
  await db.tx(async (t) => {
    for (const p of PRODUTOS) {
      const [{ id }] = await t.query<{ id: number }>(
        `insert into loja.produtos (slug, nome, categoria, marca, condicao, preco_centavos, custo_centavos, parcelas_sem_juros, resumo, descricao, laudo, estoque, destaque, exemplo)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, true) returning id`,
        [p.slug, p.nome, p.categoria, p.marca, p.condicao, p.preco, p.custo ?? null, p.parcelas, p.resumo.replace("*", ""), p.descricao, JSON.stringify(p.laudo ?? {}), p.estoque ?? 1, !!p.destaque],
      );
      for (const [i, f] of p.fotos.entries()) {
        const [w, h] = DIM[f];
        await t.query("insert into loja.fotos (produto_id, grande, pequena, largura, altura, ordem) values ($1, $2, $3, $4, $5, $6)", [
          id, `/fotos/${f}-1200.webp`, `/fotos/${f}-640.webp`, w, h, i,
        ]);
      }
    }

    // so no banco local: usuario de teste e algumas vendas de exemplo para o painel nao abrir vazio
    if (process.env.NODE_ENV !== "production") {
      await t.query("insert into loja.usuarios (email, nome, senha_hash, papel) values ($1, $2, $3, 'admin') on conflict do nothing", [
        "admin@goplace.local", "Admin (teste)", await gerarHashSenha("goplace-teste-2026"),
      ]);
      const vendas: [string, string, number[], string, number][] = [
        ["Cliente exemplo 1", "51990000001", [3], "pix", 2],
        ["Cliente exemplo 2", "51990000002", [1], "crediario", 5],
        ["Cliente exemplo 3", "51990000003", [8, 8], "cartao", 9],
        ["Cliente exemplo 4", "51990000004", [5], "cartao", 13],
        ["Cliente exemplo 5", "51990000005", [6], "pix", 20],
      ];
      for (const [k, [nome, wpp, itens, pag, diasAtras]] of vendas.entries()) {
        const prods = await t.query<{ id: number; nome: string; categoria: string; preco_centavos: number; custo_centavos: number }>(
          "select id, nome, categoria, preco_centavos, custo_centavos from loja.produtos where id = any($1::int[])", [itens]);
        const total = itens.reduce((s, id) => s + prods.find((x) => x.id === id)!.preco_centavos, 0);
        const [{ id: pid }] = await t.query<{ id: number }>(
          `insert into loja.pedidos (codigo, origem, nome, whatsapp, pagamento, observacao, total_centavos, status, criado_em, pago_em, estoque_baixado)
           values ($1, $2, $3, $4, $5, 'Venda de exemplo', $6, 'entregue', now() - make_interval(days => $7::int), now() - make_interval(days => $7::int), true) returning id`,
          [`GPEXEMP${k}`, k % 2 ? "balcao" : "site", nome, wpp, pag, total, diasAtras],
        );
        for (const id of itens) {
          const pr = prods.find((x) => x.id === id)!;
          await t.query("insert into loja.pedido_itens (pedido_id, produto_id, nome, categoria, preco_centavos, custo_centavos) values ($1, $2, $3, $4, $5, $6)", [
            pid, id, pr.nome, pr.categoria, pr.preco_centavos, pr.custo_centavos,
          ]);
        }
      }
      await t.query(
        `insert into loja.pedidos (codigo, origem, nome, whatsapp, recebimento, pagamento, observacao, total_centavos, status)
         values ('GPEXEMPN', 'site', 'Cliente exemplo 6', '51990000006', 'retirada_capao', 'crediario', 'Pedido de exemplo', 489900, 'novo')`,
      );
      await t.query(
        `insert into loja.pedido_itens (pedido_id, produto_id, nome, categoria, preco_centavos, custo_centavos)
         select id, 1, 'iPhone 15 Pro 128 GB', 'iphone', 489900, 410000 from loja.pedidos where codigo = 'GPEXEMPN'`,
      );
    }
  });
}
