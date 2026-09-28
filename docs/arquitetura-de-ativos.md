# Arquitetura de ativos

O cadastro de um ativo deve separar **identidade**, **classificação**, **termos contratuais**, **posição** e **eventos**. PETR4, um CDB e um Tesouro IPCA+ são instrumentos diferentes; não devem virar valores equivalentes em uma única coluna `tipo`.

## Modelo de domínio

1. `asset_taxonomy_nodes` mantém uma árvore versionável: jurisdição → classe econômica → família → tipo → subtipo. Um nó pode ganhar filhos sem alterar tabelas.
2. `issuers` representa Governo, banco, companhia, securitizadora, fundo ou outra entidade emissora.
3. `assets` é o cadastro canônico do instrumento. Guarda moeda, país, emissor e o nó mais específico conhecido.
4. `asset_identifiers` guarda ticker B3, ISIN, CNPJ de fundo, código Selic, símbolo BRAPI e identificadores de outras fontes.
5. `asset_terms` guarda características contratuais opcionais: vencimento, indexador, percentual do indexador, spread, cupom, garantia e senioridade.
6. Movimentações, posições, proventos, eventos societários, preços e documentos referenciam `asset_id`. Eles não repetem a taxonomia.
7. `asset_classification_history` preservará fonte, confiança, validade e revisão humana. Classificação automática nunca deve sobrescrever uma decisão confirmada.

## Exemplos

- PETR4 → Brasil / Renda variável / Ação / Preferencial; emissor Petrobras; ticker PETR4.
- HGLG11 → Brasil / Fundo / FII / Tijolo / Logística; identificadores B3, ISIN e CNPJ.
- Tesouro IPCA+ 2045 → Brasil / Renda fixa / Título público / NTN-B Principal; emissor Tesouro Nacional; indexador IPCA; vencimento 2045.
- CDB 120% CDI 2028 → Brasil / Renda fixa / Emissão bancária / CDB / Pós-fixado; emissor bancário; indexador CDI; percentual 120%; vencimento 2028.

## Entregas por fase

### Fase 1 — fundação

- Criar catálogo, árvore, emissores, identificadores e termos.
- Vincular gradualmente os ativos atuais sem interromper o razão existente.
- Manter página própria `/ativos/[identificador]` como centro de movimentações, eventos, proventos, preços e documentos.

### Fase 2 — Brasil atual

- Cadastrar ações, FIIs, FIAGRO e Tesouro já presentes na carteira.
- Normalizar setores, segmentos, indexadores, vencimentos e emissores.
- Migrar classificações manuais existentes para o catálogo.

### Fase 3 — renda fixa e fundos

- Adicionar emissões bancárias, crédito privado, securitização, fundos CVM 175 e previdência.
- Modelar garantias, carência, liquidez, tributação e fluxos de cupom/amortização.

### Fase 4 — exterior, derivativos e alternativos

- Adicionar jurisdições, moedas, identificadores internacionais, Treasuries, REITs, opções, futuros, cripto e ativos alternativos.
- Incluir exposição econômica separada da forma jurídica, permitindo que um ETF de cripto continue sendo Fundo/ETF e também tenha exposição Cripto.

### Fase 5 — análise

- Construir risco, concentração, liquidez, crédito, duration, indexadores, moedas, setores e cenários sobre dimensões normalizadas.
- Toda conclusão deve informar cobertura, fonte, data e limitações.

## Regras para a interface

A tela começa com a leitura útil ao investidor e revela detalhes técnicos sob demanda. Cada classe pode ter blocos específicos: ações mostram empresa e setor; FII mostra segmento e portfólio; renda fixa mostra emissor, indexador, vencimento e garantia; derivativos mostram contrato, strike e vencimento. A estrutura comum continua sendo posição, desempenho, movimentações, eventos, proventos, documentos e qualidade dos dados.
