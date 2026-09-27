# Fase 6 — Análise avançada

Objetivo: ir além do que `lib/analytics.ts` já entrega (alocação, setor, corretora,
capital aportado, concentração, resultado realizado por custo histórico) na direção de
performance real e comparabilidade — itens que o usuário pediu explicitamente e que a
Fase 3 expõe na UI.

## 6.1 — Persistência de snapshot diário (fundamento para performance real)
- [ ] Decidir e implementar a captura periódica (diária) do valor consolidado da
      carteira por usuário — depende da Fase 5 (tabela nova no Postgres) ou, como
      alternativa mais simples se a Fase 5 ainda não estiver pronta, gravação em uma
      tabela equivalente no D1 atual.
- [ ] Job/rotina que roda uma vez por dia (avaliar mecanismo disponível na hospedagem —
      Cloudflare Cron Trigger, se mantendo Apps SDK; Vercel Cron, se migrando) chamando
      a consolidação + cotação do dia e persistindo `{date, totalCost, totalMarketValue}`
      por usuário.
- Critério de aceite: depois de rodar por alguns dias, existe uma série temporal real
  (não reconstruída) de valor de carteira por usuário.
- Commit/PR:

## 6.2 — TWR (Time-Weighted Return) e XIRR
- [ ] Implementar cálculo de TWR usando os snapshots da tarefa 6.1 (ajusta por
      aporte/resgate entre os pontos, para não confundir "entrada de dinheiro" com
      "valorização").
- [ ] Implementar XIRR usando o fluxo de caixa completo (`lib/analytics.ts` já tem a
      lógica de aportes/resgates por movimento em `timelineInvested` — reaproveitar a
      extração de fluxo, não recalcular do zero).
- [ ] Expor os dois números lado a lado na UI (tarefa 3.2) com uma explicação curta da
      diferença entre eles (TWR mede a gestão, XIRR mede o retorno do dinheiro do
      usuário especificamente) — não empurrar um único número sem contexto.
- Critério de aceite: os dois cálculos batem com uma verificação manual (planilha) para
  pelo menos um período de teste com aportes irregulares.
- Commit/PR:

## 6.3 — Enquanto não há snapshot suficiente: aproximação por preço histórico
- [ ] Para usuários novos ou período anterior ao início dos snapshots diários (6.1),
      reconstruir uma curva aproximada usando o histórico de preço da Brapi (Fase 4,
      tarefa 4.3) aplicado às posições conhecidas em cada data — rotulado
      explicitamente como "reconstrução aproximada", nunca apresentado com a mesma
      confiança que os dados a partir do snapshot diário real.
- Critério de aceite: a UI distingue visualmente o trecho "reconstruído" do trecho
  "medido" da curva de performance.
- Commit/PR:

## 6.4 — Comparabilidade com benchmark
- [ ] Aplicar TWR/XIRR (6.2) também às séries de CDI/IBOV/IPCA obtidas na Fase 4/3.3,
      no mesmo período e rebase, para permitir comparação direta "minha carteira x
      benchmark X".
- Critério de aceite: a mesma UI da tarefa 3.3 mostra as curvas com metodologia de
  cálculo consistente entre carteira e benchmark (não comparar TWR da carteira com
  variação simples de preço do benchmark).
- Commit/PR:

## 6.5 — Métricas de risco/diversificação (estender o que já existe)
- [ ] `lib/analytics.ts` já calcula `herfindahlTop5` (concentração das 5 maiores
      posições). Estender com: concentração por setor/segmento (não só por ativo
      individual), e número efetivo de posições (inverso do índice
      Herfindahl-Hirschman completo, não só top 5).
- [ ] Exibir essas métricas como parte do painel Setorial (tarefa 3.4), não como uma
      seção nova isolada.
- Critério de aceite: as métricas novas aparecem coerentes com os gráficos de alocação
  já existentes (mesma base de custo, mesmos ativos considerados "apuráveis").
- Commit/PR:

## 6.6 — Exportação / relatório
- [ ] Exportar posição consolidada (PDF ou CSV) com data-base, útil para declaração de
      imposto de renda ou registro pessoal — deixar explícito no próprio export que
      **não é apuração fiscal** (mesma ressalva já usada na aba Conferência/Análise).
- Critério de aceite: o export reflete exatamente os números mostrados na tela na data
  de geração, sem recalcular com premissas diferentes.
- Commit/PR:
