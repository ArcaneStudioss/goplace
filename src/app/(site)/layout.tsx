import type { Metadata } from "next";
import { lerConfig } from "@/lib/config";
import { Cabecalho } from "@/components/site/Cabecalho";
import { Rodape } from "@/components/site/Rodape";
import { Revelador } from "@/components/site/Revelador";
import { SacolaProvider } from "@/components/site/Sacola";

// tudo vem do banco (precos, estoque, configuracoes): sempre gerado na hora, nunca no build
export const dynamic = "force-dynamic";

// enquanto for previa (catalogo de exemplo), buscadores nao indexam
export async function generateMetadata(): Promise<Metadata> {
  const c = await lerConfig();
  return c.previa ? { robots: { index: false, follow: false } } : {};
}

export default async function LayoutSite({ children }: { children: React.ReactNode }) {
  const config = await lerConfig();
  return (
    <SacolaProvider>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-inverso focus:px-4 focus:py-2 focus:text-sobre-inverso">
        Pular para o conteúdo
      </a>
      {config.previa && (
        <div className="bg-inverso px-4 py-2 text-center text-[12.5px] text-sobre-inverso">
          Prévia do site: produtos e preços de exemplo, sujeitos a confirmação.
        </div>
      )}
      <Cabecalho whatsapp={config.whatsapp} />
      <main id="conteudo">{children}</main>
      <Rodape config={config} />
      <Revelador />
    </SacolaProvider>
  );
}
