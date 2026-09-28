# Design System — Sagrado Capital (v1)

Fonte única: `app/design-system.css` (carregado depois de `globals.css`). **Nenhuma cor, espaçamento ou raio novo fora destes tokens.**

## Tokens
| Grupo | Tokens | Uso |
|---|---|---|
| Marca | `--ds-brand-900…50` | KPI principal, ações primárias, links, foco |
| Superfície/texto | `--ds-bg`, `--ds-surface(-2)`, `--ds-border(-strong)`, `--ds-text(-muted/-faint)` | Fundo, cartões, divisórias, hierarquia de texto |
| Semânticos | `--ds-gain`, `--ds-loss`, `--ds-warn`, `--ds-info` (+ `-bg`) | Ganho/perda, pendências, avisos. **Sempre com ícone ou texto, nunca só cor** |
| Categoria | `--ds-cat-acao`, `--ds-cat-fii`, `--ds-cat-tesouro` | Mesma cor da classe em gráficos, badges e tabelas |
| Espaço | `--ds-space-1…7` (4→48px) | Padding/gap |
| Forma | `--ds-radius-sm/md/lg/pill`, `--ds-shadow-1/2` | Cartões e controles |
| Tipografia | `--ds-font` (pilha do sistema), `--ds-text-xs…2xl` | Sem fonte externa (app roda embutido) |

## Regras
1. Valores monetários e quantidades usam algarismos tabulares (`.ds-num`, já aplicado a KPIs e tabelas).
2. Estados: carregando, erro, vazio e pendência têm estilo próprio (`.notice`, `.notice.error`, `.review-strip`, `.ds-empty`).
3. Modo escuro automático via `prefers-color-scheme` (forçar claro com `data-theme="light"` no `<html>`).
4. Foco visível em todo controle (`--ds-focus`); animações respeitam `prefers-reduced-motion`.
5. Os tokens do shadcn (`--primary`, `--border`, `--chart-*`) são ponte para a marca: componentes de `components/ui` herdam sem alteração.

## Componentes utilitários
`.surface`, `.cards`, `.ds-badge[data-cat=…]`, `.ds-badge.warn|ok`, `.ds-gain/.ds-loss`, `.ds-empty`, `.center-switch` (`app/center-switch.tsx`).

## Estrutura de centros
Master · Admin · **Família**. O seletor só habilita o centro atual; Master/Admin ficam desabilitados até existirem perfis reais (o seletor nunca concede acesso).

## Dívida conhecida
`globals.css` ainda tem regras duplicadas (`.surface`, `.view-tabs`). O design system as sobrepõe; consolidar é a próxima limpeza.
