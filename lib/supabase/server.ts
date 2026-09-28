import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {env} from 'cloudflare:workers';
export function supabaseConfigured(){return !!(env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY);}
export async function supabaseServer(){
 const jar=await cookies();
 if(!supabaseConfigured())throw new Error('Supabase ainda não configurado.');
 return createServerClient(env.SUPABASE_URL!,env.SUPABASE_PUBLISHABLE_KEY!,{cookies:{getAll:()=>jar.getAll(),setAll:values=>{try{values.forEach(({name,value,options})=>jar.set(name,value,options));}catch{/* Server components cannot write cookies; route handlers refresh sessions. */}}}});
}
