import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <div className="mx-auto grid min-h-[70dvh] max-w-[560px] place-items-center px-4 text-center">
      <div>
        <span className="simbolo size-12 text-suave" aria-hidden />
        <h1 className="mt-6 text-[32px] font-semibold tracking-[-0.04em]">Essa página não existe mais.</h1>
        <p className="mt-2 text-[16px] text-suave">Talvez o aparelho já tenha sido vendido. Veja o que chegou na loja.</p>
        <Link href="/loja" className="btn btn-escuro mt-7">Ir para a loja</Link>
      </div>
    </div>
  );
}
