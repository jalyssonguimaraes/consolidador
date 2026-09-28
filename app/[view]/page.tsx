import {notFound,redirect} from 'next/navigation';
import {getUser} from '@/lib/auth';
import PortfolioApp from '../portfolio';
export const dynamic='force-dynamic';
export default async function PortfolioPage({params}:{params:Promise<{view:string}>}){
 const {view}=await params;if(!['dashboard','movimentacoes','conferencia'].includes(view))notFound();
 const user=await getUser();if(!user)redirect('/login');return <PortfolioApp key={view} name={user.displayName} initialView={view}/>;
}
