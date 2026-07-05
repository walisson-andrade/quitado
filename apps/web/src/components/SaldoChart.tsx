import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmt, mesLabel } from "../format.js";
import type { DashboardResponse } from "../api/types.js";

export function SaldoChart({ projecao }: { projecao: DashboardResponse["projecao"] }) {
  const data = projecao.map((p) => ({ mes: mesLabel(p.mes), saldo: Math.round(p.saldo.saldoCents / 100) }));
  // "jun/26" ocupa bem mais espaço que "07" — pula ticks pra não amontoar o eixo.
  const tickInterval = Math.max(0, Math.ceil(data.length / 6) - 1);

  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="saldoFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--q-teal)" stopOpacity={0.55} />
              <stop offset="100%" stopColor="var(--q-teal)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--q-border-input)" strokeDasharray="3 6" vertical={false} />
          <XAxis
            dataKey="mes"
            stroke="var(--q-text-muted)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            interval={tickInterval}
          />
          <YAxis
            stroke="var(--q-text-muted)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            width={34}
          />
          <Tooltip
            contentStyle={{ background: "var(--q-card-bg)", border: "1px solid var(--q-border-input)", borderRadius: 10, fontFamily: "Space Grotesk" }}
            labelStyle={{ color: "var(--q-text)" }}
            formatter={(v: number) => [fmt(v * 100), "Saldo"]}
          />
          <Area type="monotone" dataKey="saldo" stroke="var(--q-teal)" strokeWidth={2.5} fill="url(#saldoFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
