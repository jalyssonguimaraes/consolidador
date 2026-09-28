import type {consolidate} from './ledger';
type Ledger=ReturnType<typeof consolidate>;
export type Quote={asset:string;price:number;at:string;updated?:string;name?:string};
export function portfolioInsights(data:Ledger & {quotes:Quote[]},category='Todas'){
 const positions=data.positions.filter(p=>category==='Todas'||p.category===category);
 const quotes=new Map(data.quotes.filter(q=>Number.isFinite(q.price)&&q.price>0).map(q=>[q.asset,q]));
 const comparable=positions.filter(p=>p.reliable&&p.cost!==null&&quotes.has(p.asset)).map(p=>({...p,market:p.quantity*quotes.get(p.asset)!.price*100,quoteDate:quotes.get(p.asset)!.at}));
 const cost=positions.reduce((s,p)=>s+(p.cost??0),0);const comparableCost=comparable.reduce((s,p)=>s+p.cost!,0);const market=comparable.reduce((s,p)=>s+p.market,0);
 const concentration=positions.filter(p=>p.cost!==null&&p.cost>0).map(p=>({asset:p.asset,cost:p.cost!,weight:cost?p.cost!/cost:0})).sort((a,b)=>b.cost-a.cost);
 const realized=(data.realizedPositions||[]).filter(p=>p.reliable&&(category==='Todas'||p.category===category));
 const pending=(data.realizedPositions||[]).filter(p=>!p.reliable&&(category==='Todas'||p.category===category));
 const ranked=comparable.map(p=>({asset:p.asset,change:p.market-p.cost!,percent:p.cost!>0?(p.market/p.cost!-1)*100:null})).sort((a,b)=>b.change-a.change);
 const movements=data.movements.filter(m=>category==='Todas'||m.category===category);
 const activity=new Map<string,{buys:number;sells:number;fees:number}>();
 for(const m of movements){const year=m.date.slice(0,4);const row=activity.get(year)||{buys:0,sells:0,fees:0};row[m.side==='buy'?'buys':'sells']+=m.gross;row.fees+=m.costFees;activity.set(year,row);}
 return {positions,cost,market,comparableCost,change:market-comparableCost,changePercent:comparableCost>0?(market/comparableCost-1)*100:null,coverage:positions.length?comparable.length/positions.length:0,pricedCount:comparable.length,concentration,topThree:concentration.slice(0,3).reduce((s,p)=>s+p.weight,0),ranked,realizedTotal:realized.reduce((s,p)=>s+(p.realized??0),0),pendingCount:pending.length,activity:[...activity].sort(([a],[b])=>a.localeCompare(b)),fees:movements.reduce((s,m)=>s+m.costFees,0),quoteDates:comparable.map(p=>p.quoteDate).sort()};
}
