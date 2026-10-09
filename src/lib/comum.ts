// Coisas usadas tanto no servidor quanto no navegador (sem banco, sem segredo).

export const CATEGORIAS = [
  { id: "iphone", nome: "iPhones", curto: "iPhone", foto: "iphone-14-leque" },
  { id: "audio", nome: "Áudio", curto: "Áudio", foto: "airpods" },
  { id: "mobilidade", nome: "Mobilidade elétrica", curto: "Mobilidade", foto: "scooter" },
  { id: "cameras", nome: "Câmeras e drones", curto: "Câmeras", foto: "drone-neo" },
  { id: "criadores", nome: "Para criadores", curto: "Criadores", foto: "lark-m2" },
  { id: "acessorios", nome: "Acessórios", curto: "Acessórios", foto: "carregadores" },
] as const;
export type Categoria = (typeof CATEGORIAS)[number]["id"];
export const nomeCategoria = (id: string) => CATEGORIAS.find((c) => c.id === id)?.nome ?? id;
export const ehCategoria = (id: string): id is Categoria => CATEGORIAS.some((c) => c.id === id);

export const CONDICOES = [
  { id: "novo", nome: "Novo" },
  { id: "seminovo", nome: "Seminovo" },
  { id: "usado", nome: "Usado" },
] as const;
export type Condicao = (typeof CONDICOES)[number]["id"];
export const nomeCondicao = (id: string) => CONDICOES.find((c) => c.id === id)?.nome ?? id;

export const STATUS_PRODUTO = {
  disponivel: "Disponível",
  reservado: "Reservado",
  vendido: "Vendido",
  oculto: "Oculto",
} as const;
export type StatusProduto = keyof typeof STATUS_PRODUTO;

export const STATUS_PEDIDO = {
  novo: "Novo",
  confirmado: "Confirmado",
  pago: "Pago",
  entregue: "Entregue",
  cancelado: "Cancelado",
} as const;
export type StatusPedido = keyof typeof STATUS_PEDIDO;

export const RECEBIMENTO = {
  retirada_sap: "Retirar em Cidade Exemplo",
  retirada_capao: "Retirar em Outra Cidade Exemplo",
  entrega: "Entrega (combinar pelo WhatsApp)",
} as const;
export type Recebimento = keyof typeof RECEBIMENTO;

export const PAGAMENTO = {
  pix: "Pix",
  cartao: "Cartão de crédito",
  crediario: "Crediário Loja Modelo",
  dinheiro: "Dinheiro",
  debito: "Cartão de débito",
} as const;
export type Pagamento = keyof typeof PAGAMENTO;
// o cliente escolhe no site so estas; dinheiro/debito aparecem nas vendas de balcao
export const PAGAMENTO_SITE: Pagamento[] = ["pix", "cartao", "crediario"];

// Laudo de seminovo/usado: tudo opcional, o painel preenche o que fizer sentido para o aparelho.
export type Laudo = {
  armazenamento?: string;
  cor?: string;
  bateria?: number | null; // saude da bateria em %
  estado?: string; // "Impecável", "Marcas leves"...
  garantia?: string; // "3 meses de garantia Loja Modelo"
  acompanha?: string;
  verificados?: string[]; // itens conferidos no aparelho
};

export const reais = (centavos: number, casas = false) =>
  (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: casas || centavos % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  });

// Parcela sem juros arredondada para cima no centavo (o total nunca fica abaixo do preco)
export const parcela = (centavos: number, vezes: number) => Math.ceil(centavos / Math.max(1, vezes));

export const soDigitos = (s: string) => s.replace(/\D/g, "");

// "51999998888" -> link do WhatsApp com DDI do Brasil
export function linkWhatsapp(numero: string, texto?: string) {
  let n = soDigitos(numero);
  if (n && !n.startsWith("55")) n = "55" + n;
  return `https://wa.me/${n}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

export function formatarTelefone(t: string) {
  const d = soDigitos(t).replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t;
}

export function slugificar(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// "3.999,90" / "3999.9" / "R$ 3.999" -> centavos. Vazio/invalido -> null
export function lerReais(v: unknown): number | null {
  if (typeof v !== "string") return null;
  let s = v.replace(/[R$\s]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}
