import {env} from 'cloudflare:workers';

export class BrapiError extends Error{constructor(message:string,public status:number){super(message);}}
export const isoDate=/^\d{4}-\d{2}-\d{2}$/;
export function brapiToken(){const token=env.BRAPI_API_KEY;if(!token)throw new BrapiError('A credencial BRAPI não está configurada.',503);return token;}
export async function brapiGet(path:string,params:Record<string,string|number|undefined>){
 const url=new URL(path,'https://brapi.dev');for(const [key,value] of Object.entries(params))if(value!==undefined)url.searchParams.set(key,String(value));
 const response=await fetch(url,{headers:{Authorization:`Bearer ${brapiToken()}`},signal:AbortSignal.timeout(20000)});
 if(!response.ok){const detail=await response.json().catch(()=>null) as {message?:string;error?:string}|null;const reason=response.status===403?'Seu plano BRAPI não inclui este conjunto de dados.':response.status===401?'A credencial BRAPI foi recusada.':response.status===429?'O limite de chamadas da BRAPI foi atingido.':detail?.message||detail?.error||`BRAPI respondeu HTTP ${response.status}.`;throw new BrapiError(reason,response.status);}
 return response.json() as Promise<Record<string,unknown>>;
}
export function rangeFrom(request:Request){const url=new URL(request.url),start=url.searchParams.get('start')||new Date(Date.now()-365*86400000).toISOString().slice(0,10),end=url.searchParams.get('end')||new Date().toISOString().slice(0,10);if(!isoDate.test(start)||!isoDate.test(end)||start>end)throw new BrapiError('Período inválido.',400);return {url,start,end};}
export function marketJson(body:unknown,status=200){return Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});}
export function marketFailure(error:unknown){if(error instanceof BrapiError)return marketJson({error:error.message,provider:'BRAPI'},error.status);console.error('market-data-failed',error);return marketJson({error:'Falha ao consultar o provedor de mercado.',provider:'BRAPI'},502);}
