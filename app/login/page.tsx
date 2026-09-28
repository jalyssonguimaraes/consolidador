import Link from 'next/link';
import {supabaseConfigured} from '@/lib/supabase/server';
import {LoginForm} from './login-form';
export const dynamic='force-dynamic';
export default function LoginPage(){return <main className="login-page"><section className="login-story"><Link href="/" className="login-brand">SAGRADO<span>CAPITAL</span></Link><div><p className="eyebrow">PATRIMÔNIO COM PERSPECTIVA</p><h1>Menos ruído.<br/>Mais clareza<br/>sobre seu dinheiro.</h1><p>Uma visão organizada de ativos, resultados e do que precisa da sua atenção.</p></div><div className="login-principles"><span>01 · Entenda sua carteira</span><span>02 · Confira seu histórico</span><span>03 · Acompanhe com contexto</span></div></section><LoginForm configured={supabaseConfigured()}/></main>;}
