import {getChatGPTUser} from '@/app/chatgpt-auth';
import {supabaseConfigured,supabaseServer} from './supabase/server';
export async function getUser(){
 if(!supabaseConfigured())return getChatGPTUser();
 const client=await supabaseServer();const {data:{user},error}=await client.auth.getUser();
 if(error||!user)return null;
 return {userId:user.id,email:user.email||'',displayName:user.user_metadata?.full_name||user.email||'Investidor',fullName:null};
}
