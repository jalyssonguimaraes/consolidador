# Roadmap do Consolidador — backlog para execução

Este diretório é o backlog detalhado do consolidador de investimentos, escrito para ser
executado por um agente (GPT/Claude/humano) fase por fase, sem precisar reconstruir o
contexto do projeto a cada tarefa. Cada arquivo é uma fase; cada fase é uma lista de
tarefas com arquivos afetados, critérios de aceite e dependências explícitas.

## Estado atual do projeto (baseline, 2026-09-25)

- **Hospedagem/autenticação**: o app roda como **App/Site do ChatGPT** (Apps SDK da OpenAI),
  não como site comum. `app/chatgpt-auth.ts` confia em headers injetados pela hospedagem
  (`oai-authenticated-user-id` etc.) — não existe login próprio.
- **Banco**: Cloudflare D1 via Drizzle (`db/index.ts`, `db/schema.ts`), 3 tabelas:
  `notes` (payload da nota + versão para controle de concorrência otimista),
  `revisions` (histórico de edições), `quotes` (última cotação por ativo/usuário).
- **Dados de mercado**: Brapi (`app/api/market/route.ts`), só cotação (`stocks/quote`,
  `treasury/indicators`). `BRAPI_API_KEY` já está configurada no ambiente.
- **Front**: Next.js, uma página com abas (`app/portfolio.tsx`): Carteira, Análise,
  Movimentações, Conferência. Design system embrionário em `app/globals.css`
  (tokens de cor, `.surface`, `.cards`) + componentes shadcn em `components/ui`.
- **Classificação de ativos**: `lib/classification.ts`, mapa manual best-effort
  (setor de ação, segmento de FII, subtipo de Tesouro), cobertura parcial.
- **Análise**: `lib/analytics.ts` + `app/analysis.tsx` — alocação, setor, corretora,
  capital aportado ao longo do tempo, concentração, resultado realizado. Tudo baseado
  em **custo histórico**, não em série de preço — não há performance (TWR/XIRR) nem
  comparação com benchmark ainda.
- **Importação**: só a carga inicial fixa de `data/source.json` (ação `import` em
  `app/api/portfolio/route.ts`). Lançar uma movimentação nova hoje exige preencher
  a nota inteira manualmente, incluindo rateio de taxa.

## Decisão pendente do usuário (bloqueia a Fase 05)

Ainda não foi decidido: o consolidador **continua como App do ChatGPT** (Cloudflare/D1,
sem login próprio) ou **vira um site comum na Vercel com Supabase Auth** (abandona a
integração com ChatGPT)? Essa decisão muda o modelo de autenticação inteiro e não deve
ser assumida por quem for executar a Fase 05 — ela precisa ser confirmada explicitamente
com o usuário antes de qualquer código de infraestrutura ser escrito.

## Ordem de execução

| Fase | Arquivo | Bloqueia / é bloqueada por |
|---|---|---|
| 1 | `01-seguranca-e-auth.md` | **Bloqueia a Fase 5.** Sem dependências. |
| 2 | `02-importacao-de-dados.md` | Prioridade combinada com o usuário. Sem dependências duras. |
| 3 | `03-frontend-ux.md` | Depende parcialmente de 02 (fluxo de import) e 04 (dados de mercado para indicadores/eventos). |
| 4 | `04-dados-de-mercado-brapi.md` | Sem dependências duras; alimenta 03 e 06. |
| 5 | `05-infra-supabase-vercel.md` | **Bloqueada pela Fase 1.** Não iniciar sem a decisão de arquitetura confirmada. |
| 6 | `06-analise-avancada.md` | Depende de 04 (dados históricos) e, para performance real (TWR/XIRR), de 05 (snapshots persistentes). |
| 7 | `07-qualidade-e-testes.md` | Atravessa todas as fases; cada tarefa das fases 1–6 deve fechar com o item correspondente aqui marcado. |

As fases 2 e 3 foram indicadas pelo usuário como prioridade imediata ("mudanças
primordiais"). Comece por elas. A fase 5 (Vercel/Supabase) foi pedida explicitamente,
mas **só depois que a segurança do Auth estiver resolvida** — são palavras do próprio
usuário.

## Princípios que não podem ser quebrados em nenhuma fase

Herdados de `PROJETO.md` e do histórico deste projeto — qualquer tarefa que violar isso
deve ser reescrita, não implementada como está:

1. **Nunca alterar a planilha/nota original silenciosamente.** Toda correção de dado
   precisa ficar auditável (ver padrão em `data/source.json.dataCorrections`).
2. **Nunca inventar cotação, fundamento ou classificação.** Sem fonte, mostrar "a
   conferir" — não estimar.
3. **Controle de concorrência otimista em toda escrita** (campo `version`, como já existe
   em `notes`) — nunca sobrescrever uma edição concorrente silenciosamente.
4. **Segredos nunca em código nem em chat.** Os dois tokens de GitHub usados nesta sessão
   para abrir o PR #1 já foram expostos na conversa — **devem ser revogados** (tarefa
   também listada na Fase 1) e qualquer novo segredo (chaves Supabase, tokens) deve ir
   direto para as variáveis de ambiente do provedor (Vercel/Cloudflare), nunca colado
   no chat com o agente.
5. **Toda tarefa de dado/cálculo precisa de teste em `scripts/test-ledger.mjs`** (ou
   equivalente) antes de ser considerada concluída — é o que pegou o bug dos 7 aportes
   de Tesouro ausentes.

## Como marcar progresso

Cada tarefa é uma checkbox markdown. Ao concluir: marque `[x]`, abra um PR (siga o padrão
usado no PR #1 — branch descritivo, nunca commit direto em `main`), e preencha a linha
"Commit/PR:" da tarefa com o link. Não avance para uma tarefa cujas dependências não
estejam marcadas.
