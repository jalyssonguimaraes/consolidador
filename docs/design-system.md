# Design System — Sagrado Capital

Fonte atual: `app/design-system.css`, carregado depois de `globals.css`.

## Direção visual

- Verde institucional para navegação, ações e estados de confiança.
- Dourado apenas como acento de marca e seleção.
- Superfícies claras, bordas discretas e contraste suficiente para leitura prolongada.
- Escala mínima de 12–13 px para textos auxiliares; corpo em 14 px.
- Valores monetários e quantidades alinhados em tabelas.
- Estados de ganho, perda, aviso e informação sempre acompanhados por texto ou ícone.

## Componentes estruturais

- Navegação superior compartilhada entre Visão geral, Carteira, Análise, Planejamento, Movimentações e Conferência.
- Centrais Master, Admin, Consultor e Família definidas por perfil e autorização real.
- Cartões de totais, tabelas por classe, listas progressivas e página dinâmica por ativo.
- Rolagem suave, foco visível e layouts responsivos.

## Regra de evolução

Novas telas devem reutilizar cores, tipografia, espaçamentos, raios e estados existentes em `design-system.css`. O modo escuro permanece uma fase posterior, pois precisa ser validado em todas as visualizações financeiras e gráficos antes de ser habilitado.
