import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database, listNotes } from '@/db/store';
import { env } from 'cloudflare:workers';
import { parseEvents, parseProfile, type AssetDetails } from '@/lib/asset-details';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({error:'Entre para consultar os ativos.'},{status:401});
  const asset = new URL(req.url).searchParams.get('asset') || '';
  if (!/^[A-Z0-9]{4,12}$/.test(asset)) return Response.json({error:'Ticker inválido.'},{status:400});
  const notes = await listNotes(user.userId);
  const trade = notes.flatMap(n=>n.trades).find(t=>t.asset===asset && t.category!=='Tesouro Direto');
  if (!trade) return Response.json({error:'Ativo não encontrado no seu histórico.'},{status:404});
  if (!env.BRAPI_API_KEY) return Response.json({error:'Chave Brapi não configurada no servidor.'},{status:503});
  const params = new URL(req.url).searchParams;
  const force = params.get('refresh') === '1';
  const cacheId = `${user.userId}:${asset}:details`;
  const saved = await database().prepare('SELECT payload FROM quotes WHERE owner=? AND id=?').bind(user.userId,cacheId).first<{payload:string}>();
  const cached = saved ? JSON.parse(saved.payload) as AssetDetails : undefined;
  if(!force && cached?.eventsAvailable && Date.now()-Date.parse(cached.fetchedAt)<30*60*1000) return Response.json(cached,{headers:{'Cache-Control':'private, max-age=300'}});
  const result: AssetDetails = {asset,fetchedAt:new Date().toISOString(),sector:null,industry:null,description:null,events:[],eventsAvailable:false,messages:[]};
  const fii = trade.category==='FII';
  async function read(path: string) {
    const response=await fetch(`https://brapi.dev/api/v2/${path}?symbols=${encodeURIComponent(asset)}`,{
      headers:{Authorization:`Bearer ${env.BRAPI_API_KEY}`},signal:AbortSignal.timeout(15000),
    });
    if(!response.ok) throw new Error(response.status===403?'Acesso negado pela Brapi (403). Confira a cobertura da chave/plano.':response.status===429?'Limite de consultas da Brapi atingido. Tente mais tarde.':`Consulta indisponível na Brapi (HTTP ${response.status}).`);
    return response.json();
  }
  await Promise.all([
    read(fii?'fii/dividends':'stocks/dividends').then(p=>{result.events=parseEvents(p,asset,fii);result.eventsAvailable=true;}).catch(e=>result.messages.push('Proventos e eventos: '+(e instanceof Error?e.message:'Falha de conexão.'))),
    ...(fii?[]:[read('stocks/profile').then(p=>Object.assign(result,parseProfile(p,asset))).catch(e=>result.messages.push('Perfil: '+(e instanceof Error?e.message:'Falha de conexão.')))]),
  ]);
  if(!result.eventsAvailable && cached?.eventsAvailable){ result.events=cached.events; result.eventsAvailable=true; result.messages.push('A última consulta falhou. Eventos preservados da consulta de '+cached.fetchedAt.slice(0,10)+'.'); result.fetchedAt=cached.fetchedAt; }
  if(result.eventsAvailable) await database().prepare('INSERT INTO quotes(id,owner,payload,updated) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated=excluded.updated').bind(cacheId,user.userId,JSON.stringify(result),new Date().toISOString()).run();
  return Response.json(result,{headers:{'Cache-Control':'private, max-age=300'}});
}
