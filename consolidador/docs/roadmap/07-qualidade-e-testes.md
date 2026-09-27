# Fase 7 — Qualidade e testes (atravessa todas as fases)

Esta fase não é sequencial às demais — é um checklist que se aplica a **cada** tarefa
das Fases 1–6 antes de ela ser considerada concluída. Nasceu da lição da correção do
Tesouro Direto: um bug de dado real (7 aportes ausentes) só foi pego porque havia teste
determinístico comparando totais exatos, não porque alguém "olhou" os números.

## 7.1 — Todo cálculo/dado novo precisa de teste determinístico
- [ ] Toda tarefa das Fases 2, 4 e 6 que introduz um cálculo novo (rateio de tipo de
      nota novo, TWR/XIRR, métricas de risco) ganha um caso em `scripts/test-ledger.mjs`
      com números fixos verificáveis à mão — não apenas "roda sem erro".
- [ ] Ao final de cada fase, rodar `node --experimental-strip-types
      scripts/test-ledger.mjs` (ou o comando equivalente que vier a existir) e colar o
      resultado no PR daquela tarefa.

## 7.2 — Toda rota nova precisa do equivalente de `scripts/test-api.py`
- [ ] Autenticação ausente → 401.
- [ ] Origem inválida → 403 (ver tarefa 1.4).
- [ ] Payload acima do limite → 413/400 (ver tarefa 1.5).
- [ ] Conflito de versão em escrita concorrente → 409 (padrão já usado em
      `app/api/portfolio/route.ts`).
- [ ] Entrada inválida (schema) → 400 com mensagem específica, não genérica.

## 7.3 — Typecheck e lint como porta de entrada
- [ ] `npx tsc --noEmit` limpo antes de qualquer PR.
- [ ] `npx eslint <arquivos alterados>` limpo (ou só com avisos pré-existentes e
      documentados, não novos).
- [ ] `npm run build` completo antes de qualquer PR que toque em rota de API ou em
      `app/portfolio.tsx`/página principal.

## 7.4 — CI (GitHub Actions)
- [ ] Automatizar 7.1–7.3 em um workflow de CI que roda em todo PR (aproveitar o fluxo
      de PR já usado no PR #1) — hoje isso é feito manualmente a cada sessão; deveria
      bloquear merge se falhar.
- Critério de aceite: um PR com teste quebrado mostra status vermelho no GitHub antes
  de qualquer revisão humana.
- Commit/PR:

## 7.5 — Revisão do princípio "nunca alterar dado silenciosamente" a cada fase
- [ ] Antes de fechar qualquer tarefa das Fases 2–6, confirmar que nenhuma mudança
      grava um valor calculado por cima de um valor original sem manter o original
      acessível (mesmo padrão de `data/source.json.dataCorrections` e da tabela
      `revisions`).

## 7.6 — Acessibilidade e responsividade (específico da Fase 3)
- [ ] Cada seção nova da página única (tarefa 3.1 em diante) testada em pelo menos uma
      largura de tela pequena (mobile) — o app pode ser aberto dentro do ChatGPT em
      contextos de tela estreita.
- [ ] Contraste de cor dos tokens do design system (tarefa 3.8) checado contra WCAG AA
      no mínimo para texto sobre `.surface`.
