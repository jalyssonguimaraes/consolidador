import {getChatGPTUser} from '@/app/chatgpt-auth';
import {database,listNotes} from '@/db/store';
import {env} from 'cloudflare:workers';
import {consolidate} from '@/lib/ledger';
export const dynamic='force-dynamic';
export async function POST(req:Request){
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Entre para atualizar cotações.'},{status:401});
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Origem não permitida.'},{status:403});
 const token=env.BRAPI_API_KEY;if(!token)return Response.json({error:'A conexão está preparada. Falta configurar a chave BRAPI_API_KEY no servidor para consultar seus ativos. Nenhum preço foi estimado.'},{status:503});
 try{
  const body=await req.json().catch(()=>({})) as {force?:boolean};
  const notes=await listNotes(user.userId);const positions=consolidate(notes).positions.filter(p=>p.quantity>0);
  const assets=[...new Map(positions.map(p=>[p.asset,p])).values()];let updated=0;
  const recent=await database().prepare('SELECT updated FROM quotes WHERE owner=? ORDER BY updated DESC LIMIT 1').bind(user.userId).first<{updated:string}>();
  if(!body.force&&recent&&Date.now()-Date.parse(recent.updated)<15*60*1000)return Response.json({message:`Cotações preservadas do banco. Última atualização: ${new Date(recent.updated).toLocaleString('pt-BR')}. Use o botão para atualizar novamente.`});
  const failed:string[]=[];
  for(let index=0;index<assets.length;index+=2){
   const batch=assets.slice(index,index+2);
   await Promise.all(batch.map(async p=>{
   const treasury=p.category==='Tesouro Direto';
   const symbol=treasury&&p.maturity?p.asset.replace(/\s+\d{4}$/,'').toLowerCase().replaceAll(' ','-')+'-'+p.maturity.split('-').reverse().join(''):p.asset;
   try{
    const r=await fetch(`https://brapi.dev/api/v2/${treasury?'treasury/indicators':'stocks/quote'}?symbols=${encodeURIComponent(symbol)}`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(10000)});
    if(!r.ok){failed.push(p.asset);return;}
    const j=await r.json() as {results?:Array<Record<string,unknown>>};const item=j.results?.[0];const v=treasury?item:item?.data as Record<string,unknown>|undefined;
    const price=Number(treasury?v?.sellPrice:v?.regularMarketPrice);const at=String(treasury?v?.baseDate:v?.regularMarketTime);
    if(!Number.isFinite(price)||price<=0||Number.isNaN(Date.parse(at))||(!treasury&&item?.changed===true)){failed.push(p.asset);return;}
    const payload={asset:p.asset,price,at,name:v?.longName||v?.shortName||p.asset,symbol};
    await database().prepare('INSERT INTO quotes(id,owner,payload,updated) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=json_patch(quotes.payload,excluded.payload),updated=excluded.updated').bind(user.userId+':'+p.asset,user.userId,JSON.stringify(payload),new Date().toISOString()).run();updated++;
   }catch{failed.push(p.asset);}
  }));
  }
  return Response.json({message:`${updated} cotações atualizadas.${failed.length?' Sem atualização para: '+failed.join(', ')+'. Confira cobertura do plano e mudanças de ticker. Valores anteriores foram preservados.':''}`});
 }catch(e){console.error('market',e);return Response.json({error:'Não foi possível atualizar as cotações. Tente novamente.'},{status:503});}
}
