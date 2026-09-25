# Consolidador de investimentos

Aplicativo para importar a base histórica, registrar novas notas e protocolos e consolidar posições por ativo e corretora. O arquivo Excel permanece inalterado.

## Fonte e importação

São 112 operações de ações/FIIs na aba Dados e 28 operações de Tesouro Direto. As abas Carteira, Notas e backapp não são importadas como transações adicionais, evitando duplicações e dependência das fórmulas antigas.

Cada documento guarda os dados originais, a referência de aba/linha e o SHA-256 do arquivo. As taxas originais são reconstruídas por corretora, data e número da nota. Importações repetidas não sobrescrevem documentos existentes. Edições armazenam a versão anterior e rejeitam gravações com versão desatualizada.

## Regras implementadas

- Valores e quantidades decimais tratados com inteiros de precisão fixa no cálculo do rateio.
- Cada componente de taxa é distribuído pelo valor bruto absoluto das operações elegíveis; os centavos residuais seguem as maiores frações, com desempate pela ordem original.
- IRRF separado do custo e distribuído apenas entre vendas. Conferir na nota quando houver modalidades ou incidências distintas.
- Compras adicionam custo bruto mais despesas; vendas retiram o custo médio gerencial e descontam despesas do resultado. A visão de custo é por corretora, não uma apuração fiscal consolidada.
- Ordens de compra e venda no mesmo ativo, corretora e dia são sinalizadas para revisão. Não há motor de day trade.
- Saldo negativo ou vencimento com saldo em aberto sinaliza histórico incompleto. Custos e resultados afetados não são apresentados como apurados.
- Atualizações de mercado não substituem o preço histórico da transação. Alterações de ticker informadas pela API exigem revisão e não são aplicadas automaticamente.

## Segurança e persistência

O servidor usa a identidade encaminhada pelo Sites e mantém dados isolados por usuário. A publicação deve permanecer privada. O login local é simulado pelo starter e não valida o login de produção. Todas as leituras e gravações passam pelo servidor. Mutações conferem a origem e usam SQL parametrizado. Segredos não são enviados ao navegador.

Banco D1: notes, revisions e quotes. A estrutura está em db/schema.ts e a migração em drizzle. O histórico importado fica no servidor em data/source.json, nunca em public.

## Mercado

Integração preparada para a API v2 da Brapi: stocks/quote (ações e FIIs) e treasury/indicators (preço indicativo de venda do Tesouro). Configurar BRAPI_API_KEY como segredo do ambiente de hospedagem. Disponibilidade depende do plano e da cobertura do ativo. A data da cotação fica visível e falhas preservam os últimos valores. Sem chave, não são inventadas cotações.

Referências: https://brapi.dev/docs/acoes/cotacao e https://brapi.dev/docs/tesouro-direto/indicadores

## Limites da primeira versão

Não presume que compras/vendas sejam aportes/retiradas externos. Não calcula rentabilidade total, TIR, imposto a pagar, IR/IOF líquido do Tesouro ou carteira com eventos societários inferidos. Proventos, transferências, grupamentos e desdobramentos exigem dados próprios e uma próxima extensão do modelo. A ausência deles pode deixar posições aparentemente consistentes, mas incompletas. Os valores de mercado são parciais quando faltam preços ou há pendências de saldo.

Os totais de taxas dependem da transcrição original; a planilha não substitui a conciliação com as notas. Correções de dados devem ser explícitas. A base tem seis pendências automáticas, incluindo saldo negativo de 0,63 título no Tesouro Selic 2027/BTG.

## Verificação

scripts/test-ledger.mjs verifica as 455 reconciliações de taxas, conservação de centavos, IRRF fora das compras, custo médio e resgates superiores ao saldo. scripts/test-api.py verifica importação idempotente, gravação, conflito de versão, entradas inválidas e origem da requisição no ambiente local.

Para desenvolvimento: executar scripts/run-framework.mjs dev com Node 22.13 ou superior. Gerar build com scripts/run-framework.mjs build. A publicação usa o workflow do plugin Sites e a identidade já registrada em .openai/hosting.json; não criar outro site.
