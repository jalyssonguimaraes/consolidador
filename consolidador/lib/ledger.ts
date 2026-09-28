export const feeKeys = ['settlement','exchange','brokerage','iss','irrf'] as const;
export type FeeKey = typeof feeKeys[number];
export type Trade = {asset:string;category:'Ação'|'FII'|'Tesouro Direto';side:'buy'|'sell';quantity:string;price:string;maturity?:string};
export type Note = {id:string;broker:string;date:string;number:string;kind:'variable'|'treasury';fees:Record<FeeKey,string>;trades:Trade[];source?:{file:string;sha256:string;sheet:string;rows:number[]};original?:Record<string,string>[];version?:number};
const SCALE = 100000000n;
export function decimal(value:string):bigint {
 if(!/^\d{1,12}(\.\d{1,8})?$/.test(value)) throw new Error('Informe um número positivo, com até 8 casas decimais.');
 const [a,b='']=value.split('.');return BigInt(a)*SCALE+BigInt(b.padEnd(8,'0'));
}
export function round(n:bigint,d:bigint):bigint {if(d<=0n)throw new Error('Divisor inválido.'); return n<0n ? -round(-n,d) : (n+d/2n)/d;}
export function cents(value:string):number {return Number(round(decimal(value),1000000n));}
export function allocate(total:number,weights:bigint[]):number[] {
 const sum=weights.reduce((a,b)=>a+b,0n);
 if(!Number.isSafeInteger(total)||total<0)throw new Error('Total de taxa inválido.');
 if(sum===0n){if(total)throw new Error('A taxa não tem operações elegíveis.');return weights.map(()=>0);}
 const shares=weights.map((w,i)=>({i,c:Number(BigInt(total)*w/sum),remainder:BigInt(total)*w%sum}));
 let remaining=total-shares.reduce((s,v)=>s+v.c,0);
 for(const s of [...shares].sort((a,b)=>a.remainder===b.remainder?a.i-b.i:a.remainder>b.remainder?-1:1)){if(!remaining)break;s.c++;remaining--;}
 return shares.map(s=>s.c);
}
export function normalizeNote(note:Note){
 const weights=note.trades.map(t=>decimal(t.quantity)*decimal(t.price));
 const allocations=Object.fromEntries(feeKeys.map(key=>[key,allocate(cents(note.fees[key]),key==='irrf'?weights.map((w,i)=>note.trades[i].side==='sell'?w:0n):weights)])) as Record<FeeKey,number[]>;
 return note.trades.map((t,i)=>{
  const fees=Object.fromEntries(feeKeys.map(k=>[k,allocations[k][i]])) as Record<FeeKey,number>;
  const costFees=fees.settlement+fees.exchange+fees.brokerage+fees.iss;
  const gross=Number(round(weights[i],100000000000000n));
  if(!Number.isSafeInteger(gross)||!Number.isSafeInteger(gross+costFees+fees.irrf))throw new Error('Valor da operação excede o limite suportado.');
  return {...t,id:note.id+':'+i,noteId:note.id,broker:note.broker,date:note.date,number:note.number,gross,fees,costFees,net:t.side==='buy'?-(gross+costFees+fees.irrf):gross-costFees-fees.irrf,originalFees:note.original?.[i],source:note.source?`${note.source.sheet}, linha ${note.source.rows[i]}`:'Lançamento manual'};
 });
}
export type Movement = ReturnType<typeof normalizeNote>[number];
const sectorMap:Record<string,string>={PETR4:'Petróleo e gás',VALE3:'Mineração',ABEV3:'Bebidas',BHIA3:'Varejo',ITSA4:'Financeiro',BBDC4:'Financeiro',BBAS3:'Financeiro',CMIG4:'Energia elétrica',CPFE3:'Energia elétrica',CPLE3:'Energia elétrica',RAIL3:'Logística',SUZB3:'Papel e celulose',BPAN4:'Financeiro',BIDI4:'Financeiro',BEEF3:'Alimentos'};
// Eventos históricos confirmados que precisam ser aplicados ao saldo ainda aberto.
// Proporção representada como fração irredutível (numerator/denominator) para cobrir tanto
// grupamento (reduz quantidade, ex. 1/25) quanto bonificação (aumenta quantidade, ex. 105/100 = 5%).
// Frações de ação resultantes são sempre arredondadas para baixo — a empresa paga a fração
// remanescente em dinheiro (leilão de frações), nunca credita ação adicional por arredondamento.
const quantityActions:Record<string,{date:string;numerator:number;denominator:number;label:string}[]>={
 BHIA3:[{date:'2023-12-28',numerator:1,denominator:25,label:'Grupamento 25:1'}],
 // Itaúsa: duas bonificações de 5% (5 ações novas para cada 100), confirmadas nos fatos
 // relevantes da companhia. Data-base = último dia de negociação com direito; a bonificação é
 // creditada alguns dias depois, mas o ajuste de quantidade é aplicado a partir da data-base.
 ITSA4:[
  {date:'2023-11-27',numerator:105,denominator:100,label:'Bonificação 5% (data-base 27/11/2023)'},
  {date:'2024-12-02',numerator:105,denominator:100,label:'Bonificação 5% (data-base 02/12/2024)'},
 ],
};
export function consolidate(notes:Note[]){
 const movements=notes.flatMap(normalizeNote).sort((a,b)=>a.date.localeCompare(b.date));
 const positions=new Map<string,{asset:string;category:string;brokers:Set<string>;quantity:bigint;cost:bigint;realized:bigint;buyQuantity:bigint;sellQuantity:bigint;reliable:boolean;maturity?:string}>();
 const lots=new Map<string,{quantity:bigint;unitCost:bigint;date:string;buyId:string}[]>();
 const realizedByAsset=new Map<string,{gross:number;fees:number;irrf:number;dayTradeQty:number;fifoQty:number;lots:{buyId:string;sellId:string;quantity:number;gross:number;cost:number;dayTrade:boolean}[]}>();
 const issues:{key:string;message:string}[]=[];
 for(const note of notes){
  if(note.kind==='treasury')note.original?.forEach((o,i)=>{
   if(o.reportedNet&&Math.abs(cents(o.reportedNet)-Math.abs(normalizeNote(note)[i].net))>1)issues.push({key:note.id+'-net',message:`${note.broker} · protocolo ${note.number}: valor líquido da planilha difere do bruto menos/mais as taxas. Conferir extrato.`});
  });
 }
 // Preserve the original row sequence within a note. Intraday order is otherwise unknown.
 const sameDay=new Map<string,Set<string>>();
 for(const t of movements){const key=[t.date,t.asset].join('|');const set=sameDay.get(key)||new Set<string>();set.add(t.side);sameDay.set(key,set);}
 for(const [key,sides]of sameDay)if(sides.size>1)issues.push({key,message:`${key.replace('|',' · ')}: compra e venda no mesmo dia. Resultado exige conferência da sequência; não há apuração de day trade.`});
 // Linha do tempo única, em ordem cronológica, misturando movimentações e eventos de quantidade
 // (grupamento/bonificação). Isso é necessário porque uma venda posterior a uma bonificação precisa
 // enxergar o saldo já ajustado — aplicar os eventos só no final compararia a venda contra um saldo
 // desatualizado (anterior ao evento) e geraria falso alarme de saldo insuficiente.
 type ActionItem={date:string;asset:string;numerator:number;denominator:number;label:string};
 const actionItems:ActionItem[]=Object.entries(quantityActions).flatMap(([asset,actions])=>actions.map(a=>({asset,...a})));
 type TimelineEntry={date:string;order:number;movement?:Movement;action?:ActionItem};
 const timeline:TimelineEntry[]=[
  ...movements.map(m=>({date:m.date,order:1,movement:m})),
  ...actionItems.map(a=>({date:a.date,order:0,action:a})),
 ].sort((a,b)=>a.date===b.date?a.order-b.order:a.date.localeCompare(b.date));
 for(const entry of timeline){
  if(entry.action){
   const action=entry.action;const num=BigInt(action.numerator),den=BigInt(action.denominator);
   for(const [key,p] of positions){
    if(p.asset!==action.asset)continue;
    const bucket=lots.get(key)||[];
    for(const lot of bucket){const totalCost=lot.unitCost*lot.quantity;lot.quantity=(lot.quantity*num)/den;lot.unitCost=lot.quantity>0n?totalCost/lot.quantity:0n;}
    p.quantity=(p.quantity*num)/den;p.buyQuantity=(p.buyQuantity*num)/den;p.sellQuantity=(p.sellQuantity*num)/den;
    // A fração de ação resultante é paga em dinheiro pela companhia: o saldo permanece em ações inteiras.
    // Remove a fração dos lotes mais recentes, preservando o custo total de cada lote afetado.
    let fraction=p.quantity%SCALE;
    if(fraction>0n){p.quantity-=fraction;p.buyQuantity-=p.buyQuantity%SCALE;for(let i=bucket.length-1;i>=0&&fraction>0n;i--){const lot=bucket[i];const cut=fraction<lot.quantity?fraction:lot.quantity;if(cut<=0n)continue;const total=lot.unitCost*lot.quantity;lot.quantity-=cut;lot.unitCost=lot.quantity>0n?total/lot.quantity:0n;fraction-=cut;}}
    p.cost=bucket.reduce((s,l)=>s+l.unitCost*l.quantity,0n);
    issues.push({key:key+'-'+action.date,message:`${p.asset}: aplicado ${action.label} em ${action.date}. Quantidade e custo médio foram ajustados; confira eventuais frações do extrato.`});
   }
   continue;
  }
  const t=entry.movement!;
  const key=[t.category,t.asset,t.maturity||''].join('|');
  const p=positions.get(key)||{asset:t.asset,category:t.category,brokers:new Set<string>(),quantity:0n,cost:0n,realized:0n,buyQuantity:0n,sellQuantity:0n,reliable:true,maturity:t.maturity};
  p.brokers.add(t.broker);
  const q=decimal(t.quantity);
  if(sameDay.get([t.date,t.asset].join('|'))!.size>1)p.reliable=false;
  if(t.side==='buy'){p.quantity+=q;p.buyQuantity+=q;p.cost+=BigInt(t.gross+t.costFees)*SCALE;}
  else{
   if(q>p.quantity){p.reliable=false;issues.push({key:t.id,message:`${t.asset} · ${t.date}: venda/resgate de ${t.quantity} excede o saldo consolidado anterior de ${Number(p.quantity)/1e8}. Conferir transferência ou movimentação faltante.`});}
   const assetKey=key;const bucket=lots.get(assetKey)||[];/* FIFO: the oldest open lot is always consumed first. Same-day lots are still classified as day trade when they are reached. */const ordered=[...bucket];let remaining=q;const realized=realizedByAsset.get(assetKey)||{gross:0,fees:0,irrf:0,dayTradeQty:0,fifoQty:0,lots:[]};const beforeLots=realized.lots.length;
   for(const lot of ordered){if(remaining<=0n)break;const matched=remaining<lot.quantity?remaining:lot.quantity;const ratio=Number(matched)/Number(q);const dayTrade=lot.date===t.date;const sellGross=t.gross*ratio;const sellFees=t.costFees*ratio;const sellIrrf=t.fees.irrf*ratio;const cost=Number(round(lot.unitCost*matched,SCALE));realized.gross+=sellGross;realized.fees+=sellFees;realized.irrf+=sellIrrf;realized[dayTrade?'dayTradeQty':'fifoQty']+=Number(matched)/1e8;realized.lots.push({buyId:lot.buyId,sellId:t.id,quantity:Number(matched)/1e8,gross:sellGross-cost-sellFees-sellIrrf,cost,dayTrade});lot.quantity-=matched;remaining-=matched;}
   if(remaining>0n){p.reliable=false;issues.push({key:t.id+'-lot',message:`${t.asset} · ${t.date}: ${Number(remaining)/1e8} unidades da venda não têm lote de compra disponível. Conferir transferência ou movimentação faltante.`});}
   realizedByAsset.set(assetKey,realized);p.cost=lots.get(assetKey)?.reduce((s,l)=>s+l.unitCost*l.quantity,0n)||0n;p.realized+=BigInt(Math.round(realized.lots.slice(beforeLots).reduce((s,l)=>s+l.gross,0)))*SCALE;
   p.quantity-=q;p.sellQuantity+=q;
  }
 if(t.side==='buy'){const bucket=lots.get(key)||[];bucket.push({quantity:q,unitCost:BigInt(t.gross+t.costFees)*SCALE/q,date:t.date,buyId:t.id});lots.set(key,bucket);}
 positions.set(key,p);
 }
 const today=new Date().toISOString().slice(0,10);
 for(const [key,p]of positions)if(p.maturity&&p.maturity<today&&p.quantity>0n){p.reliable=false;issues.push({key:key+'-maturity',message:`${p.asset} · ${[...p.brokers].join(' · ')}: há saldo após o vencimento. Conferir resgate ou transferência ausente.`});}
 const positionsOut=[...positions.values()].map(p=>{const r=realizedByAsset.get([p.category,p.asset,p.maturity||''].join('|'));return {asset:p.asset,category:p.category,sector:p.category==='Ação'?(sectorMap[p.asset]||'Outros'):p.category,broker:[...p.brokers].join(', '),custody:null,sourceBrokers:[...p.brokers],brokers:[...p.brokers],quantity:Number(p.quantity)/1e8,buyQuantity:Number(p.buyQuantity)/1e8,sellQuantity:Number(p.sellQuantity)/1e8,cost:p.reliable?Number(round(p.cost,SCALE)):null,average:p.reliable&&p.quantity>0n?Number(p.cost)/Number(p.quantity)/100:null,realized:p.reliable?Number(round(p.realized,SCALE)):null,realizedDetail:r||{gross:0,fees:0,irrf:0,dayTradeQty:0,fifoQty:0,lots:[]},reliable:p.reliable,maturity:p.maturity};});
 const closed=positionsOut.filter(p=>p.quantity===0);
 return {movements,positions:positionsOut.filter(p=>p.quantity>0),closed,issues,totalFees:movements.reduce((s,t)=>s+t.costFees,0),totalIRRF:movements.reduce((s,t)=>s+t.fees.irrf,0)};
}
