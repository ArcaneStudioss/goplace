import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { ChevronRight, MessageCircle, ShieldCheck, Store } from "lucide-react";
import { linkWhatsapp, nomeCategoria, nomeCondicao } from "@/lib/comum";
import { lerConfig } from "@/lib/config";
import { contarVisita, porSlug, relacionados } from "@/lib/produtos";
import { BotaoSacola } from "@/components/site/BotaoSacola";
import { CartaoProduto, Preco } from "@/components/site/CartaoProduto";
import { Galeria } from "@/components/site/Galeria";
import { LaudoProduto } from "@/components/site/Laudo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/produto/[slug]">): Promise<Metadata> {
  const p = await porSlug((await params).slug);
  if (!p) return { title: "Produto não encontrado" };
  return {
    title: p.nome,
    description: p.resumo || `${p.nome} na GoPlace.`,
    openGraph: { images: p.fotos[0] ? [p.fotos[0].grande] : undefined },
  };
}

export default async function PaginaProduto({ params }: PageProps<"/produto/[slug]">) {
  const { slug } = await params;
  const p = await porSlug(slug);
  if (!p) notFound();
  const [config, outros] = await Promise.all([lerConfig(), relacionados(p)]);
  after(() => contarVisita(p.id).catch(() => {}));

  const vendido = p.status === "vendido";
  const disponivel = p.status === "disponivel" && p.estoque > 0;
  const pergunta = `Oi, GoPlace! Tenho interesse no ${p.nome} (${nomeCondicao(p.condicao)}) que vi no site.`;

  return (
    <div className="mx-auto max-w-[1240px] px-4 pt-5 sm:px-6 sm:pt-8">
      <nav aria-label="Caminho" className="flex items-center gap-1 text-[13px] text-suave">
        <Link href="/loja" className="hover:text-texto">Loja</Link>
        <ChevronRight className="size-3.5" />
        <Link href={`/loja?categoria=${p.categoria}`} className="hover:text-texto">{nomeCategoria(p.categoria)}</Link>
      </nav>

      <div className="mt-4 lg:grid lg:grid-cols-[1.15fr_1fr] lg:items-start lg:gap-14">
        <Galeria fotos={p.fotos} nome={p.nome} />

        <div className="mt-7 lg:sticky lg:top-24 lg:mt-0">
          <p className="entra flex flex-wrap items-center gap-2 text-[13px]">
            <span className="selo">{nomeCondicao(p.condicao)}</span>
            {p.marca && <span className="text-suave">{p.marca}</span>}
            {p.status === "reservado" && <span className="selo">Reservado</span>}
          </p>
          <h1 className="entra mt-3 text-[32px] leading-[1.05] font-semibold tracking-[-0.04em] text-balance sm:text-[44px]" style={{ "--atraso": "60ms" } as React.CSSProperties}>
            {p.nome}
          </h1>
          {p.resumo && <p className="entra mt-3 text-[16.5px] leading-relaxed text-suave" style={{ "--atraso": "100ms" } as React.CSSProperties}>{p.resumo}</p>}

          <div className="entra mt-6" style={{ "--atraso": "140ms" } as React.CSSProperties}>
            {vendido ? <p className="text-[22px] font-semibold">Vendido</p> : <Preco p={p} grande />}
            {!vendido && <p className="mt-1 text-[14px] text-suave">Ou no crediário GoPlace. Até {config.parcelasMax}x no cartão.</p>}
          </div>

          <div className="entra mt-7 grid gap-3" style={{ "--atraso": "180ms" } as React.CSSProperties}>
            {!vendido && (
              <BotaoSacola
                disponivel={disponivel}
                item={{ id: p.id, slug: p.slug, nome: p.nome, preco: p.preco, foto: p.fotos[0]?.pequena ?? null, max: Math.max(1, p.estoque) }}
              />
            )}
            {config.whatsapp && (
              <a href={linkWhatsapp(config.whatsapp, pergunta)} target="_blank" rel="noopener noreferrer" className="btn btn-claro w-full">
                <MessageCircle className="size-[18px]" /> {vendido ? "Perguntar por um parecido" : "Tirar dúvida no WhatsApp"}
              </a>
            )}
          </div>

          <ul className="mt-7 grid gap-3 text-[14px]">
            <li className="flex gap-3"><ShieldCheck className="size-5 shrink-0 text-acento" strokeWidth={1.8} /><span>{p.laudo.garantia || `Garantia GoPlace de ${config.garantia}.`}</span></li>
            <li className="flex gap-3"><Store className="size-5 shrink-0 text-acento" strokeWidth={1.8} /><span>Retire em Santo Antônio da Patrulha ou Capão da Canoa, ou combine a entrega.</span></li>
          </ul>

          <div className="mt-8"><LaudoProduto p={p} itens={config.laudoItens} garantia={config.garantia} /></div>

          {p.descricao && (
            <div className="mt-8">
              <h2 className="text-[17px] font-semibold tracking-[-0.01em]">Sobre o produto</h2>
              <p className="mt-2 text-[15.5px] leading-relaxed whitespace-pre-line text-suave">{p.descricao}</p>
            </div>
          )}
        </div>
      </div>

      {outros.length > 0 && (
        <section aria-labelledby="t-outros" className="mt-24">
          <h2 id="t-outros" className="text-[26px] font-semibold tracking-[-0.035em] sm:text-[32px]" data-revelar>Veja também</h2>
          <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 lg:grid-cols-4">
            {outros.map((o, i) => <CartaoProduto key={o.id} p={o} atraso={i * 60} />)}
          </div>
        </section>
      )}
    </div>
  );
}
