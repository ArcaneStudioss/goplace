import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, MapPin, Scissors } from "lucide-react";
import { CATEGORIAS, linkWhatsapp } from "@/lib/comum";
import { lerConfig } from "@/lib/config";
import { contagemPorCategoria, destaques } from "@/lib/produtos";
import { CartaoProduto } from "@/components/site/CartaoProduto";
import { Abas } from "@/components/site/Abas";
import type { Produto } from "@/lib/produtos";
import { HeroVideo } from "@/components/site/HeroVideo";

export const dynamic = "force-dynamic";

const atraso = (ms: number) => ({ "--atraso": `${ms}ms` }) as React.CSSProperties;

function FotoFixa({ nome, alt, sizes, className = "", prioridade = false }: { nome: string; alt: string; sizes: string; className?: string; prioridade?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/fotos/${nome}-640.webp`}
      srcSet={`/fotos/${nome}-640.webp 640w, /fotos/${nome}-1200.webp 1200w`}
      sizes={sizes}
      alt={alt}
      loading={prioridade ? "eager" : "lazy"}
      fetchPriority={prioridade ? "high" : undefined}
      decoding="async"
      className={`size-full object-cover ${className}`}
    />
  );
}

function GradeProdutos({ lista, vazio }: { lista: Produto[]; vazio: string }) {
  if (!lista.length) return <p className="rounded-cartao bg-superficie px-6 py-10 text-center text-[15px] text-suave ring-1 ring-linha">{vazio}</p>;
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 lg:grid-cols-4">
      {lista.map((p, i) => (
        <CartaoProduto key={p.id} p={p} atraso={(i % 4) * 70} />
      ))}
    </div>
  );
}

export default async function Inicio() {
  const [config, novos, seminovos, contagem] = await Promise.all([lerConfig(), destaques(8, "novo"), destaques(8, "seminovo"), contagemPorCategoria()]);
  const wpp = (t: string) => (config.whatsapp ? linkWhatsapp(config.whatsapp, t) : "/loja");

  return (
    <>
      {/* 1. Topo em tela cheia: video de fundo (feito das fotos da loja ou o que o cliente enviar no painel),
          a promessa da marca na frente e o laudo se preenchendo */}
      <section className="relative isolate -mt-px flex min-h-[calc(100dvh-96px)] items-end overflow-hidden bg-[#0b0c0d] text-white">
        <HeroVideo proprio={config.videoTopo} posterProprio={config.posterTopo} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/40 lg:bg-gradient-to-r lg:from-black/85 lg:via-black/45 lg:to-black/10" aria-hidden />
        <div className="relative mx-auto flex w-full max-w-[1240px] flex-col px-4 pt-24 pb-14 sm:px-6 lg:pb-20">
          <div>
            <h1 className="entra max-w-[12ch] text-[44px] leading-[1.0] font-semibold tracking-[-0.045em] text-balance sm:text-[64px] lg:text-[84px]">
              Você sabe exatamente o que está levando.
            </h1>
            <p className="entra mt-5 max-w-[34ch] text-[17px] leading-relaxed text-white/80 sm:text-[19px]" style={atraso(120)}>
              iPhones novos e seminovos, com garantia de {config.garantia} e até {config.parcelasMax}x no cartão.
            </p>
            <div className="entra mt-7 flex flex-wrap gap-3" style={atraso(220)}>
              <Link href="/loja?categoria=iphone" className="btn bg-white text-[#0b0c0d]">
                Ver iPhones <ArrowRight className="size-4" />
              </Link>
              <a href={wpp("Oi, Loja Modelo! Vim pelo site e queria tirar uma dúvida.")} target={config.whatsapp ? "_blank" : undefined} rel="noopener noreferrer" className="btn bg-white/12 text-white ring-1 ring-white/30 backdrop-blur-md">
                Falar no WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Categorias: trilho no celular, grade no PC */}
      <section aria-labelledby="t-categorias" className="mt-20 lg:mt-24">
        <div className="mx-auto flex max-w-[1240px] items-end justify-between gap-4 px-4 sm:px-6">
          <h2 id="t-categorias" className="text-[28px] leading-tight font-semibold tracking-[-0.035em] sm:text-[36px]" data-revelar>
            Do iPhone ao drone.
          </h2>
          <Link href="/loja" className="hidden shrink-0 items-center gap-1 text-[15px] font-medium text-acento hover:underline sm:inline-flex">
            Ver tudo <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="trilho mt-6 lg:mx-auto lg:grid lg:max-w-[1240px] lg:grid-cols-6 lg:gap-4 lg:overflow-visible lg:px-6">
          {CATEGORIAS.map((c, i) => (
            <Link
              key={c.id}
              href={`/loja?categoria=${c.id}`}
              className="zoom-foto group relative block aspect-[3/4] w-[46vw] max-w-[230px] overflow-hidden rounded-cartao bg-superficie-2 lg:w-auto lg:max-w-none"
              data-revelar
              style={atraso(i * 60)}
            >
              <FotoFixa nome={c.foto} alt="" sizes="(min-width: 1024px) 16vw, 46vw" />
              <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" aria-hidden />
              <span className="absolute inset-x-0 bottom-0 p-4 text-white">
                <span className="block text-[17px] leading-tight font-semibold tracking-[-0.02em]">{c.nome}</span>
                <span className="mt-0.5 block text-[12.5px] text-white/75">
                  {contagem[c.id] ? `${contagem[c.id]} ${contagem[c.id] === 1 ? "opção" : "opções"}` : "Consulte"}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Vitrine em duas abas: Novos e Seminovos (a loja vende os dois, cada um com a sua garantia e o seu jeito) */}
      {(novos.length > 0 || seminovos.length > 0) && (
        <section aria-labelledby="t-destaques" className="mx-auto mt-24 max-w-[1240px] px-4 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <h2 id="t-destaques" className="text-[28px] leading-tight font-semibold tracking-[-0.035em] sm:text-[36px]" data-revelar>
              Pronta entrega.
            </h2>
            <Link href="/loja" className="inline-flex shrink-0 items-center gap-1 text-[15px] font-medium text-acento hover:underline">
              Ver tudo <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="mt-6">
            <Abas
              abas={[
                { id: "novos", nome: "Novos", descricao: `Lacrados, com nota fiscal e garantia de ${config.garantia}.`, conteudo: <GradeProdutos lista={novos} vazio="Os novos chegam toda semana. Pergunte pelo WhatsApp." /> },
                { id: "seminovos", nome: "Seminovos", descricao: `Revisados na loja, com laudo aberto e garantia de ${config.garantia}.`, conteudo: <GradeProdutos lista={seminovos} vazio="Os seminovos entram toda semana. Pergunte pelo WhatsApp." /> },
              ]}
            />
          </div>
        </section>
      )}

      {/* 4. O laudo: a conferencia se marca item a item conforme a pessoa rola */}
      <section id="laudo" aria-labelledby="t-laudo" className="mx-auto mt-28 max-w-[1240px] px-4 sm:px-6 lg:mt-36 lg:grid lg:grid-cols-[1fr_1fr] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <p className="text-[13px] font-semibold tracking-[0.12em] text-acento uppercase" data-revelar>O laudo Loja Modelo</p>
          <h2 id="t-laudo" className="mt-3 max-w-[16ch] text-[34px] leading-[1.05] font-semibold tracking-[-0.04em] text-balance sm:text-[46px]" data-revelar>
            Todo seminovo sai daqui com a ficha aberta.
          </h2>
          <p className="mt-5 max-w-[42ch] text-[16.5px] leading-relaxed text-suave" data-revelar>
            Antes de ir para a vitrine, o aparelho é conferido item por item. A saúde da bateria e o estado ficam escritos na página do produto, e todo aparelho sai com garantia de {config.garantia}.
          </p>
        </div>
        <ol className="mt-10 grid gap-2.5 lg:mt-0">
          {config.laudoItens.map((t, i) => (
            <li key={t} className="item-laudo flex items-center gap-4 rounded-cartao bg-superficie px-5 py-5 ring-1 ring-linha sm:py-6">
              <span className="num w-6 font-mono text-[13px] text-suave">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1 text-[17px] font-medium tracking-[-0.01em] sm:text-[19px]">{t}</span>
              <span className="marca grid size-7 shrink-0 place-items-center rounded-full bg-superficie-2 text-sobre-acento">
                <Check className="size-4" strokeWidth={3} aria-hidden />
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* 5. Alem do iPhone (bento: 5 itens, 5 celulas) */}
      <section aria-labelledby="t-mais" className="mx-auto mt-28 max-w-[1240px] px-4 sm:px-6 lg:mt-36">
        <h2 id="t-mais" className="max-w-[18ch] text-[28px] leading-tight font-semibold tracking-[-0.035em] sm:text-[36px]" data-revelar>
          Além do iPhone, o que acompanha a sua rotina.
        </h2>
        <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:grid-rows-[300px_300px]">
          <Link href="/loja?categoria=mobilidade" className="zoom-foto relative col-span-2 aspect-[4/3] overflow-hidden rounded-cartao bg-superficie-2 lg:row-span-2 lg:aspect-auto" data-revelar>
            <FotoFixa nome="scooter" alt="Scooter elétrica com banco de couro marrom em frente à loja" sizes="(min-width: 1024px) 50vw, 100vw" className="object-[50%_60%]" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" aria-hidden />
            <span className="absolute bottom-0 left-0 p-5 text-white sm:p-7">
              <span className="block text-[24px] leading-tight font-semibold tracking-[-0.03em] sm:text-[32px]">Mobilidade elétrica</span>
              <span className="mt-1 block text-[14px] text-white/80">Scooters com garantia e parcelamento em até 24x.</span>
            </span>
          </Link>
          {[
            { href: "/loja?categoria=cameras", foto: "drone-neo", t: "Drones e câmeras", alt: "Caixa do drone DJI Neo" },
            { href: "/loja?categoria=audio", foto: "airpods", t: "Áudio", alt: "AirPods com o estojo aberto na mão" },
            { href: "/loja?categoria=criadores", foto: "osmo-mobile", t: "Para criadores", alt: "Caixa do gimbal DJI Osmo Mobile SE" },
          ].map((c, i) => (
            <Link key={c.href} href={c.href} className="zoom-foto relative aspect-square overflow-hidden rounded-cartao bg-superficie-2 lg:aspect-auto" data-revelar style={atraso(80 + i * 70)}>
              <FotoFixa nome={c.foto} alt={c.alt} sizes="(min-width: 1024px) 25vw, 50vw" />
              <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" aria-hidden />
              <span className="absolute bottom-0 left-0 p-4 text-[17px] font-semibold tracking-[-0.02em] text-white sm:p-5 sm:text-[20px]">{c.t}</span>
            </Link>
          ))}
          <a
            href={wpp("Oi! Queria uma película sob medida para o meu celular.")}
            target={config.whatsapp ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="group relative flex aspect-square flex-col justify-between overflow-hidden rounded-cartao bg-acento p-4 text-sobre-acento sm:p-5 lg:aspect-auto"
            data-revelar
            style={atraso(290)}
          >
            <Scissors className="size-6 transition-transform duration-500 group-hover:-rotate-12" strokeWidth={1.8} />
            <span>
              <span className="block text-[17px] leading-tight font-semibold tracking-[-0.02em] sm:text-[20px]">Películas sob medida</span>
              <span className="mt-1 block text-[13px] leading-snug opacity-85 sm:text-[14px]">Cortadas na hora para qualquer celular.</span>
            </span>
          </a>
        </div>
      </section>

      {/* 6. Pagamento: frase grande, sem enfeite */}
      <section aria-labelledby="t-pagamento" className="mx-auto mt-28 max-w-[1240px] px-4 sm:px-6 lg:mt-36">
        <div className="border-y border-linha py-14 sm:py-20">
          <h2 id="t-pagamento" className="max-w-[20ch] text-[38px] leading-[1.04] font-semibold tracking-[-0.045em] text-balance sm:text-[60px] lg:text-[76px]" data-revelar>
            Até {config.parcelasMax}x no cartão. <span className="text-suave">Ou no crediário Loja Modelo.</span>
          </h2>
          <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between" data-revelar>
            <p className="max-w-[44ch] text-[16.5px] leading-relaxed text-suave">{config.crediario}</p>
            <a href={wpp("Oi! Queria saber como funciona o crediário Loja Modelo.")} target={config.whatsapp ? "_blank" : undefined} rel="noopener noreferrer" className="btn btn-escuro self-start sm:self-auto">
              Consultar o crediário <ArrowUpRight className="size-4" />
            </a>
          </div>
        </div>
      </section>

      {/* 7. Lojas */}
      <section id="lojas" aria-labelledby="t-lojas" className="mx-auto mt-28 max-w-[1240px] px-4 sm:px-6 lg:mt-36 lg:grid lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-16">
        <div className="zoom-foto aspect-[4/3] overflow-hidden rounded-cartao bg-superficie-2" data-revelar>
          <FotoFixa nome="scooter-loja" alt="Fachada de vidro da loja Loja Modelo com scooters elétricas na calçada" sizes="(min-width: 1024px) 54vw, 100vw" />
        </div>
        <div className="mt-9 lg:mt-0">
          <h2 id="t-lojas" className="text-[28px] leading-tight font-semibold tracking-[-0.035em] sm:text-[36px]" data-revelar>
            Venha ver de perto.
          </h2>
          <p className="mt-3 max-w-[40ch] text-[16.5px] leading-relaxed text-suave" data-revelar>
            Duas lojas no litoral norte gaúcho. Pegue o aparelho na mão antes de decidir.
          </p>
          <ul className="mt-7 grid gap-3">
            {config.lojas.map((l, i) => (
              <li key={l.cidade} className="rounded-cartao bg-superficie p-5 ring-1 ring-linha" data-revelar style={atraso(i * 90)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[18px] font-semibold tracking-[-0.02em]">{l.cidade}</h3>
                    <p className="mt-1 text-[14.5px] leading-relaxed text-suave">{l.endereco || "Peça a localização pelo WhatsApp."}</p>
                    {l.horario && <p className="mt-0.5 text-[14px] text-suave">{l.horario}</p>}
                  </div>
                  <MapPin className="size-5 shrink-0 text-acento" strokeWidth={1.8} />
                </div>
                {l.mapa && (
                  <a href={l.mapa} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-[14px] font-medium text-acento hover:underline">
                    Como chegar <ArrowUpRight className="size-4" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 8. Nova Linha, a operadora do grupo */}
      <section aria-label="Nova Linha" className="mx-auto mt-28 max-w-[1240px] px-4 sm:px-6 lg:mt-36">
        <div className="relative overflow-hidden rounded-cartao bg-operadora px-6 py-12 text-white sm:px-12 sm:py-16" data-revelar>
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="logo-operadora block w-[150px] sm:w-[190px]" role="img" aria-label="Nova Linha" />
              <p className="mt-5 max-w-[36ch] text-[17px] leading-relaxed text-white/85 sm:text-[19px]">
                A operadora do grupo Loja Modelo. Pergunte pelos planos quando passar na loja.
              </p>
            </div>
            {config.operadoraUrl ? (
              <a href={config.operadoraUrl} target="_blank" rel="noopener noreferrer" className="btn self-start bg-operadora-agua text-[#1d0a2e] sm:self-auto">
                Conhecer a Nova Linha <ArrowUpRight className="size-4" />
              </a>
            ) : (
              <a href={wpp("Oi! Queria saber sobre os planos da Nova Linha.")} target={config.whatsapp ? "_blank" : undefined} rel="noopener noreferrer" className="btn self-start bg-operadora-agua text-[#1d0a2e] sm:self-auto">
                Saber dos planos <ArrowUpRight className="size-4" />
              </a>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
