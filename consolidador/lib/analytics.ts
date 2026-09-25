import { classify, type AssetClass } from '@/lib/classification';
import type { consolidate } from '@/lib/ledger';

type Consolidated = ReturnType<typeof consolidate>;
type Position = Consolidated['positions'][number];
type Movement = Consolidated['movements'][number];

export type Slice = { label: string; cents: number };
export type BrokerFlow = { broker: string; aportesCents: number; resgatesCents: number; liquidoCents: number };
export type TimelinePoint = { month: string; aportadoCents: number; acumuladoCents: number };
export type ConcentrationSlice = { label: string; category: string; cents: number; share: number };

const TOP_N = 7;

function topWithRest(entries: [string, number][], n = TOP_N): Slice[] {
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, n).map(([label, cents]) => ({ label, cents }));
  const restCents = sorted.slice(n).reduce((s, [, v]) => s + v, 0);
  return restCents > 0 ? [...top, { label: 'Outros', cents: restCents }] : top;
}

/** Aloca custo (só posições apuráveis) por classe de ativo: Ação, FII, Tesouro Direto. */
export function allocationByClass(positions: Position[]) {
  const reliable = positions.filter(p => p.reliable && p.cost != null && p.quantity > 0);
  const excluded = positions.length - reliable.length;
  const byClass = new Map<string, number>();
  for (const p of reliable) byClass.set(p.category, (byClass.get(p.category) || 0) + (p.cost as number));
  return { slices: [...byClass.entries()].map(([label, cents]) => ({ label, cents })), excluded, total: reliable.reduce((s, p) => s + (p.cost as number), 0) };
}

/** Aloca custo por setor (ações), segmento (FIIs) ou subtipo (Tesouro). Rótulo, não recomendação. */
export function allocationBySector(positions: Position[]) {
  const reliable = positions.filter(p => p.reliable && p.cost != null && p.quantity > 0);
  const byLabel = new Map<string, number>();
  const classifiedAssets = new Set<string>();
  const totalAssets = new Set<string>();
  for (const p of reliable) {
    const label = classify(p.asset, p.category as AssetClass);
    byLabel.set(label, (byLabel.get(label) || 0) + (p.cost as number));
    totalAssets.add(p.asset);
    if (label !== 'Outros' && label !== 'FII — não classificado') classifiedAssets.add(p.asset);
  }
  return {
    slices: topWithRest([...byLabel.entries()], 8),
    coverage: totalAssets.size ? classifiedAssets.size / totalAssets.size : 1,
    unclassifiedCount: totalAssets.size - classifiedAssets.size,
  };
}

/** Aportes/resgates e saldo líquido por corretora, a partir das movimentações (broker real por nota). */
export function allocationByBroker(movements: Movement[]): BrokerFlow[] {
  const byBroker = new Map<string, BrokerFlow>();
  for (const m of movements) {
    const f = byBroker.get(m.broker) || { broker: m.broker, aportesCents: 0, resgatesCents: 0, liquidoCents: 0 };
    if (m.side === 'buy') f.aportesCents += m.gross + m.costFees + m.fees.irrf;
    else f.resgatesCents += m.gross - m.costFees - m.fees.irrf;
    f.liquidoCents = f.aportesCents - f.resgatesCents;
    byBroker.set(m.broker, f);
  }
  return [...byBroker.values()].sort((a, b) => b.aportesCents - a.aportesCents);
}

/** Capital aportado por mês e acumulado ao longo do tempo (compras − vendas, em valor bruto + custos). */
export function timelineInvested(movements: Movement[]): TimelinePoint[] {
  const byMonth = new Map<string, number>();
  for (const m of movements) {
    const month = m.date.slice(0, 7);
    const delta = m.side === 'buy' ? m.gross + m.costFees + m.fees.irrf : -(m.gross - m.costFees - m.fees.irrf);
    byMonth.set(month, (byMonth.get(month) || 0) + delta);
  }
  const months = [...byMonth.keys()].sort();
  let acumulado = 0;
  return months.map(month => {
    const aportadoCents = byMonth.get(month) || 0;
    acumulado += aportadoCents;
    return { month, aportadoCents, acumuladoCents: acumulado };
  });
}

/** Maiores posições por custo — para enxergar concentração de carteira. */
export function concentration(positions: Position[]): { slices: ConcentrationSlice[]; herfindahlTop5: number } {
  const reliable = positions.filter(p => p.reliable && p.cost != null && p.quantity > 0);
  const total = reliable.reduce((s, p) => s + (p.cost as number), 0);
  const sorted = [...reliable].sort((a, b) => (b.cost as number) - (a.cost as number));
  const slices = sorted.map(p => ({ label: p.asset, category: p.category, cents: p.cost as number, share: total ? (p.cost as number) / total : 0 }));
  const herfindahlTop5 = slices.slice(0, 5).reduce((s, p) => s + p.share, 0);
  return { slices, herfindahlTop5 };
}

/** Resultado realizado por ativo, considerando posições abertas e encerradas. */
export function realizedByAsset(positions: Position[], closed: Position[]): Slice[] {
  const all = [...positions, ...closed].filter(p => p.reliable && p.realized != null && p.realized !== 0);
  return all
    .map(p => ({ label: p.asset, cents: p.realized as number }))
    .sort((a, b) => Math.abs(b.cents) - Math.abs(a.cents))
    .slice(0, 10);
}
