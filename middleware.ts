import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
import {env} from 'cloudflare:workers';
export async function middleware(request:NextRequest){
 let response=NextResponse.next({request});
 if(!env.SUPABASE_URL||!env.SUPABASE_PUBLISHABLE_KEY)return response;
 const client=createServerClient(env.SUPABASE_URL,env.SUPABASE_PUBLISHABLE_KEY,{cookies:{
  getAll:()=>request.cookies.getAll(),
  setAll:(values,headers)=>{
   values.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});
   values.forEach(({name,value,options})=>response.cookies.set(name,value,options));
   Object.entries(headers).forEach(([name,value])=>response.headers.set(name,value));
  },
 }});
 await client.auth.getUser();
 response.headers.set('Cache-Control','private, no-store');
 return response;
}
export const config={matcher:['/','/master','/admin','/consultor','/familia','/dashboard','/carteira','/analise','/movimentacoes','/conferencia','/gestao','/cadastro','/login','/api/:path*','/auth/:path*']};
