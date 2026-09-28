import { z } from 'zod';
import { decimal, normalizeNote, type Note } from './ledger';
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(x=>!Number.isNaN(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x,'Data inválida');
const money=z.string().regex(/^\d{1,10}(\.\d{1,2})?$/);
const positive=z.string().regex(/^\d{1,10}(\.\d{1,8})?$/).refine(x=>decimal(x)>0n,'O valor deve ser maior que zero');
export const noteSchema=z.object({id:z.string().min(1).max(100),number:z.string().trim().min(1).max(60),broker:z.string().trim().min(1).max(60),date,kind:z.enum(['variable','treasury']),fees:z.object({settlement:money,exchange:money,brokerage:money,iss:money,irrf:money}),trades:z.array(z.object({asset:z.string().trim().min(1).max(100),category:z.enum(['Ação','FII','Tesouro Direto']),side:z.enum(['buy','sell']),quantity:positive,price:positive,maturity:date.optional()})).min(1).max(100),version:z.number().int().min(1).optional()}).superRefine((n,c)=>{
 for(const t of n.trades){if((t.category==='Tesouro Direto')!==(n.kind==='treasury'))c.addIssue({code:'custom',message:'Separe Tesouro Direto de ações e FIIs.'});if(t.category==='Tesouro Direto'&&!t.maturity)c.addIssue({code:'custom',message:'Informe o vencimento do título.'});if(t.category!=='Tesouro Direto'&&!/^[A-Z0-9]{4,12}$/.test(t.asset))c.addIssue({code:'custom',message:'Ticker inválido.'});}
 try{normalizeNote(n as Note);}catch(e){c.addIssue({code:'custom',message:(e as Error).message});}
});
