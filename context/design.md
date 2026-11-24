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
  - nunca escrever uma cor ou tamanho direto nos arquivos de desenho: criar ou usar um token;
  - cores só em `src/theme.js` e em `skins/*.js` (as skins trazem só cores e emojis, nunca tamanhos).
- Tipografia: fonte e tamanho vêm dos tokens `--snake-font` e `--snake-font-size`; o placar fica em negrito.
- Formas: pontos redondos na grade e na cobra; botões em pílula; a comida é círculo ou quadrado, ou emoji, quando há skin.
- Acessibilidade: contraste mínimo de 4.5:1 para texto; alvos de toque com pelo menos 44 px; todo elemento interativo acessível pelo teclado.

## Skins (temas opcionais)

Cada skin troca a comida por emojis e traz uma paleta de 8 cores (cobra, grade, fundo, cobertura, texto, foco, comida e brilho da comida). Os valores ficam em `skins/*.js`. Contrastes verificados em `test/skin-files.test.js` (texto sobre o fundo ≥ 4,5:1; cobra, comida e foco sobre o fundo ≥ 3:1):

| Skin | Texto / fundo | Cobra / fundo | Comida / fundo | Foco / fundo |
| --- | --- | --- | --- | --- |
| `natal` | 16,2:1 | 6,1:1 | 5,2:1 | 6,1:1 |
| `halloween` | 15,6:1 | 7,6:1 | 4,5:1 | 7,6:1 |
| `carnaval` | 16,5:1 | 8,9:1 | 4,7:1 | 8,9:1 |

Prioridade das cores: variáveis `--snake-*` do site, depois a skin (se `skin-palette` não for `off`), depois o padrão de `src/theme.js`. O tamanho do emoji é `--snake-food-emoji-size`, uma fração do espaçamento.

## Referências visuais

Os prints de referência ficam só neste computador, em `context/prototype/` (fora do Git). Eles mostram uma grade regular de pontos claros sobre fundo branco, com um ponto de destaque colorido. Os padrões de cor e forma de `src/theme.js` vieram dessa referência.
