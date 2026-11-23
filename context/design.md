# Sistema de design

Criado pelo /agent-crew:new-project. Este arquivo traz as REGRAS DE USO do visual. Os VALORES (cores, fontes, espaçamentos) ficam só no arquivo de tema do código, que é a fonte da verdade. Não repita valores aqui.

## Origem

- **Tipo:** Figma
- **Referência:** link a enviar (pendente; defina com `/agent-crew:set-design`)
- **Arquivo de tema no código:** `src/theme.js` (única fonte dos valores; os padrões vieram dos prints)
- **Componentes reutilizáveis:** `src/renderers.js` (desenho da grade, da cobra e da comida) e `src/snake-game.js` (componente `<snake-game>`)

## Regras de uso

- Quando usar cada cor (tokens `--snake-*`, valores em `src/theme.js`):
  - cinza da grade só nos pontos, quadradinhos ou linhas do tabuleiro;
  - cor da cobra só na cobra;
  - cor da comida e do halo só na comida;
  - cor do texto em placar, mensagens e botões;
  - fundo do modal e das mensagens com o token de backdrop;
  - nunca escrever uma cor ou tamanho direto nos arquivos de desenho: criar ou usar um token.
- Tipografia: fonte e tamanho vêm dos tokens `--snake-font` e `--snake-font-size`; o placar fica em negrito.
- Formas: pontos redondos na grade e na cobra; botões em pílula; a comida é círculo ou quadrado.
- Acessibilidade: contraste mínimo de 4.5:1 para texto; alvos de toque com pelo menos 44 px; todo elemento interativo acessível pelo teclado.

## Referências visuais

Os prints de referência ficam só neste computador, em `context/prototype/` (fora do Git). Eles mostram uma grade regular de pontos claros sobre fundo branco, com um ponto de destaque colorido. Os padrões de cor e forma de `src/theme.js` vieram dessa referência.
