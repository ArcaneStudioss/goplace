import type { Metadata } from "next";
import { CreditCard, Eye, Film, ListChecks, MapPin, Phone } from "lucide-react";
import { exigirAdmin } from "@/lib/auth";
import { formatarTelefone } from "@/lib/comum";
import { lerConfig } from "@/lib/config";
import { salvarContato, salvarLaudo, salvarLojas, salvarPagamento, salvarPrevia } from "../acoes";
import { CartaoConfig, Campo, Dados, FormJanela } from "@/components/admin/Janela";
import { FormVideo } from "@/components/admin/FormVideo";
import { Titulo } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Site" };

export default async function Site() {
  await exigirAdmin();
  const c = await lerConfig();
  return (
    <div className="mx-auto max-w-[1000px]">
      <Titulo titulo="Site" sub="O que aparece para quem visita a loja online." />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <CartaoConfig titulo="Contato" icone={<Phone className="size-5" />} resumo={<Dados itens={[["WhatsApp", c.whatsapp ? formatarTelefone(c.whatsapp) : ""], ["Instagram", c.instagram ? `@${c.instagram}` : ""], ["Link da Nova Linha", c.operadoraUrl]]} />}>
          <FormJanela acao={salvarContato}>
            <Campo rotulo="WhatsApp da loja (com DDD)" nome="whatsapp" type="tel" inputMode="tel" defaultValue={c.whatsapp} placeholder="51 99999-9999" dica="Recebe os pedidos do site." />
            <Campo rotulo="Instagram" nome="instagram" defaultValue={c.instagram} placeholder="lojamodelo" />
            <Campo rotulo="Site ou Instagram da Nova Linha" nome="operadoraUrl" type="url" defaultValue={c.operadoraUrl} placeholder="https://..." className="sm:col-span-2" />
          </FormJanela>
        </CartaoConfig>

        <CartaoConfig titulo="Pagamento e garantia" icone={<CreditCard className="size-5" />} resumo={<Dados itens={[["Parcelamento máximo", `${c.parcelasMax}x no cartão`], ["Garantia", c.garantia], ["Crediário", c.crediario]]} />}>
          <FormJanela acao={salvarPagamento}>
            <Campo rotulo="Parcelamento máximo no cartão" nome="parcelasMax" type="number" min={1} max={24} defaultValue={c.parcelasMax} dica="Aparece no topo do site. As parcelas sem juros de cada produto ficam no cadastro dele." className="sm:col-span-2" />
            <Campo rotulo="Garantia (aparece no site todo)" nome="garantia" defaultValue={c.garantia} placeholder="6 meses a 1 ano" maxLength={40} dica="Vale quando o produto não tem uma garantia própria. Ex.: 6 meses a 1 ano" className="sm:col-span-2" />
            <div className="sm:col-span-2">
              <label htmlFor="c-crediario" className="rotulo">Texto do crediário Loja Modelo</label>
              <textarea id="c-crediario" name="crediario" defaultValue={c.crediario} rows={3} maxLength={220} className="campo resize-none" />
            </div>
          </FormJanela>
        </CartaoConfig>

        <CartaoConfig titulo="Lojas" icone={<MapPin className="size-5" />} larga resumo={<Dados itens={c.lojas.map((l) => [l.cidade, l.endereco] as [string, string])} />}>
          <FormJanela acao={salvarLojas}>
            {c.lojas.map((l, i) => (
              <fieldset key={i} className="grid gap-3 rounded-miudo bg-fundo p-4 ring-1 ring-linha sm:col-span-2 sm:grid-cols-2">
                <legend className="px-1 text-[13px] font-semibold">Loja {i + 1}</legend>
                <Campo rotulo="Cidade" nome={`cidade${i}`} defaultValue={l.cidade} />
                <Campo rotulo="Horário" nome={`horario${i}`} defaultValue={l.horario} placeholder="Seg a sex 9h às 19h, sáb 9h às 13h" />
                <Campo rotulo="Endereço" nome={`endereco${i}`} defaultValue={l.endereco} placeholder="Rua, número, bairro" className="sm:col-span-2" />
                <Campo rotulo="Link do Google Maps" nome={`mapa${i}`} type="url" defaultValue={l.mapa} placeholder="https://maps.app.goo.gl/..." className="sm:col-span-2" />
              </fieldset>
            ))}
          </FormJanela>
        </CartaoConfig>

        <CartaoConfig titulo="Vídeo do topo" icone={<Film className="size-5" />} resumo={c.videoTopo ? "Vídeo no ar no topo da página inicial." : "Sem vídeo: o topo mostra a foto do iPhone 15 Pro."}>
          <FormVideo temVideo={!!c.videoTopo} />
        </CartaoConfig>

        <CartaoConfig titulo="Itens do laudo" icone={<ListChecks className="size-5" />} resumo={`${c.laudoItens.length} itens: ${c.laudoItens.slice(0, 3).join(", ")}...`}>
          <FormJanela acao={salvarLaudo} className="grid gap-2">
            <label htmlFor="c-itens" className="rotulo">Um item por linha (o que a loja confere em todo seminovo)</label>
            <textarea id="c-itens" name="itens" rows={9} defaultValue={c.laudoItens.join("\n")} className="campo resize-y" />
          </FormJanela>
        </CartaoConfig>

        <CartaoConfig titulo="Aviso de prévia" icone={<Eye className="size-5" />} resumo={c.previa ? "Ligado: o site mostra a faixa “Prévia do site”." : "Desligado: site no modo normal."}>
          <FormJanela acao={salvarPrevia} className="grid gap-2">
            <label className="flex cursor-pointer items-center gap-3 text-[15px]">
              <input type="checkbox" name="previa" defaultChecked={c.previa} /> Mostrar a faixa “Prévia do site” no topo
            </label>
            <p className="text-[13.5px] text-suave">Desligue quando os produtos e preços de exemplo forem trocados pelos reais.</p>
          </FormJanela>
        </CartaoConfig>
      </div>
    </div>
  );
}
