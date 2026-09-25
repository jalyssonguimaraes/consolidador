'use client';

import {useEffect, useMemo, useState} from 'react';
import {ArrowUpRight, Building2, Landmark, Layers3, RefreshCw} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Tabs, TabsList, TabsTrigger, TabsContent} from '@/components/ui/tabs';
import {Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription} from '@/components/ui/sheet';
import {Table, TableHeader, TableBody, TableRow, TableHead, TableCell} from '@/components/ui/table';
import type {consolidate, Movement} from '@/lib/ledger';
import type {AssetDetails, AssetEvent} from '@/lib/asset-details';

type Position=ReturnType<typeof consolidate>['positions'][number];
type Quote={asset:string;price:number;at:string;name?:string};
const currency=(value:number|null|undefined)=>value==null?'A conferir':(value/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const units=(value:number)=>value.toLocaleString('pt-BR',{maximumFractionDigits:8});
const date=(value:string|null|undefined)=>value?value.slice(0,10).split('-').reverse().join('/'):'Não informada';
const key=(p:Position)=>`${p.category}:${p.asset}:${p.maturity||''}`;
const groups=[{category:'Ação',title:'Ações',subtitle:'Renda variável · participação em empresas',Icon:Building2},{category:'FII',title:'Fundos imobiliários',subtitle:'Renda variável · cotas de fundos',Icon:Layers3},{category:'Tesouro Direto',title:'Tesouro Direto',subtitle:'Renda fixa · títulos públicos',Icon:Landmark}];
function classification(p:Position){return p.category==='Ação'?(p.sector==='Outros'?'Setor a classificar':p.sector):p.category==='FII'?'Segmento a confirmar':/selic/i.test(p.asset)?'Pós-fixado · Selic':/ipca/i.test(p.asset)?'Inflação · IPCA+':/prefixado/i.test(p.asset)?'Prefixado':'Modalidade a confirmar';}

function Events({events,corporate=false}:{events:AssetEvent[];corporate?:boolean}){
 const [limit,setLimit]=useState(20);
 if(!events.length)return <div className="holding-empty">Nenhum {corporate?'evento societário':'provento'} retornado pela fonte nesta consulta.</div>;
 return <><div className="event-list">{events.slice(0,limit).map((e,i)=><article key={`${e.kind}-${e.paymentDate}-${e.entitlementDate}-${i}`} className="asset-event"><div className="event-heading"><span className="holding-tag">{e.label}</span><strong>{corporate?e.factor||'Fator não informado':e.rate==null?'Valor não informado':`R$ ${e.rate.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:8})} / unidade`}</strong></div><dl className="event-dates"><div><dt>Data-com</dt><dd>{date(e.entitlementDate)}</dd></div><div><dt>{corporate?'Aprovação':'Pagamento informado'}</dt><dd>{date(corporate?e.approvedOn:e.paymentDate)}</dd></div><div><dt>Data ex</dt><dd>{date(e.exDate)}</dd></div></dl></article>)}</div>{events.length>limit&&<Button variant="outline" onClick={()=>setLimit(limit+20)}>Mostrar mais ({events.length-limit})</Button>}</>;
}

export function Holdings({positions,closed,realized,movements,quotes}:{positions:Position[];closed:Position[];realized:Position[];movements:Movement[];quotes:Quote[]}){
 const [search,setSearch]=useState('');
 const [active,setActive]=useState<Position|null>(null);
 const [detail,setDetail]=useState<AssetDetails|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [revision,setRevision]=useState(0);
 const [detailTab,setDetailTab]=useState('proventos');
 const visible=positions.filter(p=>`${p.asset} ${classification(p)}`.toLowerCase().includes(search.toLowerCase()));
 const quoteMap=useMemo(()=>new Map(quotes.map(q=>[q.asset,q])),[quotes]);
 const total=positions.reduce((sum,p)=>sum+(p.cost||0),0);
 const ownMovements=movements.filter(m=>active&&m.asset===active.asset&&m.category===active.category&&(m.maturity||'')===(active.maturity||''));
 useEffect(()=>{
  setDetail(null);setError('');setLoading(false);
  if(!active||active.category==='Tesouro Direto')return;
  const controller=new AbortController();setLoading(true);
  fetch(`/api/asset-details?asset=${encodeURIComponent(active.asset)}`,{signal:controller.signal,cache:revision?'reload':'default'})
   .then(async response=>{const result=await response.json() as AssetDetails & {error?:string};if(!response.ok)throw new Error(result.error||'Não foi possível consultar este ativo.');return result as AssetDetails;})
   .then(setDetail).catch(e=>{if(!controller.signal.aborted)setError(e.message);})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[active,revision]);
 function open(p:Position){setActive(p);setDetailTab(p.category==='Tesouro Direto'?'movimentacoes':'proventos');}
 return <div className="holdings">
  <div className="holdings-heading"><div><h2>Seus ativos</h2><p className="note">Carteira consolidada · renda variável no BTG, conforme informado por você.</p></div><Input aria-label="Buscar na carteira" placeholder="Buscar ativo ou classificação" value={search} onChange={e=>setSearch(e.target.value)} className="search"/></div>
  <p className="holding-caution">Quantidades e custos refletem as movimentações registradas. Eventos societários ainda não conciliados podem alterar esses valores, especialmente em BHIA3. Proventos anunciados não são comprovantes de recebimento.</p>
  {groups.map(({category,title,subtitle,Icon})=>{
   const rows=visible.filter(p=>p.category===category);if(!rows.length)return null;
   const cost=rows.reduce((s,p)=>s+(p.cost||0),0);
   return <section className="holding-group" key={category}><div className="group-heading"><div className="group-title"><span className="group-icon"><Icon size={22}/></span><div><h3>{title}<span>{rows.length} ativos</span></h3><p>{subtitle}</p></div></div><div className="group-total"><small>Custo registrado</small><strong>{currency(cost)}</strong></div></div><div className="holding-list surface"><Table><TableHeader><TableRow>{['Ativo','Classificação','Quantidade','Custo médio','Custo','Mercado','Resultado'].map(s=><TableHead key={s}>{s}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map(p=>{
    const q=quoteMap.get(p.asset);const market=q&&p.reliable?p.quantity*q.price*100:null;const change=market!=null&&p.cost!=null?market-p.cost:null;
    return <TableRow key={key(p)} className="holding-row" onClick={()=>open(p)}><TableCell><b>{p.asset}</b><small>{q?.name&&q.name!==p.asset?q.name:'Abrir detalhes'}</small></TableCell><TableCell><span className="holding-tag">{classification(p)}</span></TableCell><TableCell className="numeric">{units(p.quantity)}</TableCell><TableCell className="numeric">{currency(p.average==null?null:p.average*100)}</TableCell><TableCell className="numeric">{currency(p.cost)}</TableCell><TableCell className="numeric">{market==null?'Sem cotação':<><b>{currency(market)}</b><small>{q?date(q.at):''}</small></>}</TableCell><TableCell className={'numeric '+(change==null?'':change<0?'negative':'positive')}>{change==null?'—':currency(change)}<small>{total&&p.cost!=null?(100*p.cost/total).toLocaleString('pt-BR',{maximumFractionDigits:1})+'% do custo':''}</small></TableCell></TableRow>;
   })}</TableBody></Table></div></section>;
  })}
  {!visible.length&&<p className="holding-empty">Nenhuma posição encontrada nesta seleção.</p>}
  {realized.length>0&&<section className="surface closed-holdings"><h3>Vendas apuradas</h3><p className="note">Toda venda gera resultado realizado por FIFO, mesmo quando ainda existe saldo do ativo. Posições zeradas aparecem junto com vendas parciais.</p><div className="closed-list"><Table><TableHeader><TableRow>{['Ativo','Classe','Quantidade vendida','Venda bruta','Custo dos lotes','Taxas','IRRF','Resultado líquido'].map(s=><TableHead key={s}>{s}</TableHead>)}</TableRow></TableHeader><TableBody>{realized.filter(p=>(p.sellQuantity||0)>0).map(p=>{const d=p.realizedDetail;const cost=(d?.lots||[]).reduce((s,l)=>s+(l.cost||0),0);const net=(d?.gross||0)-cost-(d?.fees||0)-(d?.irrf||0);return <TableRow key={key(p)} className="holding-row" onClick={()=>open(p)}><TableCell><b>{p.asset}</b><small>{p.quantity===0?'Posição zerada':'Venda parcial · ver lotes'}</small></TableCell><TableCell>{p.category}</TableCell><TableCell className="numeric">{units(p.sellQuantity||0)}</TableCell><TableCell className="numeric">{currency(d?.gross||0)}</TableCell><TableCell className="numeric">{currency(cost)}</TableCell><TableCell className="numeric">{currency(d?.fees||0)}</TableCell><TableCell className="numeric">{currency(d?.irrf||0)}</TableCell><TableCell className={'numeric '+(net<0?'negative':'positive')}>{currency(net)}</TableCell></TableRow>})}</TableBody></Table></div></section>}
  <Sheet open={!!active} onOpenChange={open=>{if(!open)setActive(null);}}><SheetContent className="asset-sheet"><SheetHeader><SheetTitle>{active?.asset}</SheetTitle><SheetDescription>{active?.category} · {active?classification(active):''}</SheetDescription></SheetHeader>{active&&<div className="asset-sheet-body">
    <div className="asset-summary"><div><span>Quantidade registrada</span><strong>{units(active.quantity)}</strong></div><div><span>Custo registrado</span><strong>{currency(active.cost)}</strong></div></div>
    <Tabs value={detailTab} onValueChange={setDetailTab}><TabsList className="asset-tabs"><TabsTrigger value="proventos">Proventos</TabsTrigger><TabsTrigger value="eventos">Eventos</TabsTrigger><TabsTrigger value="movimentacoes">Movimentações</TabsTrigger></TabsList>
    {active.category!=='Tesouro Direto'&&<div className="source-status"><span>{loading?'Consultando Brapi…':detail?`Fonte: Brapi · consulta em ${date(detail.fetchedAt)}`:'Dados de mercado por ativo'}</span><Button aria-label="Reconsultar eventos" size="sm" variant="ghost" disabled={loading} onClick={()=>setRevision(v=>v+1)}><RefreshCw size={15}/></Button></div>}
    {error&&<p role="alert" className="notice error">{error}</p>}{detail?.messages.map(m=><p className="notice" key={m}>{m}</p>)}
    <TabsContent value="proventos"><h3>Dividendos, JCP e rendimentos</h3><p className="note">Valores por unidade divulgados pela fonte; não somados ao seu resultado. A posição na data-com e o crédito em conta precisam ser conciliados. Valores históricos podem estar ajustados pela fonte.</p>{active.category==='Tesouro Direto'?<p className="holding-empty">Dividendos de ações e rendimentos de FIIs não se aplicam a este título. Juros, cupons e resgates exigem o extrato do Tesouro.</p>:loading?<p role="status">Carregando proventos…</p>:detail?.eventsAvailable?<Events events={detail.events.filter(e=>e.kind==='cash')}/>:<p className="holding-empty">Proventos indisponíveis nesta consulta.</p>}</TabsContent>
    <TabsContent value="eventos"><h3>Eventos e perfil do ativo</h3>{detail?.sector&&<p className="note">Setor Brapi: {detail.sector} · {detail.industry}</p>}{detail?.description&&<details className="asset-profile"><summary>Sobre a empresa</summary><p>{detail.description}</p></details>}<p className="note">Bonificações, grupamentos, desdobramentos e subscrições retornados pela fonte. Exibição informativa: os eventos não alteram automaticamente as quantidades ou o custo. Notícias e fatos relevantes não estão incluídos nesta integração.</p>{active.category==='Tesouro Direto'?<p className="holding-empty">Vencimento registrado: {date(active.maturity)}. Confira os demais acontecimentos no extrato.</p>:active.category==='FII'?<p className="holding-empty">A consulta de FIIs disponibiliza rendimentos. Eventos societários e classificação de segmento ainda precisam de outra fonte.</p>:loading?<p role="status">Carregando eventos…</p>:detail?.eventsAvailable?<Events corporate events={detail.events.filter(e=>e.kind!=='cash')}/>:<p className="holding-empty">Eventos indisponíveis nesta consulta.</p>}</TabsContent>
    <TabsContent value="movimentacoes"><h3>Histórico do ativo</h3><p className="note">Compras e vendas em ordem cronológica. Taxas rateadas por documento.</p><Table><TableHeader><TableRow>{['Data','Operação','Quantidade','Preço','Taxas'].map(s=><TableHead key={s}>{s}</TableHead>)}</TableRow></TableHeader><TableBody>{ownMovements.map(m=><TableRow key={m.id}><TableCell>{date(m.date)}<small>Nota {m.number}</small></TableCell><TableCell>{m.side==='buy'?'Compra':'Venda'}</TableCell><TableCell>{units(Number(m.quantity))}</TableCell><TableCell>{currency(Number(m.price)*100)}</TableCell><TableCell>{currency(m.costFees)}</TableCell></TableRow>)}</TableBody></Table></TabsContent>
    </Tabs>
  </div>}</SheetContent></Sheet>
 </div>;
}
