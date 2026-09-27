# Fase 5 — Supabase + Vercel (BLOQUEADA pela Fase 1)

**Não iniciar nenhuma tarefa deste arquivo antes de `01-seguranca-e-auth.md`, tarefa
1.1, estar concluída** — ou seja, antes de existir um `docs/roadmap/DECISAO-AUTH.md`
confirmado pelo usuário. Foi o próprio usuário quem definiu essa ordem: "a questão da
Vercel e do Supabase... tudo isso quando a segurança de Auth do App estiver
relacionada."

Se a decisão de 1.1 for **manter o app dentro do ChatGPT (Apps SDK)**, as tarefas 5.2 a
5.4 (auth/deploy) não se aplicam — só migrar o banco (5.1) faz sentido, e mesmo assim
avaliar se compensa (Cloudflare D1 já funciona; migrar só para "usar Supabase" sem outro
motivo é troca de infraestrutura sem ganho — reavaliar com o usuário se ainda quer isso
nesse cenário).

## 5.1 — Schema Postgres equivalente ao D1 atual
- [ ] Traduzir `db/schema.ts` (Drizzle/SQLite) para Drizzle/Postgres (ou SQL puro do
      Supabase), preservando exatamente as colunas e índices únicos:
      `notes(id, owner, source_key, broker, date, number, payload, version, updated)`
      com índices únicos `(owner, source_key)` e `(owner, broker, date, number)`;
      `revisions(id, owner, note_id, payload, created)`; `quotes(id, owner, payload,
      updated)`.
- [ ] Adicionar as tabelas novas necessárias para as Fases 3 e 4: overrides manuais de
      classificação (tarefa 3.4), cache de fundamentos/proventos (tarefa 4.6),
      snapshots diários de valor de carteira (tarefa 6.1, se for essa a abordagem
      escolhida para performance persistente).
- [ ] RLS por tabela conforme desenhado na tarefa 1.7 (só se a decisão de 1.1 envolver
      Supabase Auth) ou, se mantiver auth do ChatGPT, manter o filtro explícito por
      `owner` em toda query (mesmo padrão de `db/store.ts` hoje) — Supabase sem RLS não
      é seguro para uma `anon key` usada no client.
- Critério de aceite: `scripts/test-ledger.mjs` (ou uma versão adaptada apontando para
  o Postgres) roda contra o schema novo com os mesmos 98 notas / 147 movimentações /
  490 reconciliações de taxa do baseline atual.
- Commit/PR:

## 5.2 — Camada de acesso a dados (`db/store.ts`)
- [ ] Reescrever `db/store.ts` e o binding de `db/index.ts` para usar o client do
      Supabase (ou Drizzle com driver Postgres) em vez de `env.DB`
      (`cloudflare:workers`) — isolar a troca nesse arquivo para não espalhar mudança
      de driver pelas rotas.
- [ ] Manter a mesma assinatura de função (`listNotes(owner)`, etc.) para que
      `app/api/portfolio/route.ts` e `app/api/market/route.ts` mudem o mínimo possível.
- Critério de aceite: as rotas de API existentes funcionam sem alteração de lógica,
  só trocando a importação do módulo de banco.
- Commit/PR:

## 5.3 — Autenticação (só se a decisão de 1.1 for site próprio)
- [ ] Implementar login Supabase Auth (magic link e/ou e-mail+senha) substituindo
      `app/chatgpt-auth.ts`.
- [ ] Middleware/guarda de rota equivalente ao atual `if(!user) return 401`.
- [ ] Plano de migração de usuários existentes (decidido na tarefa 1.7).
- Critério de aceite: um usuário consegue criar conta, logar, e ver exatamente os
  dados que antes via autenticado pelo ChatGPT (se houver migração de dados de teste).
- Commit/PR:

## 5.4 — Deploy na Vercel (só se a decisão de 1.1 for site próprio)
- [ ] Configuração do projeto Vercel: variáveis de ambiente
      (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — a última só
      em rotas server-side, nunca `NEXT_PUBLIC_*`; `BRAPI_API_KEY`).
- [ ] Remover/adaptar o que hoje é específico de Cloudflare (`.openai/hosting.json`,
      binding `cloudflare:workers`) — decidir se o app deixa de ser um "App do ChatGPT"
      de fato ou se mantém as duas superfícies (mais complexo, avaliar custo/benefício
      com o usuário antes de tentar manter os dois ao mesmo tempo).
- [ ] Pipeline de deploy (preview por PR, produção por merge em `main`) — aproveitar o
      fluxo de PR já estabelecido (PR #1 como referência).
- Critério de aceite: um PR de preview sobe no domínio de preview da Vercel com o
  Supabase configurado, antes de qualquer merge em produção.
- Commit/PR:

## 5.5 — Migração de dados existentes
- [ ] Script de migração dos dados hoje em D1 (ou do `data/source.json` em ambiente de
      teste) para o Postgres do Supabase, preservando `version` e o histórico de
      `revisions` — sem perder nenhuma correção já aplicada (ex.: as correções do
      Tesouro Direto documentadas em `data/source.json.dataCorrections`).
- Critério de aceite: depois da migração, `consolidate()` sobre os dados migrados
  produz exatamente os mesmos totais que produz hoje sobre os dados originais (mesmo
  script de comparação usado para validar a correção do Tesouro Direto).
- Commit/PR:
