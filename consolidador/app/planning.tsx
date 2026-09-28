import { planningAreas, type AreaStatus } from '@/lib/planning';

const statusLabel: Record<AreaStatus, string> = { ativo: 'Ativo', parcial: 'Parcial', 'nao-iniciado': 'Não iniciado' };
const statusClass: Record<AreaStatus, string> = { ativo: 'ok', parcial: 'warn', 'nao-iniciado': '' };

export function PlanningView({ investedCost, positions, issues, onOpen }: { investedCost: string; positions: number; issues: number; onOpen: (tab: string) => void }) {
  const live: Record<string, string[]> = {
    'financeiro-etica': [`Patrimônio investido (custo): ${investedCost}`],
    investimentos: [`${positions} posições abertas · ${issues} pendências de conferência`],
  };
  return <div className="planning">
    <section className="surface">
      <p className="eyebrow">PLANEJAMENTO FAMILIAR</p>
      <h2>Estrutura por áreas da certificação CFP®</h2>
      <p className="note">Organiza os dados da família nas seis áreas da certificação (Planejar/FPSB). O sistema reúne dados e indicadores; a recomendação é sempre responsabilidade do planejador. O que ainda não foi coletado aparece como pendente — nada é estimado.</p>
    </section>
    <div className="planning-grid">
      {planningAreas.map(a => <article className="surface planning-card" key={a.id}>
        <div className="planning-head"><h3>{a.title}</h3><span className={'ds-badge ' + statusClass[a.status]}>{statusLabel[a.status]}</span></div>
        <p className="note">{a.purpose}</p>
        {(a.provided.length > 0 || live[a.id]) && <><h4>Já disponível</h4><ul>{[...(live[a.id] || []), ...a.provided].map(x => <li key={x}>{x}</li>)}</ul></>}
        <h4>A coletar</h4><ul className="todo">{a.toCollect.map(x => <li key={x}>{x}</li>)}</ul>
        {a.id === 'investimentos' && <div className="planning-actions"><button className="ds-link" onClick={() => onOpen('carteira')}>Abrir Carteira</button><button className="ds-link" onClick={() => onOpen('conferencia')}>Ver Conferência</button></div>}
      </article>)}
    </div>
  </div>;
}
