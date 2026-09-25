import PortfolioApp from './portfolio';
import { getChatGPTUser, chatGPTSignInPath } from './chatgpt-auth';
export const dynamic = 'force-dynamic';
export default async function Home() {
 const user = await getChatGPTUser(); if(user) return <PortfolioApp name={user.displayName}/>;
 return <main className="workspace"><header><b>Í / INVESTIMENTOS</b><span>Consolidador pessoal</span></header><section className="intro"><p>CARTEIRA CONSOLIDADA</p><h1>Seu histórico.<br/>Uma visão completa.</h1><p>Ações, fundos imobiliários e Tesouro Direto, reunidos por ativo e corretora.</p></section><section className="surface"><h2>{user ? 'Preparação da carteira' : 'Acesse sua carteira'}</h2><p>Movimentações preservadas, taxas proporcionais e conferência de saldos.</p>{!user && <a className="primary" href={chatGPTSignInPath('/')} target="_top">Entrar com ChatGPT</a>}<div className="metrics"><div><strong>112</strong><span>Movimentações de ações e FIIs na fonte</span></div><div><strong>28</strong><span>Movimentações de Tesouro Direto na fonte</span></div><div><strong>4</strong><span>Corretoras na fonte</span></div></div><p className="note">A importação será acompanhada de uma conferência. Saldos com movimentações faltantes não serão apresentados como posições confirmadas.</p></section></main>
}
