'use client';
import {Pie,PieChart,Cell,Tooltip} from 'recharts';
import {ChartContainer} from '@/components/ui/chart';
const colors=['#2563eb','#0d9488','#7c3aed','#d97706','#db2777','#64748b'];
const money=(n:number)=>(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function Distribution({title,description,items}:{title:string;description:string;items:[string,number][]}){
 const data=items.filter(([,v])=>v>0).map(([name,value],i)=>({name,value,fill:colors[i%colors.length]}));
 const total=data.reduce((s,p)=>s+p.value,0);
 return <section className="surface chart-card"><h2>{title}</h2><p className="note">{description}</p>{!total?<p className="chart-empty">Sem posições apuráveis nesta seleção.</p>:<><ChartContainer config={{value:{label:'Custo',color:colors[0]}}} className="allocation-donut"><PieChart accessibilityLayer><Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="85%" paddingAngle={3}>{data.map(p=><Cell key={p.name} fill={p.fill}/>)}</Pie><Tooltip formatter={v=>money(Number(v))}/></PieChart></ChartContainer><ul className="allocation-legend">{data.map(p=><li key={p.name}><span><i style={{background:p.fill}}/>{p.name}</span><strong>{(100*p.value/total).toLocaleString('pt-BR',{maximumFractionDigits:1})}%</strong><span>{money(p.value)}</span></li>)}</ul></>}</section>;
}
export function AllocationCharts({allocation,sectors}:{allocation:[string,number][];sectors:[string,number][]}){
 return <section className="charts-grid"><Distribution title="Distribuição da carteira" description="Custo histórico com taxas das posições abertas e apuráveis." items={allocation}/><Distribution title="Setores das ações" description="Percentuais sobre o custo das ações. Classificação manual por ticker; Outros inclui ativos não classificados." items={sectors}/></section>;
}
