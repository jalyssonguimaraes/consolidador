import {supabaseConfigured,supabaseServer} from '@/lib/supabase/server';
export async function GET(req:Request){
 const url=new URL(req.url);const code=url.searchParams.get('code');
 if(code&&supabaseConfigured()){
  const db=await supabaseServer();const {error}=await db.auth.exchangeCodeForSession(code);
  if(!error)return Response.redirect(new URL('/dashboard',url),303);
 }
 return Response.redirect(new URL('/login?confirmation=failed',url),303);
}
