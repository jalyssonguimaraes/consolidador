import {supabaseServer} from './supabase/server';
export type ProfileRole='master'|'admin'|'consultor'|'familia';
export async function getProfileRole(userId:string){const db=await supabaseServer();const {data,error}=await db.from('account_profiles').select('role').eq('id',userId).single();if(error)return null;return data.role as ProfileRole;}
