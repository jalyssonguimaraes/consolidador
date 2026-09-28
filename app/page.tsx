import PortfolioApp from './portfolio';
import {getUser} from '@/lib/auth';
import {redirect} from 'next/navigation';
import {getProfileRole} from '@/lib/profile';
export const dynamic = 'force-dynamic';
export default async function Home() {
 const user = await getUser(); if(user){const role=await getProfileRole(user.userId);if(role&&role!=='familia')redirect('/'+role);return <PortfolioApp name={user.displayName}/>;}
 redirect('/login');

}
