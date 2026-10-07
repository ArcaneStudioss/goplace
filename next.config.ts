import type { NextConfig } from "next";

// Cabecalhos de seguranca em todas as respostas. Scripts inline sao do proprio Next (e do tema claro/escuro).
const midiaExterna = process.env.SUPABASE_URL ? ` ${new URL(process.env.SUPABASE_URL).origin}` : "";
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"),
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${midiaExterna}`,
  `media-src 'self' blob:${midiaExterna}`,
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const CABECALHOS_SEGURANCA = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const PRIVADO = [
  { key: "Cache-Control", value: "no-store, max-age=0" },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: CABECALHOS_SEGURANCA },
      { source: "/admin/:path*", headers: PRIVADO },
      { source: "/entrar", headers: PRIVADO },
      { source: "/pedido/:path*", headers: PRIVADO },
    ];
  },
  experimental: {
    // fotos ja chegam comprimidas pelo navegador (~300 KB cada); o video do topo pode chegar a 30 MB
    serverActions: { bodySizeLimit: "32mb" },
    proxyClientMaxBodySize: "32mb",
    staleTimes: { dynamic: 30 },
  },
  serverExternalPackages: ["@electric-sql/pglite", "sharp"],
};

export default nextConfig;
