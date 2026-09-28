import {getUser} from '@/lib/auth';
import {brapiGet,marketFailure,marketJson} from '@/lib/brapi';
export const dynamic='force-dynamic';

const routes=new Set([
 'quote/list',
 'v2/stocks/quote','v2/stocks/historical','v2/stocks/dividends','v2/stocks/profile','v2/stocks/statistics','v2/stocks/financial-data','v2/stocks/balance-sheet','v2/stocks/income-statement','v2/stocks/cash-flow','v2/stocks/value-added',
 'v2/tickers','v2/tickers/renames','v2/tickers/resolve','v2/tickers/coverage','v2/dictionary',
 'v2/crypto','v2/currency','v2/currency/historical','v2/inflation','v2/prime-rate','v2/macro',
 'v2/fii/list','v2/fii/indicators','v2/fii/indicators/history','v2/fii/historical','v2/fii/properties','v2/fii/properties/history','v2/fii/portfolio','v2/fii/portfolio/history','v2/fii/reports','v2/fii/dividends','v2/fii/financials','v2/fii/annual-reports',
 'v2/funds/list','v2/funds/indicators','v2/funds/nav/history','v2/funds/profile','v2/funds/dividends','v2/funds/portfolio','v2/funds/fiagro/reports','v2/funds/fiagro/portfolio','v2/funds/fidc/reports','v2/funds/fidc/portfolio','v2/funds/fip/reports',
 'v2/options/expirations','v2/options/strikes','v2/options/chain','v2/options/historical','v2/options/analytics','v2/options/analytics/history','v2/options/positions','v2/options/positions/history',
 'v2/treasury/list','v2/treasury/indicators','v2/treasury/indicators/history',
 'v2/futures/list','v2/futures/quote','v2/futures/specs','v2/futures/historical','v2/futures/term-structure',
 'v2/futures/options/expirations','v2/futures/options/strikes','v2/futures/options/chain','v2/futures/options/historical','v2/futures/options/analytics','v2/futures/options/analytics/history','v2/futures/options/positions','v2/futures/options/positions/history',
]);
function allowed(path:string){return routes.has(path)||/^quote\/[A-Z0-9.^-]{1,20}$/i.test(path);}
export async function GET(request:Request,context:{params:Promise<{path:string[]}>}){
 if(!await getUser())return marketJson({error:'Entre para consultar dados de mercado.'},401);
 try{const path=(await context.params).path.join('/');if(!allowed(path))return marketJson({error:'Rota BRAPI não autorizada pelo aplicativo.'},404);const params=Object.fromEntries(new URL(request.url).searchParams.entries());const data=await brapiGet(`/api/${path}`,params);return marketJson({provider:'BRAPI',endpoint:`/api/${path}`,data});}catch(error){return marketFailure(error);}
}
