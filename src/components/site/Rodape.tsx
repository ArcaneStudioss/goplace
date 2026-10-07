import Link from "next/link";
import { CATEGORIAS, linkWhatsapp, formatarTelefone } from "@/lib/comum";
import type { ConfigSite } from "@/lib/config";
import { Marca } from "./Cabecalho";

export function Rodape({ config }: { config: ConfigSite }) {
  const ano = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-linha">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-xs">
          <Marca />
          <p className="mt-4 text-[14px] leading-relaxed text-suave">
            Especialistas em iPhones seminovos. Aqui você sabe exatamente o que está levando.
          </p>
        </div>
        <div>
          <h2 className="text-[13px] font-semibold text-suave">Loja</h2>
          <ul className="mt-3 grid gap-2 text-[14px]">
            {CATEGORIAS.map((c) => (
              <li key={c.id}><Link href={`/loja?categoria=${c.id}`} className="hover:text-acento">{c.nome}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-[13px] font-semibold text-suave">Atendimento</h2>
          <ul className="mt-3 grid gap-2 text-[14px]">
            {config.whatsapp && (
              <li><a href={linkWhatsapp(config.whatsapp)} target="_blank" rel="noopener noreferrer" className="hover:text-acento">WhatsApp {formatarTelefone(config.whatsapp)}</a></li>
            )}
            {config.instagram && (
              <li><a href={`https://instagram.com/${config.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="hover:text-acento">Instagram @{config.instagram.replace(/^@/, "")}</a></li>
            )}
            <li><Link href="/#lojas" className="hover:text-acento">Nossas lojas</Link></li>
            <li><Link href="/sacola" className="hover:text-acento">Minha sacola</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-[13px] font-semibold text-suave">Lojas</h2>
          <ul className="mt-3 grid gap-2 text-[14px]">
            {config.lojas.map((l) => <li key={l.cidade}>{l.cidade}</li>)}
          </ul>
        </div>
      </div>
      <div className="mx-auto max-w-[1240px] border-t border-linha px-4 py-6 text-[12px] leading-relaxed text-suave sm:px-6">
        <p>© {ano} GoPlace Phones. Preços e condições podem mudar sem aviso; confirme no atendimento.</p>
        <p className="mt-1.5">
          Apple, iPhone, AirPods, JBL, DJI, Hollyland e demais marcas citadas pertencem aos seus donos. A GoPlace é uma revenda independente, sem vínculo com os fabricantes.
        </p>
      </div>
    </footer>
  );
}
