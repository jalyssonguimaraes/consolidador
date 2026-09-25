// Classificação de ativos usada apenas para agrupamento e análise.
// Não altera nenhuma movimentação, custo ou resultado: é só rótulo.
// Cobertura parcial e best-effort — tickers fora do mapa caem em "Outros"
// e ficam visíveis como tal, em vez de forçar uma classificação incorreta.

export type AssetClass = 'Ação' | 'FII' | 'Tesouro Direto';

// Setor B3 por ticker (ações). Lista deliberadamente não-exaustiva: cobre os
// papéis mais líquidos/comuns. Adicionar aqui não afeta cálculo algum.
const stockSector: Record<string, string> = {
  // Financeiro
  ITSA4: 'Financeiro', ITUB3: 'Financeiro', ITUB4: 'Financeiro', BBDC3: 'Financeiro', BBDC4: 'Financeiro',
  BBAS3: 'Financeiro', SANB11: 'Financeiro', BPAC11: 'Financeiro', BPAN4: 'Financeiro', BIDI4: 'Financeiro',
  BIDI11: 'Financeiro', ABCB4: 'Financeiro', BRSR6: 'Financeiro', PINE4: 'Financeiro',
  // Seguros e previdência
  BBSE3: 'Seguros', PSSA3: 'Seguros', SULA11: 'Seguros', CXSE3: 'Seguros',
  // Bolsa / serviços financeiros
  B3SA3: 'Serviços financeiros', XPBR31: 'Serviços financeiros',
  // Petróleo, gás e combustíveis
  PETR3: 'Petróleo e gás', PETR4: 'Petróleo e gás', PRIO3: 'Petróleo e gás', RRRP3: 'Petróleo e gás',
  UGPA3: 'Petróleo e gás', VBBR3: 'Petróleo e gás', CSAN3: 'Petróleo e gás', RECV3: 'Petróleo e gás',
  // Mineração e siderurgia
  VALE3: 'Mineração', CSNA3: 'Siderurgia e metalurgia', GGBR4: 'Siderurgia e metalurgia',
  GOAU4: 'Siderurgia e metalurgia', USIM5: 'Siderurgia e metalurgia', CMIN3: 'Mineração',
  // Energia elétrica e saneamento
  CMIG4: 'Energia elétrica', CPFE3: 'Energia elétrica', CPLE3: 'Energia elétrica', CPLE6: 'Energia elétrica',
  ELET3: 'Energia elétrica', ELET6: 'Energia elétrica', EGIE3: 'Energia elétrica', EQTL3: 'Energia elétrica',
  ENGI11: 'Energia elétrica', TAEE11: 'Energia elétrica', AURE3: 'Energia elétrica', NEOE3: 'Energia elétrica',
  SBSP3: 'Saneamento', SAPR11: 'Saneamento', CSMG3: 'Saneamento',
  // Telecom e tecnologia
  VIVT3: 'Telecomunicações', TIMS3: 'Telecomunicações', TOTS3: 'Tecnologia', LWSA3: 'Tecnologia',
  POSI3: 'Tecnologia', CASH3: 'Tecnologia',
  // Varejo e consumo
  BHIA3: 'Varejo', MGLU3: 'Varejo', LREN3: 'Varejo', AMER3: 'Varejo', PETZ3: 'Varejo',
  ARZZ3: 'Varejo', SOMA3: 'Varejo', CEAB3: 'Varejo', VIVA3: 'Varejo', ASAI3: 'Varejo',
  CRFB3: 'Varejo', PCAR3: 'Varejo', RADL3: 'Varejo', NTCO3: 'Consumo', ABEV3: 'Bebidas',
  // Alimentos
  BEEF3: 'Alimentos', JBSS3: 'Alimentos', MRFG3: 'Alimentos', BRFS3: 'Alimentos', SMTO3: 'Alimentos',
  // Papel, celulose e agro
  SUZB3: 'Papel e celulose', KLBN11: 'Papel e celulose', SLCE3: 'Agronegócio', AGRO3: 'Agronegócio',
  // Saúde e educação
  RDOR3: 'Saúde', HAPV3: 'Saúde', FLRY3: 'Saúde', QUAL3: 'Saúde', HYPE3: 'Saúde',
  COGN3: 'Educação', YDUQ3: 'Educação', SEER3: 'Educação',
  // Transporte, logística e construção
  RAIL3: 'Logística', RENT3: 'Locação de veículos', CCRO3: 'Infraestrutura e logística',
  AZUL4: 'Aviação', GOLL4: 'Aviação', EMBR3: 'Bens industriais',
  CYRE3: 'Construção civil', MRVE3: 'Construção civil', EZTC3: 'Construção civil',
  // Shopping / imóveis
  MULT3: 'Shopping centers', IGTI11: 'Shopping centers', ALSO3: 'Shopping centers',
};

// Segmento por ticker de FII (não exaustivo).
const fiiSegment: Record<string, string> = {
  HGLG11: 'Logística', BTLG11: 'Logística', VILG11: 'Logística', XPLG11: 'Logística', LVBI11: 'Logística',
  HGRE11: 'Lajes corporativas', KNRI11: 'Lajes corporativas', BRCR11: 'Lajes corporativas', RCRB11: 'Lajes corporativas',
  VISC11: 'Shoppings', XPML11: 'Shoppings', MALL11: 'Shoppings', HSML11: 'Shoppings',
  MXRF11: 'Papel (recebíveis)', KNCR11: 'Papel (recebíveis)', KNIP11: 'Papel (recebíveis)', IRDM11: 'Papel (recebíveis)',
  CPTS11: 'Papel (recebíveis)', VGIP11: 'Papel (recebíveis)', RECR11: 'Papel (recebíveis)',
  HGCR11: 'Papel (recebíveis)', BCFF11: 'Fundo de fundos (FOF)', RBRF11: 'Fundo de fundos (FOF)',
  HFOF11: 'Fundo de fundos (FOF)', HGBS11: 'Shoppings',
};

/** Best-effort: extrai o subtipo do Tesouro a partir da descrição (ex.: "Tesouro Selic 2029"). */
export function treasurySubtype(assetName: string): string {
  const n = assetName.toUpperCase();
  if (n.includes('SELIC')) return 'Tesouro Selic';
  if (n.includes('IPCA')) return 'Tesouro IPCA+';
  if (n.includes('PREFIXADO') || n.includes('PRE ')) return 'Tesouro Prefixado';
  if (n.includes('RENDA') && n.includes('EDUCA')) return 'Tesouro Educa+';
  return 'Tesouro Direto — outro';
}

/** Rótulo de agrupamento fino (setor de ação, segmento de FII, ou subtipo de Tesouro). */
export function classify(asset: string, category: AssetClass): string {
  const ticker = asset.trim().toUpperCase();
  if (category === 'Ação') return stockSector[ticker] || 'Outros';
  if (category === 'FII') return fiiSegment[ticker] || 'FII — não classificado';
  return treasurySubtype(asset);
}

export function isClassified(asset: string, category: AssetClass): boolean {
  const ticker = asset.trim().toUpperCase();
  if (category === 'Ação') return ticker in stockSector;
  if (category === 'FII') return ticker in fiiSegment;
  return true;
}
