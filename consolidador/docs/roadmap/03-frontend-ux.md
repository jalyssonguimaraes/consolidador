# Fase 3 — Front-end, UX e página única (prioridade combinada com o usuário)

Objetivo do usuário, nas próprias palavras: "Em uma página apenas, mostrar a Carteira,
Gráficos de Performance, Comparabilidade, Setorial (classificar corretamente cada
ativo), inserir indicadores de cada ativo, fundamentos, eventos e facilitar a
importação". Design system melhor, UX significativamente melhor, front moderno e
prático.

Contexto de código relevante:
- `app/portfolio.tsx` — hoje organizado em abas (`Tabs`/`TabsContent`): Carteira,
  Análise, Movimentações, Conferência. O pedido de "uma página só" é incompatível com
  esconder conteúdo atrás de abas — ver tarefa 3.1.
- `app/analysis.tsx`, `lib/analytics.ts` — já existem gráficos de alocação, setor,
  corretora, capital aportado, concentração, resultado realizado (Fase anterior).
  Esta fase **estende**, não recria, esses gráficos.
- `lib/classification.ts` — mapa manual de setor/segmento/subtipo, cobertura parcial.
- `app/globals.css` — tokens de cor (`--chart-1`..`5`), classes `.surface`, `.cards`,
  `.section-heading`. Ponto de partida do design system, não um design system completo.
- `components/ui/` — biblioteca shadcn já instalada (não usar outra lib de UI).

## 3.1 — Decidir e implementar a arquitetura de "página única"
- [ ] Substituir a navegação por abas (`Tabs`) por um layout de **seções empilhadas
      com navegação âncora** (menu lateral ou superior fixo que rola até a seção —
      Carteira, Performance, Comparabilidade, Setorial, Ativo em foco, Eventos,
      Importar) — mantém tudo em uma página real (uma URL, um scroll), em vez de
      esconder conteúdo atrás de clique em aba.
- [ ] Preservar a funcionalidade de `registerTool`/`setTab` (integração com Apps SDK do
      ChatGPT, que hoje navega entre abas via chamada de ferramenta) trocando "trocar
      aba" por "rolar até a seção" — não remover essa integração sem checar a Fase 1.
- Critério de aceite: todas as informações hoje divididas em 4 abas ficam visíveis na
  mesma página (por scroll), sem clique obrigatório para ver Carteira vs Análise.
- Commit/PR:

## 3.2 — Gráficos de performance (não apenas custo/alocação)
- [ ] Hoje `lib/analytics.ts` só calcula fluxo de capital (custo, aportes/resgates),
      não performance de fato (quanto a carteira valorizou). Performance real (TWR ou
      XIRR) exige **série histórica de valor**, que não existe hoje — só a última
      cotação (tabela `quotes`). Esta tarefa depende de dados históricos de preço
      (Fase 4) e, para persistência entre sessões, de snapshots diários (Fase 5/6).
- [ ] Enquanto não há snapshot diário persistido, implementar uma aproximação:
      reconstruir a curva de valor da carteira ponto-a-ponto usando o histórico de
      preços da Brapi (Fase 4) aplicado sobre as posições conhecidas em cada data —
      deixar claro na UI que é uma reconstrução, não um snapshot real.
- [ ] Gráfico de performance: valor da carteira ao longo do tempo, com toggle para ver
      só custo, custo + valorização, ou variação percentual acumulada.
- Critério de aceite: gráfico de performance renderiza para o período com dados de
  preço disponíveis e mostra explicitamente os períodos sem cobertura de preço em vez
  de interpolar silenciosamente.
- Commit/PR:

## 3.3 — Comparabilidade (benchmark)
- [ ] Comparar a curva de performance (3.2) com CDI, IBOV e IPCA no mesmo gráfico —
      fontes de dados a definir na Fase 4 (Brapi não cobre CDI/IPCA diretamente; avaliar
      fonte adicional, ex. Banco Central/SGS, sem inventar valor quando a fonte faltar).
- [ ] Seletor de período (1A, 2A, desde o início) e de benchmark (CDI, IBOV, IPCA,
      nenhum).
- Critério de aceite: usuário consegue ver "minha carteira x CDI" no mesmo eixo de
  tempo, com as duas curvas partindo do mesmo ponto de referência (rebase a 100 ou a
  0%, documentar qual).
- Commit/PR:

## 3.4 — Setorial: classificação correta de cada ativo
- [ ] Trocar a fonte primária de classificação: usar o setor/indústria que a própria
      Brapi retorna por ativo (módulo de perfil da empresa, Fase 4) como fonte
      principal; `lib/classification.ts` (mapa manual) vira **fallback e possibilidade
      de override manual**, não a fonte única como é hoje.
- [ ] Tela/painel de override manual: para qualquer ativo, o usuário pode fixar um
      setor/segmento diferente do sugerido (ex.: FIIs não têm "setor" na Brapi do jeito
      que ações têm — o segmento de FII continua dependendo do mapa manual ou de
      override). Overrides persistidos por usuário no banco (nova tabela/coluna —
      detalhar na Fase 5 ao desenhar schema).
- [ ] Indicador visual claro (badge "não classificado" / "classificação manual" /
      "classificação automática") em cada ativo, coerente com o princípio de nunca
      apresentar uma classificação inventada como se fosse certa.
- Critério de aceite: todo ativo da carteira tem uma classificação com origem visível
  (automática/manual/não classificado); nenhum ativo aparece com setor errado
  silenciosamente.
- Commit/PR:

## 3.5 — Indicadores e fundamentos por ativo
- [ ] Painel por ativo (ao clicar/expandir uma posição): indicadores que a Fase 4 vai
      trazer da Brapi — P/L, P/VP, dividend yield, liquidez, valor de mercado (ações);
      para FIIs — P/VP, dividend yield, vacância quando disponível; para Tesouro —
      taxa contratada, vencimento, indexador.
- [ ] Estado "sem dado disponível" explícito por indicador (não omitir a linha, mostrar
      que a fonte não tem esse dado agora) — evita a impressão de que "0" é um valor
      real.
- Critério de aceite: abrir qualquer posição da carteira mostra um painel de
  indicadores coerente com a categoria do ativo (ação ≠ FII ≠ Tesouro), sem misturar
  campos que não fazem sentido para aquela categoria.
- Commit/PR:

## 3.6 — Eventos por ativo (linha do tempo)
- [ ] Linha do tempo por ativo: proventos pagos, desdobramentos, bonificações
      (dados da Fase 4 + tipos de nota da tarefa 2.3), junto com as próprias
      movimentações do usuário (compra/venda) no mesmo eixo de tempo.
- [ ] Diferenciar visualmente evento "confirmado" (já importado como nota, tarefa 2.4)
      de evento "sugerido, ainda não confirmado".
- Critério de aceite: para um ativo com histórico de proventos, a linha do tempo mostra
  compra → proventos recebidos → venda (quando aplicável) em ordem cronológica.
- Commit/PR:

## 3.7 — Facilitar a importação (UX, não lógica — lógica é a Fase 2)
- [ ] Área de importação com drag-and-drop de arquivo, estado de progresso, e o mesmo
      fluxo de pré-visualização/confirmação da tarefa 2.2, agora com um visual à altura
      do resto do produto (não um botão único "Importar minha planilha" como hoje).
- [ ] Atalho para o formulário rápido (tarefa 2.1) sempre visível/fixo na página
      (ex.: botão flutuante "+ Nova movimentação"), coerente com o pedido de "página
      única" — sem precisar navegar para lançar algo novo.
- Critério de aceite: um usuário novo consegue, sem instrução prévia, entender que pode
  tanto importar um arquivo quanto lançar manualmente, a partir da mesma página.
- Commit/PR:

## 3.8 — Design system
- [ ] Documentar formalmente (arquivo `docs/design-system.md` ou Storybook, a definir)
      os tokens já existentes em `app/globals.css` (cores `--chart-1`..`5`, espaçamento,
      tipografia) e completar o que falta (escala tipográfica, espaçamento consistente,
      estados de hover/focus/disabled para os componentes shadcn usados).
- [ ] Auditoria de consistência: hoje há CSS ad hoc misturado com classes shadcn —
      levantar inconsistências (cores hardcoded fora dos tokens, espaçamento
      arbitrário) e migrar para os tokens únicos.
- [ ] Dark mode — verificar se os tokens de cor já suportam ou precisam de variante
      (`prefers-color-scheme`), já que o app roda embutido em superfícies (ChatGPT) que
      podem estar em tema escuro.
- Critério de aceite: nenhuma cor/espaçamento novo introduzido pelas tarefas 3.1–3.7
  usa valor literal fora dos tokens do design system.
- Commit/PR:

## 3.9 — Estados de carregamento, erro e vazio
- [ ] Auditar toda a página nova por três estados que hoje são tratados de forma
      inconsistente: carregando (skeleton, não spinner genérico), erro (mensagem
      específica reaproveitando as mensagens que a API já devolve), vazio (ex.: ativo
      sem indicador disponível, carteira sem posições ainda).
- Critério de aceite: nenhuma seção da página nova fica em branco silenciosamente
  quando não há dado — sempre um estado explícito.
- Commit/PR:
