# Fase 1 — Segurança e Auth (bloqueia a Fase 5)

Objetivo: deixar claro, documentado e testado como a identidade do usuário é
estabelecida e protegida hoje, e decidir — com o usuário, não sozinho — o modelo
daqui pra frente. Nenhuma tarefa da Fase 5 (Supabase/Vercel) começa antes desta
fase estar concluída.

## 1.1 — Decisão de arquitetura de auth (pré-requisito de tudo mais aqui)
- [ ] Confirmar com o usuário, explicitamente, uma das duas opções (pergunta já feita
      na conversa, ainda sem resposta):
  - (a) Continuar como App do ChatGPT (Apps SDK), mantendo `getChatGPTUser()` baseado
        em headers da hospedagem, só trocando o banco por Supabase Postgres.
  - (b) Virar site comum, acessível fora do ChatGPT, com Supabase Auth (login próprio:
        e-mail/senha ou magic link) e deploy na Vercel.
- [ ] Documentar a decisão e o porquê em `docs/roadmap/DECISAO-AUTH.md` (criar esse
      arquivo com a resposta) antes de tocar em qualquer código da Fase 5.
- Critério de aceite: existe um arquivo de decisão assinado/datado; a Fase 5 referencia
  esse arquivo como pré-condição.
- Commit/PR:

## 1.2 — Rotacionar os segredos já expostos nesta sessão
- [ ] Revogar os dois Personal Access Tokens do GitHub colados no chat durante o PR #1
      (um fine-grained, um clássico `ghp_...`). Confirmar em
      GitHub → Settings → Developer settings → que ambos aparecem como "revoked"/expirados.
  - Isso é urgente e **não depende de nenhuma outra tarefa** — fazer primeiro, independente
    da ordem das fases.
- Critério de aceite: print ou confirmação textual de que os dois tokens não aparecem
  mais como ativos.
- Commit/PR: (não aplicável — ação fora do repositório)

## 1.3 — Auditar o modelo de confiança atual (`app/chatgpt-auth.ts`)
- [ ] Confirmar que **todas** as rotas que leem/gravam dados do usuário passam por
      `getChatGPTUser()` antes de tocar no banco — hoje isso é verdade em
      `app/api/portfolio/route.ts` e `app/api/market/route.ts`; qualquer rota nova
      (Fase 2, 3, 4) precisa manter esse padrão.
- [ ] Documentar explicitamente o que acontece se a hospedagem parar de enviar os
      headers `oai-authenticated-user-*` (hoje: `getChatGPTUser()` retorna `null` e as
      rotas devolvem 401 — comportamento correto, só falta documentar).
- [ ] Verificar que não existe nenhum caminho (rota, `console.log`, mensagem de erro)
      que vaze `userId`, e-mail ou payload de nota de um usuário para outro.
- Critério de aceite: checklist acima resolvido e anotado em comentário no topo de
  `app/chatgpt-auth.ts`.
- Commit/PR:

## 1.4 — Verificação de origem (CSRF-like) nas rotas de escrita
- [ ] `app/api/portfolio/route.ts` e `app/api/market/route.ts` já checam
      `req.headers.get('origin') !== new URL(req.url).origin`. Confirmar que toda rota
      nova de escrita criada nas Fases 2–4 (ex.: upload de importação, indicadores
      salvos, override manual de setor) replica exatamente essa checagem antes do
      primeiro `await` que toca o banco.
- [ ] Adicionar um teste (`scripts/test-api.py`, que já existe e cobre esse tipo de
      caso) para cada rota nova.
- Critério de aceite: toda rota de escrita nova tem teste cobrindo origem inválida
  → 403.
- Commit/PR:

## 1.5 — Limites de payload e validação de entrada
- [ ] `app/api/portfolio/route.ts` já limita `content-length` a 200000 bytes na ação
      `save`. Ao criar a rota de importação de arquivo (Fase 2), definir um limite
      equivalente e explícito para upload de planilha/CSV/PDF (ex.: 10 MB), rejeitado
      **antes** de ler o corpo inteiro em memória.
- [ ] Toda nota nova (inclusive as geradas por importação de arquivo) passa por
      `lib/validation.ts` (`noteSchema`) antes de ir para o banco — nenhuma rota nova
      pode pular essa validação.
- Critério de aceite: rota de importação de arquivo rejeita payload acima do limite
  com mensagem clara, e todo caminho de escrita passa por `noteSchema`.
- Commit/PR:

## 1.6 — Modelo de segredos server-side
- [ ] Listar todas as variáveis de ambiente sensíveis usadas hoje e as que serão
      adicionadas nas próximas fases: `BRAPI_API_KEY` (já configurada), e — só se a
      decisão de 1.1 for migrar — `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
      `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Confirmar que `SUPABASE_SERVICE_ROLE_KEY` (se vier a existir) **nunca** é
      exposta a `NEXT_PUBLIC_*` nem enviada ao client — só usada em rotas server-side,
      igual ao padrão atual de `env.BRAPI_API_KEY` em `app/api/market/route.ts`.
- Critério de aceite: tabela de variáveis de ambiente documentada em
  `docs/roadmap/DECISAO-AUTH.md` (mesmo arquivo da tarefa 1.1), com escopo
  (server-only / client) de cada uma.
- Commit/PR:

## 1.7 — Se a decisão for migrar para Supabase Auth (opção b da tarefa 1.1)
Só relevante se 1.1 escolher a opção (b). Caso contrário, marcar como N/A.
- [ ] Desenhar Row Level Security (RLS) no Postgres do Supabase equivalente ao que
      hoje é feito manualmente filtrando por `owner=?` em toda query de
      `db/store.ts` — cada tabela (`notes`, `revisions`, `quotes`, e as novas de
      indicadores/eventos da Fase 4) precisa de política RLS `owner = auth.uid()`.
- [ ] Fluxo de login (magic link e/ou e-mail+senha), página de callback, proteção de
      rota no lugar do atual `requireChatGPTUser`.
- [ ] Plano de migração de usuários existentes (hoje identificados por
      `oai-authenticated-user-id`) para contas Supabase — decidir se é um mapeamento
      1:1 silencioso ou se cada usuário precisa recriar conta.
- Critério de aceite: RLS testado (um usuário autenticado não consegue ler linha de
  outro `owner` via API do Supabase, nem com a anon key).
- Commit/PR:
