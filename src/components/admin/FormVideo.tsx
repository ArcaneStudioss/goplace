"use client";

import { salvarVideo } from "@/app/admin/acoes";
import { FormJanela } from "./Janela";

export function FormVideo({ temVideo }: { temVideo: boolean }) {
  return (
    <div className="grid gap-6">
      <FormJanela acao={salvarVideo} salvar="Enviar vídeo" className="grid gap-4">
        <div>
          <label htmlFor="c-video" className="rotulo">Vídeo (MP4, até 30 MB)</label>
          <input id="c-video" name="video" type="file" accept="video/mp4,video/webm" required className="campo file:mr-3 file:rounded-full file:border-0 file:bg-superficie-2 file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-texto" />
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-suave">Vídeo próprio da loja, sem som, de 8 a 20 segundos, em pé (9:16) ou 4:5. Vídeo de propaganda da Apple ou de outra marca não pode ser usado.</p>
        </div>
        <div>
          <label htmlFor="c-poster" className="rotulo">Capa enquanto carrega (opcional)</label>
          <input id="c-poster" name="poster" type="file" accept="image/*" className="campo file:mr-3 file:rounded-full file:border-0 file:bg-superficie-2 file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-texto" />
        </div>
      </FormJanela>
      {temVideo && (
        <FormJanela acao={salvarVideo} salvar="Tirar o vídeo" perigo className="grid">
          <input type="hidden" name="remover" value="1" />
          <p className="text-[14px] text-suave">Volta a mostrar a foto no topo.</p>
        </FormJanela>
      )}
    </div>
  );
}
