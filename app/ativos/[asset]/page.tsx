import {notFound,redirect} from 'next/navigation';
import {getUser} from '@/lib/auth';
import {readNotes,readCache,readCashEvents} from '@/db/repository';
import {consolidate} from '@/lib/ledger';
import {AssetPage} from '@/app/asset-page';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{asset:string}>}){const user=await getUser();if(!user)redirect('/login');const asset=decodeURIComponent((await params).asset).toUpperCase();if(!/^[A-Z0-9 +.-]{2,60}$/.test(asset))notFound();const [notes,quotes,cashEvents]=await Promise.all([readNotes(user.userId),readCache(user.userId,'quote'),readCashEvents(user.userId)]);const ledger=consolidate(notes),position=[...ledger.positions,...ledger.realizedPositions,...ledger.closed].find(p=>p.asset.toUpperCase()===asset);if(!position)notFound();return <AssetPage asset={position.asset} position={position} movements={ledger.movements.filter(m=>m.asset===position.asset)} actions={ledger.corporateActions.filter(a=>a.asset===position.asset)} cashEvents={cashEvents.filter(e=>e.asset===position.asset)} quote={quotes.find(q=>q.asset===position.asset)}/>;}
