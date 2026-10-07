"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const real = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const curto = (c: number) => (c >= 100_000_00 ? `${Math.round(c / 100_000)}k` : c >= 1_000_00 ? `${(c / 100_000).toFixed(1).replace(".", ",")}k` : String(Math.round(c / 100)));
const dia = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;

function Dica({ active, payload, label }: { active?: boolean; payload?: { value: number; payload: { vendas?: number } }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-miudo bg-superficie px-3 py-2 text-[13px] shadow-suave ring-1 ring-linha">
      <p className="text-suave">{label && /^\d{4}-/.test(label) ? dia(label) : label}</p>
      <p className="num font-semibold">{real(payload[0].value)}</p>
      {payload[0].payload.vendas != null && <p className="text-suave">{payload[0].payload.vendas} {payload[0].payload.vendas === 1 ? "venda" : "vendas"}</p>}
    </div>
  );
}

export function GraficoVendas({ dados }: { dados: { dia: string; valor: number; vendas: number }[] }) {
  return (
    <div className="h-[240px] w-full" role="img" aria-label="Faturamento por dia">
      <ResponsiveContainer>
        <AreaChart data={dados} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="g-vendas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--acento)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--acento)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--linha)" />
          <XAxis dataKey="dia" tickFormatter={dia} tick={{ fill: "var(--suave)", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis tickFormatter={curto} tick={{ fill: "var(--suave)", fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
          <Tooltip content={<Dica />} cursor={{ stroke: "var(--linha)" }} />
          <Area type="monotone" dataKey="valor" stroke="var(--acento)" strokeWidth={2} fill="url(#g-vendas)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GraficoBarras({ dados }: { dados: { nome: string; valor: number }[] }) {
  return (
    <div className="w-full" style={{ height: Math.max(120, dados.length * 40) }} role="img" aria-label="Faturamento por grupo">
      <ResponsiveContainer>
        <BarChart data={dados} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="nome" width={130} tick={{ fill: "var(--texto)", fontSize: 12.5 }} axisLine={false} tickLine={false} />
          <Tooltip content={<Dica />} cursor={{ fill: "var(--superficie-2)" }} />
          <Bar dataKey="valor" fill="var(--acento)" radius={[0, 8, 8, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
