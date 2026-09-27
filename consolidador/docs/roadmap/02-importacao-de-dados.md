# Fase 2 — Importação de dados (prioridade combinada com o usuário)

Objetivo: o usuário hoje não consegue lançar uma compra de Tesouro ou de ação sem
preencher a nota inteira manualmente, incluindo rateio de taxa. Esta fase resolve isso
em camadas: primeiro um formulário rápido, depois importação de arquivo, depois (stretch)
leitura de PDF de nota de corretagem.

Contexto de código relevante:
- `app/api/portfolio/route.ts` — ações `import` (carga fixa de `data/source.json`) e
  `save` (uma nota por vez, com controle de versão otimista).
- `lib/validation.ts` — `noteSchema`, valida uma nota antes de gravar.
- `lib/ledger.ts` — `normalizeNote`, `consolidate`, `feeKeys`; hoje só entende os
  `kind` que já existem (`variable` para ações/FIIs, `treasury` para Tesouro Direto).
- `scripts/extract_source.py` — lógica original de extração da planilha; é a referência
  de como uma nota é montada a partir de uma linha de planilha, mas roda offline, uma
  vez, fora do app. As tarefas abaixo portam essa lógica para dentro do produto.

## 2.1 — Formulário rápido de lançamento sem rateio manual (prioridade #1 desta fase)
- [ ] Novo componente de formulário (ex.: `app/quick-entry.tsx`) com dois modos:
      "Comprei/vendi um ativo" (ação/FII: ticker, corretora, data, lado, quantidade,
      preço; taxas com valor padrão 0, editável) e "Investi/resgatei no Tesouro"
      (instituição, data, operação, título, quantidade de títulos, valor unitário).
- [ ] O formulário monta a nota no formato que `noteSchema` já aceita e chama a ação
      `save` existente em `app/api/portfolio/route.ts` — **não** criar uma rota nova
      para isso, reaproveitar a que já tem controle de versão e validação.
- [ ] Preencher `note.id`/`sourceKey` com uma chave determinística (ex.:
      `broker+date+number` como já é feito) mesmo quando não há "número de nota" real
      (gerar um número sequencial local ou usar timestamp) — sem isso, a
      deduplicação de `app/api/portfolio/route.ts` (linha do `Set` de `keys`) não
      funciona para lançamentos manuais.
- [ ] Estado de sucesso/erro visível inline (reaproveitar o padrão de mensagens de erro
      que a API já devolve, ex. `"Esta nota foi alterada em outra sessão..."`).
- Critério de aceite: um lançamento novo de compra de Tesouro Selic aparece na aba
  Carteira e na aba Análise sem precisar editar `data/source.json` nem rodar script.
- Commit/PR:

## 2.2 — Importação de planilha/CSV pelo próprio app (não só a carga fixa)
- [ ] Nova ação na API, ex. `action: 'import-file'`, que recebe um arquivo (xlsx ou
      csv) no corpo da requisição, em vez de sempre importar `data/source.json`.
- [ ] Portar a lógica de `scripts/extract_source.py` (mapeamento de colunas das abas
      "Dados" e "Tesouro Direto") para uma função TypeScript reutilizável em
      `lib/import/spreadsheet.ts`, chamada tanto pela rota nova quanto (opcionalmente)
      mantida como referência para o script Python original.
- [ ] Tela de pré-visualização antes de confirmar: mostrar quantas notas novas, quantas
      já existem (duplicadas por `sourceKey`), e quantas têm erro de validação — só
      grava depois de confirmação explícita do usuário (alinhado ao princípio de nunca
      alterar dado silenciosamente).
- [ ] Reaproveitar o limite de tamanho de payload da tarefa 1.5 da Fase 1.
- Critério de aceite: importar uma planilha nova (não a original) resulta na mesma
  pré-visualização e nos mesmos totais que rodar `scripts/extract_source.py` manualmente
  sobre o mesmo arquivo.
- Commit/PR:

## 2.3 — Suporte a novos tipos de movimentação no schema (pré-requisito da Fase 4)
- [ ] Estender `lib/ledger.ts` (`Trade`, `normalizeNote`, `consolidate`) e
      `lib/validation.ts` (`noteSchema`) para aceitar `kind: 'dividend' | 'jcp' |
      'split' | 'bonus'`, além dos já existentes `variable` e `treasury`.
  - Dividendo/JCP: não afeta quantidade, soma um valor recebido por ativo/data — deve
    aparecer em "Resultado realizado" (`lib/analytics.ts`, `realizedByAsset`) como uma
    categoria própria, não misturado com resultado de venda.
  - Desdobramento/grupamento (split): multiplica quantidade e divide preço médio
    proporcionalmente, sem gerar resultado.
  - Bonificação (bonus): soma quantidade sem custo adicional, reduzindo o preço médio.
- [ ] Atualizar `scripts/test-ledger.mjs` com um caso de teste para cada tipo novo
      (conservação de valor total antes/depois do split e da bonificação).
- Critério de aceite: os 4 tipos novos têm teste passando e não quebram nenhum teste
  existente (98 notas / 147 movimentações continuam batendo).
- Commit/PR:

## 2.4 — Importação de eventos (proventos) via Brapi entra aqui, não só na Fase 4
- [ ] Depois que a Fase 4 trouxer o histórico de proventos por ativo via Brapi, esta
      tela de importação precisa de um modo "conferir e importar proventos sugeridos":
      lista os proventos que a Brapi reportou para os ativos da carteira e que ainda
      não têm nota correspondente, com checkbox por item — o usuário confirma, o app
      grava como nota `kind: 'dividend'`/`'jcp'` (tarefa 2.3).
  - Isso respeita o princípio de nunca inventar dado: a Brapi sugere, o usuário confirma.
- Critério de aceite: um provento reportado pela Brapi e confirmado pelo usuário aparece
  no resultado realizado e não pode ser importado duas vezes (mesma deduplicação por
  `sourceKey` das outras notas).
- Commit/PR:

## 2.5 — Leitura de PDF de nota de corretagem (stretch, complexidade alta)
- [ ] Avaliar extração de texto de PDF (nota de corretagem em PDF é comum nas
      corretoras brasileiras) usando a *skill* de PDF já disponível no ambiente de
      execução como referência de abordagem, adaptando para rodar como rota do app.
- [ ] Mapear os campos de uma nota de corretagem típica (data, corretora, operações
      compra/venda por ativo, taxas — liquidação, emolumentos, corretagem, ISS, IRRF)
      para o mesmo formato que `noteSchema` espera.
- [ ] Sempre mostrar a pré-visualização extraída para confirmação manual antes de
      gravar — texto extraído de PDF erra com frequência (número trocado, corretora
      não reconhecida), então este é o caminho com **mais**, não menos, necessidade de
      conferência humana antes de gravar.
- Critério de aceite: uma nota de corretagem PDF real do usuário é extraída com todos
  os valores batendo com o rateio de taxa que `lib/ledger.ts` calcularia manualmente
  para a mesma nota.
- Commit/PR:
