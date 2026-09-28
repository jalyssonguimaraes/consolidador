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
// Eventos históricos confirmados, aplicados na data ex e somente ao saldo existente naquele momento.
const quantityActions:{asset:string;date:string;numerator?:number;denominator?:number;creditedQuantity?:number;label:string}[]=[
 {asset:'ITSA4',date:'2021-12-20',numerator:105,denominator:100,label:'Bonificação 5%'},
 {asset:'ITSA4',date:'2022-11-14',numerator:110,denominator:100,label:'Bonificação 10%'},
 {asset:'ITSA4',date:'2023-11-27',numerator:105,denominator:100,label:'Bonificação 5%'},
 {asset:'ITSA4',date:'2024-12-02',numerator:105,denominator:100,label:'Bonificação 5%'},
 {asset:'ITSA4',date:'2025-12-18',numerator:102,denominator:100,label:'Bonificação 2%'},
 {asset:'BHIA3',date:'2023-12-28',numerator:1,denominator:25,label:'Grupamento 25:1'},
].sort((a,b)=>a.date.localeCompare(b.date));
// Saldos de custódia confirmados pelo titular prevalecem sobre um histórico documental incompleto.
const confirmedCustodyBalances:Record<string,number>={ITSA4:0};
export function consolidate(notes:Note[]){
 const movements=notes.flatMap(normalizeNote).sort((a,b)=>a.date.localeCompare(b.date));
 const positions=new Map<string,{asset:string;category:string;brokers:Set<string>;quantity:bigint;cost:bigint;realized:bigint;buyQuantity:bigint;sellQuantity:bigint;reliable:boolean;maturity?:string}>();
 const lots=new Map<string,{quantity:bigint;unitCost:bigint;date:string;buyId:string}[]>();
 const realizedByAsset=new Map<string,{gross:number;fees:number;irrf:number;dayTradeQty:number;fifoQty:number;lots:{buyId:string;sellId:string;quantity:number;gross:number;cost:number;dayTrade:boolean}[]}>();
 const issues:{key:string;message:string}[]=[];
 const corporateActions:{asset:string;date:string;label:string;quantity:number;fraction:number}[]=[];
 let actionCursor=0;
 function applyActionsThrough(date:string){while(actionCursor<quantityActions.length&&quantityActions[actionCursor].date<=date){const action=quantityActions[actionCursor++];for(const [key,p] of positions){if(p.asset!==action.asset||p.quantity<=0n)continue;const bucket=lots.get(key)||[];if(action.creditedQuantity){const credited=BigInt(action.creditedQuantity)*SCALE;bucket.push({quantity:credited,unitCost:0n,date:action.date,buyId:`bonus:${action.asset}:${action.date}`});p.quantity+=credited;p.reliable=false;issues.push({key:key+'-'+action.date,message:`${p.asset}: ${action.label} em ${action.date}. Quantidade conciliada; falta informar o custo fiscal atribuído às ações bonificadas.`});continue;}const numerator=BigInt(action.numerator!);const denominator=BigInt(action.denominator!);const oldQuantity=bucket.reduce((sum,lot)=>sum+lot.quantity,0n);const theoretical=oldQuantity*numerator/denominator;const targetQuantity=theoretical/SCALE*SCALE;let allocated=0n;const open=bucket.filter(lot=>lot.quantity>0n);for(let index=0;index<open.length;index++){const lot=open[index];const totalCost=lot.unitCost*lot.quantity;const newQuantity=index===open.length-1?targetQuantity-allocated:oldQuantity?lot.quantity*targetQuantity/oldQuantity:0n;allocated+=newQuantity;lot.quantity=newQuantity;lot.unitCost=lot.quantity?round(totalCost,lot.quantity):lot.unitCost;}p.quantity=targetQuantity;p.cost=bucket.reduce((sum,lot)=>sum+lot.unitCost*lot.quantity,0n);const creditedShares=Number(targetQuantity-oldQuantity)/1e8;const fraction=Number(theoretical-targetQuantity)/1e8;corporateActions.push({asset:p.asset,date:action.date,label:action.label,quantity:creditedShares,fraction});}}}
 for(const note of notes){
  if(note.kind==='treasury')note.original?.forEach((o,i)=>{
   if(!o.reportedNet)return;const movement=normalizeNote(note)[i];const reported=cents(o.reportedNet);const matchesCashFlow=Math.abs(reported-Math.abs(movement.net))<=1;const matchesGross=Math.abs(reported-movement.gross)<=1;
   // Alguns extratos do Tesouro registram o bruto e informam a taxa B3 separadamente.
   // Ambos os formatos conciliam; a valorização por juros não é uma divergência documental.
   if(!matchesCashFlow&&!matchesGross)issues.push({key:note.id+'-net',message:`${note.broker} · protocolo ${note.number}: o valor informado não coincide nem com o bruto nem com o fluxo após taxas. Conferir extrato.`});
  });
 }
 // Preserve the original row sequence within a note. Intraday order is otherwise unknown.
 const sameDay=new Map<string,Set<string>>();
 for(const t of movements){const key=[t.date,t.asset].join('|');const set=sameDay.get(key)||new Set<string>();set.add(t.side);sameDay.set(key,set);}
 for(const [key,sides]of sameDay)if(sides.size>1)issues.push({key,message:`${key.replace('|',' · ')}: compra e venda no mesmo dia. Resultado exige conferência da sequência; não há apuração de day trade.`});
 for(const t of movements){
  applyActionsThrough(t.date);
  const key=[t.category,t.asset,t.maturity||''].join('|');
  const p=positions.get(key)||{asset:t.asset,category:t.category,brokers:new Set<string>(),quantity:0n,cost:0n,realized:0n,buyQuantity:0n,sellQuantity:0n,reliable:true,maturity:t.maturity};
  p.brokers.add(t.broker);
  const q=decimal(t.quantity);
  if(sameDay.get([t.date,t.asset].join('|'))!.size>1)p.reliable=false;
  if(t.side==='buy'){p.quantity+=q;p.buyQuantity+=q;p.cost+=BigInt(t.gross+t.costFees)*SCALE;}
  else{
   if(q>p.quantity){p.reliable=false;issues.push({key:t.id,message:`${t.asset} · ${t.date}: venda/resgate de ${t.quantity} excede o saldo consolidado anterior de ${Number(p.quantity)/1e8}. Conferir transferência ou movimentação faltante.`});}
   const assetKey=key;const bucket=lots.get(assetKey)||[];/* FIFO: the oldest open lot is always consumed first. Same-day lots are still classified as day trade when they are reached. */const ordered=[...bucket];let remaining=q;const realized=realizedByAsset.get(assetKey)||{gross:0,fees:0,irrf:0,dayTradeQty:0,fifoQty:0,lots:[]};const beforeLots=realized.lots.length;
   for(const lot of ordered){if(remaining<=0n)break;if(lot.quantity<=0n)continue;const matched=remaining<lot.quantity?remaining:lot.quantity;const ratio=Number(matched)/Number(q);const dayTrade=lot.date===t.date;const sellGross=t.gross*ratio;const sellFees=t.costFees*ratio;const sellIrrf=t.fees.irrf*ratio;const cost=Number(round(lot.unitCost*matched,SCALE));realized.gross+=sellGross;realized.fees+=sellFees;realized.irrf+=sellIrrf;realized[dayTrade?'dayTradeQty':'fifoQty']+=Number(matched)/1e8;realized.lots.push({buyId:lot.buyId,sellId:t.id,quantity:Number(matched)/1e8,gross:sellGross-cost-sellFees-sellIrrf,cost,dayTrade});lot.quantity-=matched;remaining-=matched;}
   if(remaining>0n){p.reliable=false;issues.push({key:t.id+'-lot',message:`${t.asset} · ${t.date}: ${Number(remaining)/1e8} unidades da venda não têm lote de compra disponível. Conferir transferência ou movimentação faltante.`});}
   realizedByAsset.set(assetKey,realized);p.cost=lots.get(assetKey)?.reduce((s,l)=>s+l.unitCost*l.quantity,0n)||0n;p.realized+=BigInt(Math.round(realized.lots.slice(beforeLots).reduce((s,l)=>s+l.gross,0)))*SCALE;
   p.quantity-=q;p.sellQuantity+=q;
  }
 if(t.side==='buy'){const bucket=lots.get(key)||[];bucket.push({quantity:q,unitCost:BigInt(t.gross+t.costFees)*SCALE/q,date:t.date,buyId:t.id});lots.set(key,bucket);}
 positions.set(key,p);
 }
 const today=new Date().toISOString().slice(0,10);
 applyActionsThrough(today);
 for(const [key,p] of positions){const confirmed=confirmedCustodyBalances[p.asset];if(confirmed===undefined)continue;const expected=BigInt(confirmed)*SCALE;if(p.quantity===expected)continue;const difference=Number(p.quantity-expected)/1e8;p.quantity=expected;p.cost=expected===0n?0n:p.cost;p.reliable=false;if(expected===0n)for(const lot of lots.get(key)||[])lot.quantity=0n;const missing=Math.abs(difference).toLocaleString('pt-BR',{maximumFractionDigits:8});issues.push({key:key+'-custody',message:difference<0?`${p.asset}: custódia atual confirmada em ${confirmed.toLocaleString('pt-BR')} ações. As vendas excedem as entradas e bonificações calculadas em ${missing} ações; falta localizar uma entrada, transferência ou ajuste anterior.`:`${p.asset}: custódia atual confirmada em ${confirmed.toLocaleString('pt-BR')} ações. O histórico calcula ${missing} ações remanescentes; falta localizar a movimentação de saída correspondente.`});}
 for(const [key,p]of positions)if(p.maturity&&p.maturity<today&&p.quantity>0n){p.reliable=false;issues.push({key:key+'-maturity',message:`${p.asset} · ${[...p.brokers].join(' · ')}: há saldo após o vencimento. Conferir resgate ou transferência ausente.`});}
 const positionsOut=[...positions.values()].map(p=>{const r=realizedByAsset.get([p.category,p.asset,p.maturity||''].join('|'));return {asset:p.asset,category:p.category,sector:p.category==='Ação'?(sectorMap[p.asset]||'Outros'):p.category,broker:[...p.brokers].join(', '),custody:null,sourceBrokers:[...p.brokers],brokers:[...p.brokers],quantity:Number(p.quantity)/1e8,buyQuantity:Number(p.buyQuantity)/1e8,sellQuantity:Number(p.sellQuantity)/1e8,cost:p.reliable?Number(round(p.cost,SCALE)):null,average:p.reliable&&p.quantity>0n?Number(p.cost)/Number(p.quantity)/100:null,realized:p.reliable?Number(round(p.realized,SCALE)):null,realizedDetail:r||{gross:0,fees:0,irrf:0,dayTradeQty:0,fifoQty:0,lots:[]},reliable:p.reliable,maturity:p.maturity};});
 const closed=positionsOut.filter(p=>p.quantity===0);
 return {movements,corporateActions,realizedPositions:positionsOut.filter(p=>p.sellQuantity>0),positions:positionsOut.filter(p=>p.quantity>0),closed,issues,totalFees:movements.reduce((s,t)=>s+t.costFees,0),totalIRRF:movements.reduce((s,t)=>s+t.fees.irrf,0)};
}
