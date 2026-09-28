// Modelo de dados do Planejamento Financeiro Familiar (rascunho tipado, ainda sem persistência).
// Estrutura por áreas da certificação CFP® (Planejar/FPSB). Nada aqui calcula recomendação:
// o sistema organiza dados e indicadores; a recomendação é responsabilidade do planejador.

export type PlanningAreaId = 'financeiro-etica' | 'investimentos' | 'aposentadoria' | 'riscos-seguros' | 'fiscal' | 'sucessorio';

export type AreaStatus = 'ativo' | 'parcial' | 'nao-iniciado';

export type PlanningArea = {
  id: PlanningAreaId;
  title: string;
  purpose: string;
  /** O que o sistema já entrega hoje para esta área (só o que existe de fato). */
  provided: string[];
  /** Dados que ainda precisam ser coletados/cadastrados (proposta, a validar com o planejador). */
  toCollect: string[];
  status: AreaStatus;
};

export const planningAreas: PlanningArea[] = [
  { id: 'financeiro-etica', title: 'Planejamento Financeiro e Ética',
    purpose: 'Diagnóstico da família: patrimônio, dívidas, fluxo de caixa e objetivos.',
    provided: ['Patrimônio investido (custo) consolidado'],
    toCollect: ['Membros da família e dependentes', 'Objetivos e prazos', 'Receitas e despesas (orçamento)', 'Passivos e dívidas', 'Reserva de emergência', 'Bens não financeiros (imóveis, veículos)'],
    status: 'parcial' },
  { id: 'investimentos', title: 'Gestão de Investimentos',
    purpose: 'Carteira, alocação, risco, concentração e desempenho frente aos objetivos.',
    provided: ['Posição, preço médio e custo por ativo', 'Alocação por classe e setor', 'Resultado realizado (FIFO)', 'Eventos corporativos e conferência de pendências'],
    toCollect: ['Perfil de risco do investidor', 'Alocação-alvo e rebalanceamento', 'Rentabilidade × benchmarks', 'Proventos recebidos'],
    status: 'ativo' },
  { id: 'aposentadoria', title: 'Planejamento da Aposentadoria',
    purpose: 'Capital necessário e trajetória para manter o padrão de vida desejado.',
    provided: [],
    toCollect: ['Idade atual e idade-alvo', 'Renda desejada na aposentadoria', 'Previdência (INSS/privada) e saldos', 'Premissas: inflação e retorno real'],
    status: 'nao-iniciado' },
  { id: 'riscos-seguros', title: 'Gestão de Riscos e Seguros',
    purpose: 'Proteção do patrimônio e da renda da família contra eventos adversos.',
    provided: [],
    toCollect: ['Apólices (vida, invalidez, saúde, patrimonial)', 'Coberturas, prêmios e vigências', 'Dependentes e renda a proteger'],
    status: 'nao-iniciado' },
  { id: 'fiscal', title: 'Planejamento Fiscal',
    purpose: 'Eficiência tributária de rendimentos, ganhos e sucessão.',
    provided: ['IRRF e taxas registrados por operação (não é apuração fiscal)'],
    toCollect: ['Regime de declaração', 'Rendimentos tributáveis e isentos', 'Compensação de prejuízos', 'Previdência e deduções'],
    status: 'nao-iniciado' },
  { id: 'sucessorio', title: 'Planejamento Sucessório',
    purpose: 'Transmissão organizada do patrimônio, com custo e conflito mínimos.',
    provided: [],
    toCollect: ['Herdeiros e regime de bens', 'Estrutura patrimonial (titularidade)', 'Testamento/holding/previdência', 'Documentos vinculados'],
    status: 'nao-iniciado' },
];
