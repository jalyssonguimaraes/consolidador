# Ambiente Família — mapa das 60 funcionalidades

Seções: **Visão Geral · Carteira · Movimentações · Conferência**.
Legenda: ✅ existe · 🟡 parcial · ⬜ a construir.

## Visão Geral (1, 16–20, 25–31, 38–47, 52, 59–60)
| # | Funcionalidade | Estado |
|---|---|---|
| 17/19/20 | Patrimônio total, por classe e por ativo (custo) | ✅ (gráficos de alocação) |
| 18 | Patrimônio por instituição | 🟡 dado existe (`sourceBrokers`), falta gráfico |
| 25–28 | Rentabilidade e benchmarks | ⬜ exige série histórica (roadmap Fases 4/6) |
| 29 | Realizado × não realizado | 🟡 realizado ✅ (FIFO); não realizado só com cotação |
| 30–31 | Rendimentos e fluxo | ⬜ depende de eventos (proventos) |
| 38–40 | Risco, concentração, diversificação | 🟡 classe ✅; setor/emissor ⬜ |
| 41–42 | Alocação alvo e rebalanceamento | ⬜ |
| 43–47 | Aportes, evolução, carteira histórica | ⬜ (aportes por mês foram prototipados no PR #1) |
| 52, 59, 60 | Objetivos, dashboard personalizável, modo simples/analítico | ⬜ |

## Carteira (16, 20, 23, 32–37)
| 16/20/32 | Posição, quantidade, preço médio, custo | ✅ |
| 33 | Custos e taxas no custo | ✅ (rateio por nota) |
| 34 | Eventos corporativos | 🟡 grupamento BHIA3 ✅; bonificação ITSA4 (PR #4); demais ⬜ |
| 35–37 | Vencimentos, fluxo futuro, liquidez | ⬜ (Tesouro já tem `maturity`) |
| 23 | Filtros por classe/corretora | 🟡 |

## Movimentações (2–15, 57–58)
| 2/6/7 | Cadastro único simples/avançado | ✅ modal "Nova movimentação" |
| 3–5 | Escolha do tipo, formulário adaptativo, busca | 🟡 ação/FII/Tesouro ✅; demais classes ⬜ |
| 8–12 | Importar nota, extrato, arquivos, protocolos, revisão | ⬜ (só carga inicial hoje — roadmap Fase 2) |
| 13–14 | Duplicidade e correção na revisão | 🟡 duplicidade por chave ✅ |
| 15 | Linha do tempo única | 🟡 tabela ✅; proventos/eventos ⬜ |
| 57–58 | Edição fácil e origem do dado | ✅ edição com controle de versão; origem 🟡 |

## Conferência (54–56)
| 54 | Central de pendências | ✅ |
| 55 | Conciliação com saldo da instituição | ⬜ |
| 56 | Alertas de inconsistência | ✅ |

## Fora do escopo atual (exigem decisão de produto)
48–49 múltiplas instituições/contas ✅ instituições, ⬜ contas; 50–51 internacional/câmbio; 53 documentos; 3 CDB/LCI/fundos/debêntures/ETFs.
