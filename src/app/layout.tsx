import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

const SITE = (process.env.SITE_URL || "http://localhost:3100").replace(/\/+$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "GoPlace · iPhones novos e seminovos com laudo", template: "%s · GoPlace" },
  description:
    "iPhones novos e seminovos com laudo aberto, garantia e parcelamento. Áudio, scooters elétricas, drones e acessórios em Santo Antônio da Patrulha e Capão da Canoa.",
  openGraph: { type: "website", locale: "pt_BR", siteName: "GoPlace", images: ["/fotos/iphone-15-pro-1200.webp"] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f4f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0c0d" },
  ],
};

// Antes de pintar a tela: escolhe o tema (o salvo pela pessoa ou o do sistema) e marca que ha JavaScript.
const TEMA = `(function(){var d=document.documentElement,t;try{t=localStorage.getItem('gp-tema')}catch(e){}if(t!=='claro'&&t!=='escuro'){t=matchMedia('(prefers-color-scheme: dark)').matches?'escuro':'claro'}d.setAttribute('data-tema',t);d.classList.add('js')})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-tema="claro" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
