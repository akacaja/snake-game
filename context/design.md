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
  - cores do jogo só em `src/theme.js` e em `src/skins/*.js` (as skins trazem só cores e emojis, nunca tamanhos).
- Tipografia: fonte e tamanho vêm dos tokens `--snake-font` e `--snake-font-size`; o placar fica em negrito.
- Formas: pontos redondos na grade e na cobra; botões em pílula; a comida é círculo ou quadrado, ou emoji, quando há skin.
- Acessibilidade: contraste mínimo de 4.5:1 para texto; alvos de toque com pelo menos 44 px; todo elemento interativo acessível pelo teclado.
- Cores e tamanhos do jogo: só em `src/theme.js`. As skins (`src/skins/*.js`) trazem só cores. Os addons (`src/addons/*.js`) usam só `var(--_*)` (os tokens do jogo), em medidas relativas (`rem`, `em`, `thin`, `medium`), sem cor nem `px` escritos.

## Skins (temas opcionais)

Cada skin troca a comida por emojis e traz uma paleta de 8 cores (cobra, grade, fundo, cobertura, texto, foco, comida e brilho da comida). Os valores ficam em `src/skins/*.js` (o `npm run build` gera `skins/*.js`). Contrastes verificados em `test/skin-files.test.js` (texto sobre o fundo ≥ 4,5:1; cobra, comida e foco sobre o fundo ≥ 3:1):

| Skin | Texto / fundo | Cobra / fundo | Comida / fundo | Foco / fundo |
| --- | --- | --- | --- | --- |
| `natal` | 16,2:1 | 6,1:1 | 5,2:1 | 6,1:1 |
| `halloween` | 15,6:1 | 7,6:1 | 4,5:1 | 7,6:1 |
| `carnaval` | 16,5:1 | 8,9:1 | 4,7:1 | 8,9:1 |

Prioridade das cores: variáveis `--snake-*` do site, depois a skin (se `skin-palette` não for `off`), depois o padrão de `src/theme.js`. O tamanho do emoji é `--snake-food-emoji-size`, uma fração do espaçamento.

## Ranking (addon opcional)

O fim de jogo com ranking usa os botões em pílula de sempre (`.btn`, 44 px) e os mesmos tokens de texto. As regras abaixo valem para qualquer tela de ranking:

- **Campo de nome:** borda `thin` na cor do texto, altura mínima `--snake-button-size`, fonte de pelo menos 16px (`--snake-field-font-size`, para o iPhone não dar zoom). O rótulo fica acima do campo.
- **Erro:** embaixo do campo, em negrito, com a borda do campo passando de `thin` para `medium`. Nunca só pela cor. É anunciado como alerta, e o campo aponta para ele.
- **Lista:** até 10 entradas, números tabulares, com rolagem quando a tela é baixa; o botão "Play again" fica sempre visível.
- **Destaque do próprio nome:** `--snake-highlight-color` (padrão: a cor do foco) + negrito + `aria-current`, com contraste de pelo menos 4,5:1 com o fundo. A skin pode pintar esse token.
- **Foco:** o campo recebe o foco ao abrir; depois de salvar, o foco vai para o título "Top 10".
- **Celular:** o painel rola quando o teclado ou a tela baixa não deixam tudo à mostra; não há `@media` novo.
- **Modo digitando (celular deitado, só no modal):** quando o espaço acima do teclado é menor que 1,5 vez a altura do formulário (e só sai a partir de 1,8 vez), aparece só a linha "Username [campo] Save Skip" sobre a tela, no espaço visível acima do teclado, com o fundo do token de backdrop. Em pé e no modo inline, nada muda. Depois de salvar, o teclado fecha e a linha do próprio nome volta à vista.

## Landing

A landing (`index.html` + `site/`) é a página do projeto; ela não faz parte do jogo.

- **Onde ficam os valores:** as cores e os tamanhos da landing ficam só em `site/landing.css`: cores, tipografia, raios e medidas principais (largura do conteúdo, gutter, alvo de 44 px, quadro e célula das cenas) como variáveis no `:root`, no topo; espaçamentos e medidas de um componente ficam junto do componente. Nenhuma cor (hex ou função) fora do `:root`; a única exceção é o véu da prévia, que mistura variáveis do `:root` com `color-mix`. Todo `font-size` e `border-radius` usa `var()` (os testes conferem). O `index.html` não tem `<style>`, `style=` nem script inline, e `site/*.js` não escreve cor nem `px` (os testes conferem). Repetir valores aqui não vale: a fonte é o CSS.
- **Fontes:** Inter e JetBrains Mono, pedidas só no `index.html` (Google Fonts, com `display=swap` e fonte do sistema de reserva). O jogo não herda a fonte da página: a landing nunca define `--snake-font`.
- **Contrastes medidos (WCAG, mínimo de 4,5:1 para texto):**

| Par | Razão |
| --- | --- |
| texto secundário sobre a página | 7,30:1 |
| texto secundário sobre a superfície cinza | 6,99:1 |
| título de feature inativo sobre a página | 4,59:1 |
| texto do código sobre o fundo escuro | 15,04:1 |
| comentário e aba inativa sobre o fundo escuro | 7,49:1 |
| ícone ✓ do aviso de cópia (verde) sobre branco | 3,30:1 (gráfico, mínimo de 3:1) |
| ícone de alerta do aviso de erro (vermelho) sobre branco | 4,83:1 |

- **Alvos de toque:** todo botão e controle com pelo menos 44 px de altura (inclusive os menus); o botão Get code tem 48 px.
- **Movimento:** transições, animações e `@keyframes` só dentro de `@media (prefers-reduced-motion: no-preference)`. As animações movem só `transform` e `opacity`; cores, bordas e sombras podem ter transição. Com movimento reduzido, as ilustrações ficam paradas, a barra de tempo fica cheia e nada troca sozinho. O botão "Pause animations" e a pausa com mouse ou foco na seção cobrem a regra de pausar movimento (WCAG 2.2.2).
- **Foco:** `:focus-visible` com contorno de 2 px afastado 2 px; no cartão escuro, a cor clara da página.

### Painel compacto, gaveta de código e aviso de cópia (card 9)

- **Painel:** Skin em 2×2; Colors em 4 amostras numa linha (`.color-pick`, o `input type="color"` de verdade, com o nome embaixo e o valor só para o leitor de tela); Gap; e 6 menus nativos (`select`) com rótulo, em 2 colunas em qualquer largura; no fim, o botão preto Get code. Ícones do Lucide (ISC), com o comentário da licença no `index.html`.
- **Menu (`.select`):** a seta fica a 14 px da borda direita (`--select-chevron-gap`) e o texto nunca encosta nela (o `padding` direito soma a distância, o tamanho da seta e 10 px). O texto é de 14 px no computador e de 16 px em tela de toque (`--text-select`, em `@media (pointer: coarse)`): abaixo de 16 px o iPhone dá zoom na página ao focar o campo.
- **Gaveta (`.drawer`):** uma `<dialog>` não modal, aberta pelo Get code, escura (`--code-bg`). No computador tem 560 px (`--drawer-width`) e cobre o lado direito do cartão do playground, que a recorta. Até 900 px de largura (quando o painel está embaixo do jogo) cobre a tela inteira: título e × no alto, Copy link e Copy code no rodapé, só o código rola, e a página de trás fica parada (`overflow: hidden`) e `inert`. Em tela baixa (até 500 px de altura) as pílulas ficam numa linha que desliza. Entra em 250 ms (`ease-out`, `transform` e `opacity`).
- **Comportamento:** o foco vai para o ×; Tab fica preso dentro; Esc e × fecham e devolvem o foco ao Get code; um clique fora fecha e o foco fica no que foi clicado. A última aba escolhida continua escolhida.
- **Aviso de cópia (`.toast`):** fundo branco, ícone de ✓ verde (`--toast-ok`) ou de alerta vermelho (`--toast-error`) que só pintam o traço do ícone; a mensagem em texto, então a cor não é o único sinal. Fica acima do rodapé da gaveta, dentro de um `role="status"`. Sucesso: 2,6 s. Erro: 6 s. Quando a cópia falha, o código fica selecionado (Copy code) ou o link aparece num campo já selecionado (Copy link).
- **Movimento reduzido:** a gaveta e o aviso aparecem sem animação.

### Features no celular

- Quando a lista e o painel das animações ficam numa coluna só (até 943,98 px de largura, `--features-stacked-max`), o painel da animação se move para dentro do item aberto, logo abaixo da descrição e da barra de progresso, e acompanha a troca de item (`site/features.js`). Lado a lado, no computador, o painel fica na coluna da direita, como antes. A passagem do mouse só abre itens lado a lado; empilhado, só o clique.

## Referências visuais

Os prints de referência ficam só neste computador, em `context/prototype/` (fora do Git). Eles mostram uma grade regular de pontos claros sobre fundo branco, com um ponto de destaque colorido. Os padrões de cor e forma de `src/theme.js` vieram dessa referência.
