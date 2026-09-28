import { env } from 'cloudflare:workers';
import type { Note } from '@/lib/ledger';
export function database(){if(!env.DB)throw new Error('Banco de dados indisponível. Tente novamente.');return env.DB;}
export async function listNotes(owner:string):Promise<Note[]>{const rows=await database().prepare('SELECT payload,version FROM notes WHERE owner=? ORDER BY date,id').bind(owner).all<{payload:string;version:number}>();return rows.results.map(r=>({...JSON.parse(r.payload),version:r.version}));}
