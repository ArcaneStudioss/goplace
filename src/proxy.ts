import { NextResponse, type NextRequest } from "next/server";

// Primeira barreira do painel: sem cookie de sessao nem renderiza. A conferencia de verdade
// (sessao valida no banco) e feita em cada pagina e em cada acao com exigirEquipe/exigirAdmin.
export function proxy(req: NextRequest) {
  if (req.cookies.get("gp_sessao")?.value) return NextResponse.next();
  const base = (process.env.SITE_URL || req.nextUrl.origin).replace(/\/+$/, "");
  return NextResponse.redirect(new URL("/entrar", base + "/"));
}

export const config = { matcher: ["/admin/:path*"] };
