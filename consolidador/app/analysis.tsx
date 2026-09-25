'use client';
import { useMemo } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import type { consolidate, Note } from '@/lib/ledger';
import { allocationByClass, allocationBySector, allocationByBroker, timelineInvested, concentration, realizedByAsset } from '@/lib/analytics';

type Quote = { asset: string; price: number; at: string; name?: string; symbol?: string };
type Portfolio = ReturnType<typeof consolidate> & { notes: Note[]; quotes: Quote[] };

const PALETTE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', '#7c93b3', '#c9d6e8', '#4a6fa5'];
const money = (c: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(c / 100);
const pct = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 }).format(n);
const monthLabel = (m: string) => { const [y, mo] = m.split('-'); return `${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(mo) - 1]}/${y.slice(2)}`; };

function slicesToConfig(labels: string[]): ChartConfig {
  return Object.fromEntries(labels.map((l, i) => [l, { label: l, color: PALETTE[i % PALETTE.length] }]));
}

export function AnalysisView({ data }: { data: Portfolio }) {
  const byClass = useMemo(() => allocationByClass(data.positions), [data.positions]);
  const bySector = useMemo(() => allocationBySector(data.positions), [data.positions]);
  const byBroker = useMemo(() => allocationByBroker(data.movements), [data.movements]);
  const timeline = useMemo(() => timelineInvested(data.movements), [data.movements]);
  const conc = useMemo(() => concentration(data.positions), [data.positions]);
  const realized = useMemo(() => realizedByAsset(data.positions, data.closed), [data.positions, data.closed]);
  const realizedTotal = realized.reduce((s, r) => s + r.cents, 0);

  const classConfig = slicesToConfig(byClass.slices.map(s => s.label));
  const sectorConfig = slicesToConfig(bySector.slices.map(s => s.label));
  const brokerConfig = slicesToConfig(byBroker.map(b => b.broker));
  const top8 = conc.slices.slice(0, 8);

  if (!byClass.slices.length) {
    return <section className="surface"><h2>Análise</h2><p className="note">Sem posições apuráveis para analisar ainda. Confira a aba Conferência.</p></section>;
  }

  return <div className="analysis">
    <section className="cards insight-cards">
      <article><span>Setores/segmentos representados</span><strong>{bySector.slices.length}</strong><small>{bySector.unclassifiedCount ? `${bySector.unclassifiedCount} ativo(s) fora do mapa de classificação` : 'Todos os ativos classificados'}</small></article>
      <article><span>Concentração — top 5 posições</span><strong>{pct(conc.herfindahlTop5)}</strong><small>do custo total apurável</small></article>
      <article><span>Resultado realizado (top 10 ativos)</span><strong style={{ color: realizedTotal >= 0 ? '#0a7d4f' : '#b3261e' }}>{money(realizedTotal)}</strong><small>{realized.length} ativo(s) com venda/resgate</small></article>
      <article><span>Corretoras com movimentação</span><strong>{byBroker.length}</strong><small>por capital aportado</small></article>
    </section>

    <section className="charts-row">
      <section className="surface chart-card">
        <div className="section-heading"><div><h2>Alocação por classe</h2><p className="note">Custo histórico das posições apuráveis. {byClass.excluded > 0 ? `${byClass.excluded} posição(ões) a conferir foram excluídas.` : ''}</p></div></div>
        <ChartContainer config={classConfig} className="chart-box">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent formatter={(v) => money(Number(v))} />} />
            <Pie data={byClass.slices} dataKey="cents" nameKey="label" innerRadius={55} outerRadius={95} paddingAngle={2}>
              {byClass.slices.map((s, i) => <Cell key={s.label} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="label" />} />
          </PieChart>
        </ChartContainer>
      </section>

      <section className="surface chart-card">
        <div className="section-heading"><div><h2>Setores e segmentos</h2><p className="note">Ações por setor B3, FIIs por segmento, Tesouro por subtipo. Classificação apenas para agrupar — não é recomendação.</p></div></div>
        <ChartContainer config={sectorConfig} className="chart-box">
          <BarChart data={bySector.slices} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="label" width={150} tickLine={false} axisLine={false} fontSize={12} />
            <ChartTooltip content={<ChartTooltipContent formatter={(v) => money(Number(v))} hideLabel />} />
            <Bar dataKey="cents" radius={4}>
              {bySector.slices.map((s, i) => <Cell key={s.label} fill={PALETTE[i % PALETTE.length]} />)}
            </Bar>
          </BarChart>
        </ChartContainer>
      </section>
    </section>

    <section className="surface chart-card full">
      <div className="section-heading"><div><h2>Evolução do capital aportado</h2><p className="note">Compras menos vendas/resgates, por mês e acumulado. Não é rentabilidade — é fluxo de capital.</p></div></div>
      <ChartContainer config={{ acumuladoCents: { label: 'Acumulado', color: 'var(--chart-1)' }, aportadoCents: { label: 'No mês', color: 'var(--chart-3)' } }} className="chart-box wide">
        <AreaChart data={timeline.map(t => ({ ...t, mes: monthLabel(t.month) }))}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} interval="preserveStartEnd" />
          <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={v => money(v)} width={90} />
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => money(Number(v))} />} />
          <Area type="monotone" dataKey="acumuladoCents" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.18} strokeWidth={2} name="Acumulado" />
        </AreaChart>
      </ChartContainer>
    </section>

    <section className="charts-row">
      <section className="surface chart-card">
        <div className="section-heading"><div><h2>Distribuição por corretora</h2><p className="note">Aportes − resgates, a partir das notas e protocolos (corretora real de cada documento).</p></div></div>
        <ChartContainer config={brokerConfig} className="chart-box">
          <BarChart data={byBroker}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="broker" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={v => money(v)} width={80} />
            <ChartTooltip content={<ChartTooltipContent formatter={(v) => money(Number(v))} />} />
            <Bar dataKey="liquidoCents" name="Líquido" radius={4}>
              {byBroker.map((b, i) => <Cell key={b.broker} fill={PALETTE[i % PALETTE.length]} />)}
            </Bar>
          </BarChart>
        </ChartContainer>
      </section>

      <section className="surface chart-card">
        <div className="section-heading"><div><h2>Concentração — maiores posições</h2><p className="note">Top 8 por custo. Sinal de risco de concentração, não recomendação de venda.</p></div></div>
        <ChartContainer config={slicesToConfig(top8.map(s => s.label))} className="chart-box">
          <BarChart data={top8} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="label" width={70} tickLine={false} axisLine={false} fontSize={12} />
            <ChartTooltip content={<ChartTooltipContent formatter={(v, n, item) => `${money(Number(v))} · ${pct((item.payload as { share: number }).share)}`} hideLabel />} />
            <Bar dataKey="cents" radius={4}>
              {top8.map((s, i) => <Cell key={s.label} fill={PALETTE[i % PALETTE.length]} />)}
            </Bar>
          </BarChart>
        </ChartContainer>
      </section>
    </section>

    {realized.length > 0 && <section className="surface chart-card full">
      <div className="section-heading"><div><h2>Resultado realizado por ativo</h2><p className="note">Vendas e resgates já liquidados, custo médio menos taxas e IRRF. Não é apuração fiscal.</p></div></div>
      <ChartContainer config={{ cents: { label: 'Resultado', color: 'var(--chart-1)' } }} className="chart-box wide">
        <BarChart data={realized}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={v => money(v)} width={90} />
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => money(Number(v))} hideLabel />} />
          <Bar dataKey="cents" radius={4}>
            {realized.map(r => <Cell key={r.label} fill={r.cents >= 0 ? '#0a7d4f' : '#b3261e'} />)}
          </Bar>
        </BarChart>
      </ChartContainer>
    </section>}
    <p className="footnote">Classificação de setor/segmento é um rótulo auxiliar mantido no código (lib/classification.ts), best-effort e sem cobertura garantida — ativos não mapeados aparecem como “Outros” em vez de receber um setor incorreto. A visão por corretora usa a corretora de cada nota/protocolo; a divisão de posição por corretora ainda depende da limpeza descrita na Conferência.</p>
  </div>;
}
