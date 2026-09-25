export type AssetEvent = {
  kind: 'cash' | 'stock' | 'subscription'; label: string;
  paymentDate: string | null; entitlementDate: string | null; exDate: string | null;
  approvedOn: string | null; rate: number | null; factor: string | null;
};
export type AssetDetails = {
  asset: string; fetchedAt: string; sector: string | null; industry: string | null;
  description: string | null; events: AssetEvent[]; eventsAvailable: boolean;
  messages: string[];
};
type Row = Record<string, unknown>;
const record = (v: unknown): Row => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Row : {};
const text = (v: unknown) => typeof v === 'string' && v.trim() ? v : null;
const date = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) && !Number.isNaN(Date.parse(v)) ? v.slice(0,10) : null;
export function parseEvents(payload: unknown, asset: string, fii: boolean): AssetEvent[] {
  const root = record(payload);
  const result = record(Array.isArray(root.results) ? root.results[0] : null);
  if (result.changed === true || (result.symbol && result.symbol !== asset)) throw new Error('A Brapi retornou outro ticker. Confira a mudança de código antes de vincular eventos.');
  const data = record(result.data);
  const groups: [AssetEvent['kind'], unknown][] = fii
    ? [['cash', root.dividends]]
    : [['cash', data.cashDividends], ['stock', data.stockDividends], ['subscription', data.subscriptions]];
  if (!groups.some(([, rows]) => Array.isArray(rows))) throw new Error('A Brapi retornou um formato de eventos não reconhecido.');
  return groups.flatMap(([kind, rows]) => Array.isArray(rows) ? rows.map(record).filter(r => !r.symbol || r.symbol === asset).map(r => ({
    kind, label: text(r.label) || (kind === 'cash' ? 'Provento' : 'Evento societário'),
    paymentDate: date(r.paymentDate), entitlementDate: date(r.lastDatePrior),
    exDate: date(r.exDate), approvedOn: date(r.approvedOn),
    rate: r.rate !== null && r.rate !== undefined && Number.isFinite(Number(r.rate)) ? Number(r.rate) : null,
    factor: text(r.completeFactor) || (r.factor !== null && r.factor !== undefined ? String(r.factor) : null),
  })) : []).sort((a,b) => (b.paymentDate || b.entitlementDate || '').localeCompare(a.paymentDate || a.entitlementDate || ''));
}
export function parseProfile(payload: unknown, asset: string) {
  const root=record(payload);const result=record(Array.isArray(root.results)?root.results[0]:null);
  if(result.changed===true || (result.symbol && result.symbol!==asset)) throw new Error('Perfil retornado para outro ticker.');
  const d=record(result.data);
  return {sector:text(d.sector), industry:text(d.industry), description:text(d.longBusinessSummary)};
}
