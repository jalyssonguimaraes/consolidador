# Fase 4 — Dados de mercado (Brapi) além da cotação

Objetivo: hoje `app/api/market/route.ts` só busca `stocks/quote` (preço) e
`treasury/indicators`. Esta fase amplia para fundamentos, proventos, histórico de
preço e classificação setorial — dados que as Fases 3 e 6 consomem.
`BRAPI_API_KEY` já está configurada no ambiente (confirmar escopo/limite do plano
contratado antes de desenhar o volume de chamadas).

## 4.1 — Auditoria do plano/limite da Brapi contratado
- [ ] Confirmar, com a própria API ou com o usuário, o limite de requisições do plano
      Brapi em uso — isso decide se dá para buscar fundamentos de todos os ativos da
      carteira a cada carregamento de página ou se precisa de cache.
- Critério de aceite: limite documentado nesta seção (editar este arquivo com o
  resultado) antes de decidir a estratégia de cache da tarefa 4.5.
- Commit/PR:

## 4.2 — Fundamentos e indicadores por ativo
- [ ] Estender a chamada à Brapi (`stocks/quote`) com os módulos de fundamentos
      (indicadores como P/L, P/VP, dividend yield, valor de mercado, liquidez —
      confirmar o nome exato dos módulos na documentação da Brapi no momento da
      implementação, pois isso muda entre versões da API).
- [ ] Diferenciar o que existe para ação, o que existe para FII e o que **não existe**
      para Tesouro Direto (Tesouro não tem "P/L" — não forçar um indicador que não se
      aplica; ver tarefa 3.5).
- [ ] Novo endpoint interno, ex. `app/api/market/fundamentals/route.ts` (ou parâmetro
      novo na rota existente), sempre atrás de `getChatGPTUser()` como as rotas atuais.
- Critério de aceite: painel de indicadores da tarefa 3.5 recebe dado real, não
  mockado, para pelo menos ações e FIIs da carteira atual do usuário.
- Commit/PR:

## 4.3 — Histórico de preço (para performance e comparabilidade)
- [ ] Buscar série histórica de preço por ativo (range configurável) via Brapi.
- [ ] Formato de retorno pensado para consumo direto pelo gráfico de performance
      (tarefa 3.2): pontos `{date, price}` por ativo.
- [ ] Tratar ativos sem histórico suficiente (IPO recente, Tesouro sem preço de
      mercado diário no mesmo sentido de ação) com um estado explícito, não com erro
      genérico.
- Critério de aceite: o gráfico de performance (3.2) consegue reconstruir a curva de
  valor da carteira para o período em que há histórico de preço de todos os ativos
  envolvidos.
- Commit/PR:

## 4.4 — Proventos (dividendos e JCP) por ativo
- [ ] Buscar histórico de proventos por ativo via Brapi.
- [ ] Formato pensado para alimentar diretamente a tela de "conferir e importar
      proventos sugeridos" (tarefa 2.4): `{asset, type: 'dividend'|'jcp', paymentDate,
      valuePerShare}`.
- [ ] Cruzar com a quantidade que o usuário tinha na data-base (data-com) para sugerir
      o valor total recebido — deixar claro que é uma sugestão calculada, sujeita a
      confirmação (nunca gravar automaticamente).
- Critério de aceite: para um ativo com proventos conhecidos e quantidade conhecida na
  data-com, a sugestão de valor bate com o valor realmente creditado (validar com pelo
  menos um caso real do usuário).
- Commit/PR:

## 4.5 — Desdobramentos e bonificações
- [ ] Buscar eventos corporativos de desdobramento/grupamento/bonificação por ativo,
      se a Brapi expuser esse dado (confirmar durante a implementação; se não expuser,
      documentar a lacuna em vez de simular).
- [ ] Alimentar a tela de confirmação de eventos (tarefa 2.4) e os tipos de nota da
      tarefa 2.3 (`split`, `bonus`).
- Critério de aceite: um desdobramento conhecido do usuário aparece como sugestão de
  evento a confirmar, ou a lacuna de cobertura da API fica documentada explicitamente
  se a Brapi não expuser esse dado.
- Commit/PR:

## 4.6 — Estratégia de cache
- [ ] Definir tempo de cache por tipo de dado: cotação (curto, minutos), fundamentos
      (médio, horas/dia), proventos/histórico de eventos corporativos (longo, dias) —
      ajustar conforme o limite descoberto na tarefa 4.1.
- [ ] Persistir cache no banco (tabela `quotes` já existe para cotação; avaliar tabela
      nova para fundamentos/proventos na Fase 5, ao desenhar o schema do Supabase) em
      vez de bater na Brapi a cada carregamento de página.
- Critério de aceite: carregar a página duas vezes seguidas não duplica chamadas à
  Brapi para o mesmo ativo dentro da janela de cache definida.
- Commit/PR:

## 4.7 — Setor/indústria como fonte primária de classificação
- [ ] Confirmar se a Brapi retorna setor/indústria por ativo (perfil da empresa) e, se
      sim, usar como fonte primária na tarefa 3.4, com `lib/classification.ts` como
      fallback — não o contrário como é hoje.
- Critério de aceite: um ativo hoje classificado como "Outros" por não estar no mapa
  manual de `lib/classification.ts` passa a ter setor correto se a Brapi tiver esse
  dado.
- Commit/PR:
