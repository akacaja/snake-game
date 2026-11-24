# snake-game

[English](README.md)

Demo ao vivo: https://akacaja.github.io/snake-game/demo/

Um jogo da cobrinha como web component. Adicione um script, adicione uma tag e o jogo aparece. Sem dependências, sem framework.

```html
<script src="dist/snake-game.js"></script>
<snake-game open></snake-game>
```

Por padrão o jogo começa fechado. O atributo `open` faz ele abrir sozinho, como um modal sobre a página.

## Instalação

Há duas formas. Escolha uma.

**A. Um arquivo só (funciona com duplo clique, sem servidor).** Copie `dist/snake-game.js` para o seu site e carregue com uma tag de script normal. Ele registra `<snake-game>` e expõe um global `SnakeGame`. Tamanho: **14,7 KB** comprimido com gzip (`dist/snake-game.js`, medido com o zlib do Node, nível padrão).

```html
<script src="snake-game.js"></script>
```

**B. Módulos ES.** Copie a pasta `src/` e importe. Isso precisa de um servidor web, porque os navegadores bloqueiam módulos em `file://`.

```html
<script type="module" src="src/snake-game.js"></script>
```

O arquivo `dist/snake-game.js` é gerado. Não edite. Ele não tem comentários (o código de `src/` tem). Depois de mudar qualquer coisa em `src/`, rode `npm run build`.

Suporte de navegadores: o modal usa o elemento nativo `<dialog>`, então você precisa de um navegador de 2022 ou mais novo (Safari 15.4+, Firefox 98+, Chrome 99+). Quando a página é aberta por `file://`, alguns navegadores (o Safari em especial) podem não guardar a melhor pontuação.

## Formas de abrir o jogo

```html
<!-- sempre aberto, sobre a página -->
<snake-game open></snake-game>

<!-- a partir de um botão -->
<button onclick="document.querySelector('snake-game').open()">Play</button>
<snake-game></snake-game>

<!-- a partir de uma tecla ou de um código secreto -->
<script>
  let typed = '';
  addEventListener('keydown', (e) => {
    if (e.key.length !== 1) return;
    if (e.target.closest('input, textarea, select, [contenteditable]')) return;
    typed = (typed + e.key.toLowerCase()).slice(-5);
    if (typed === 'snake') document.querySelector('snake-game').open();
  });
</script>

<!-- numa página 404, dentro da página em vez de sobre ela -->
<snake-game mode="inline" open></snake-game>
```

No modo inline o jogo ocupa a largura do seu contêiner, também quando o contêiner é uma linha flex ou grid (a tag recebe `width: 100%`). Para usar outra largura, defina na tag no seu CSS, por exemplo `snake-game { width: 480px; }`. A sua regra vence a padrão. Toda vez que o jogo abre, começa uma partida nova. Se o contêiner ainda não tem tamanho (por exemplo, está escondido), o jogo começa no primeiro quadro com tamanho, e `pause()` e `restart()` não fazem nada até lá. Escape ou o botão de fechar fecha o jogo.

## Atributos

Valores que não são válidos voltam ao padrão, com um aviso no console.

| Atributo | Valores | Padrão | O que faz |
| --- | --- | --- | --- |
| `open` | booleano | fechado | Abre o jogo. `open()` e `close()` mantêm o atributo em sincronia. |
| `mode` | `modal` / `inline` | `modal` | Sobre a página, ou no lugar da tag. Mudar com o jogo aberto fecha e reabre o jogo (emite `snake-close` e `snake-open`). |
| `grid` | `dots` / `squares` / `lines` / `none` | `dots` | Pontos, quadradinhos preenchidos, papel quadriculado, ou nada. |
| `snake` | `taper` / `uniform` | `taper` | O corpo fica mais fino em direção à cauda, ou mantém o mesmo tamanho. |
| `food` | `circle` / `square` | `circle` | Forma da comida. |
| `food-halo` | `soft` / `none` | `soft` | Brilho em volta da comida. |
| `intro` | `wave` / `cascade` / `none` | `wave` | Como a grade aparece quando o jogo abre. |
| `transitions` | `on` / `off` | `on` | Encolhimento suave da ponta da cauda. |
| `skin` | nome de uma skin | nenhuma | Tema da comida (emoji) e das cores. Veja [Skins](#skins). |
| `skin-palette` | `on` / `off` | `on` | `off` mantém as cores do seu site e usa só os emojis da skin. |
| `wrap` | booleano | desligado | Atravessar as paredes em vez de perder. Vale a partir do próximo reinício. |
| `cols`, `rows` | inteiros | automático | Tamanho fixo da grade. Automático quer dizer "caber no espaço" (no mínimo 5). |
| `speed` | movimentos por segundo | `5` | Velocidade inicial. |
| `speed-step` | número | `0.3` | Velocidade somada a cada comida. |
| `max-speed` | número | `14` | Limite de velocidade. |
| `start-length` | inteiro | `3` | Tamanho inicial da cobra. |
| `best-key` | texto | `snake-game-best` | Chave do `localStorage` da melhor pontuação. Vazio desliga. |

### Textos

Todos os textos podem ser trocados. Use `{score}` e `{best}` onde se aplicam.

| Atributo | Padrão |
| --- | --- |
| `text-title` | `Snake game` |
| `text-instructions` | `Use arrow keys or WASD to move, or swipe on touch screens. Space pauses. Escape closes.` |
| `text-score` | `{score}` |
| `text-best` | `Best {best}` |
| `text-game-over-one` | `Game over, {score} point` |
| `text-game-over-other` | `Game over, {score} points` |
| `text-play-again` | `Play again` |
| `text-pause` / `text-resume` | `Pause` / `Resume` |
| `text-paused` | `Paused. Press space to continue.` |
| `text-close` | `Close game` |
| `text-ate` | `Score {score}` (lido por leitores de tela quando a cobra come) |
| `text-ate-food` | `Ate {food}. Score {score}` (o mesmo, quando a comida é um emoji de uma skin; `{food}` é o nome dela) |

O texto de fim de jogo depende do número (`Intl.PluralRules`). O idioma vem do atributo `lang` mais próximo (a própria tag, um elemento pai, ou `<html lang>`), depois `en`. Para idiomas com mais formas, defina também `text-game-over-zero`, `-two`, `-few` ou `-many`. Uma forma que faltar usa `-other`.

```html
<snake-game lang="pt-BR"
  text-game-over-one="Fim de jogo, {score} ponto"
  text-game-over-other="Fim de jogo, {score} pontos"></snake-game>
```

## Métodos e propriedades

`open()`, `close()`, `toggle()`, `pause()`, `resume()`, `togglePause()`, `restart()`, `refreshStyles()`.

Propriedades: `isOpen` (somente leitura), `engine` (somente leitura, o jogo atual), `renderers` (leitura e escrita, veja abaixo).

## Eventos

Todos são `CustomEvent`s que sobem pela página (bubble) e atravessam o shadow DOM. Os dados ficam em `event.detail`.

| Evento | detail |
| --- | --- |
| `snake-open`, `snake-close` | nenhum |
| `snake-eat` | `{ score, length }` |
| `snake-score` | `{ score, best }` |
| `snake-gameover` | `{ score, best, reason }` com `reason` sendo `wall`, `self` ou `full` |
| `snake-pause`, `snake-resume`, `snake-restart` | nenhum |

Exceção: se o elemento for removido da página com o jogo aberto, ele ainda emite `snake-close`, mas o elemento já está fora da página, então o evento não chega ao `document`. Para pegar esse caso, escute no próprio elemento.

## Aparência: design tokens

Todo valor visual é uma variável CSS. Defina na tag, num elemento pai ou em `:root`. Os padrões ficam em `src/theme.js`, com um comentário por token.

```css
snake-game { --snake-color: rebeccapurple; --snake-spacing: 40px; }
```

| Token | O que é |
| --- | --- |
| `--snake-grid-color`, `--snake-grid-dot-size`, `--snake-grid-line-width` | Cor da grade, tamanho do ponto, espessura da linha |
| `--snake-spacing` | Distância entre os centros das células |
| `--snake-color`, `--snake-gap`, `--snake-head-size`, `--snake-tail-size` | Cobra e o espaço entre as bolinhas |
| `--snake-food-color`, `--snake-food-size`, `--snake-food-halo-color`, `--snake-food-halo-size`, `--snake-food-emoji-size` | Comida e o seu brilho. `--snake-food-emoji-size`: tamanho de uma comida em emoji, como fração do espaçamento (porcentagem, padrão `75%`, ou seja, 24px quando o espaçamento é 32px; encolhe junto com a grade) |
| `--snake-background`, `--snake-backdrop` | Fundo do tabuleiro e a cobertura da página no modo modal |
| `--snake-board-width`, `--snake-board-height`, `--snake-board-share` | Tamanho máximo do tabuleiro e a parte da tela do celular que ele ocupa (porcentagem, padrão `75%`) |
| `--snake-text-color`, `--snake-font`, `--snake-font-size` | Textos |
| `--snake-focus-color`, `--snake-button-size` | Contorno do foco do teclado, tamanho mínimo dos botões |
| `--snake-duration`, `--snake-intro-duration` | Transições e entrada da grade |

Por padrão, a cabeça é o espaçamento menos `--snake-gap` (30px) e a ponta do rabo é 80% da cabeça (24px, e acompanha uma cabeça que você definir), então o vão na tela entre a cabeça e a próxima bolinha é de 2px, mesmo quando a grade encolhe para caber num tabuleiro pequeno. Com `snake="taper"` o rabo afina e o vão cresce até cerca de 8px na ponta; com `snake="uniform"` é 2px em todo o corpo. `--snake-gap: 0` faz as bolinhas se encostarem e um valor negativo faz elas se sobreporem. Você ainda pode definir `--snake-head-size` e `--snake-tail-size` com valores fixos, como `16px` e `8px`.

No celular (tela de toque, lado menor até 540px), no modo modal, o tabuleiro ocupa `--snake-board-share` da tela: 75% da largura com o celular deitado (placar e botões à direita) e 75% da altura com o celular em pé (placar em cima). Girar o celular mantém a partida. Computadores, tablets e o modo `inline` mantêm o layout normal.

As mudanças são percebidas enquanto o jogo está aberto. Você pode forçar com `refreshStyles()`. Mantenha a cor do texto com contraste de pelo menos 4,5:1 com o fundo (a página de teste avisa).

## Skins

Uma skin é um tema opcional: a comida vira um emoji (um diferente a cada vez, nunca o mesmo duas vezes seguidas) e as cores mudam. Sem `skin`, o jogo fica igual ao de sempre. Três skins vêm na pasta `skins/`: `natal`, `halloween` e `carnaval`. Elas são arquivos separados, então não estão em `dist/snake-game.js`. Carregue o arquivo que quiser, antes ou depois do jogo, e use o atributo:

```html
<script src="skins/natal.js"></script>
<script src="dist/snake-game.js"></script>
<snake-game skin="natal" open></snake-game>
```

- Cores: as suas variáveis `--snake-*` vencem, depois vêm as cores da skin, depois os padrões. `skin-palette="off"` mantém as suas cores e usa só os emojis.
- Um emoji que o aparelho não consegue mostrar fica fora do sorteio. Se nenhum puder ser mostrado, aparece o círculo ou quadrado normal (com a cor de comida da paleta). Um nome que não está registrado, por exemplo porque o arquivo não carregou, dá um aviso no console e o jogo normal.
- Sua própria skin: adicione `[nome, skin]` em `globalThis.snakeGameSkins` (funciona em qualquer ordem, também com módulos ES) ou chame `SnakeGame.registerSkin(nome, skin)`, que devolve `true` ou `false`. A paleta aceita só tokens de cor, sem o prefixo `--snake-`. Cada comida precisa de um emoji e de um nome (`en` e `pt`, por exemplo). O que não for válido é ignorado, com um aviso.

```js
(globalThis.snakeGameSkins = globalThis.snakeGameSkins || []).push(['pizza', {
  foods: [{ emoji: '🍕', names: { en: 'pizza', pt: 'pizza' } }],
  palette: { color: '#7a2e0e', 'food-color': '#c0392b' },
}]);
```

- Seu próprio desenho: numa comida em emoji, `scene.foodItem.emoji` traz o texto (senão é `null`), e `foodItem.size` já é o tamanho do emoji.
- Acessibilidade: quando a cobra come um emoji, o nome é lido no idioma da página (`text-ate-food`). Com `prefers-reduced-motion`, nada muda: o emoji aparece sem animação, como o resto.

## Seu próprio desenho

Troque qualquer um entre `grid`, `snake`, `food`. O que você deixar de fora mantém o desenho padrão.

```js
const game = document.querySelector('snake-game');
game.renderers = {
  snake(ctx, scene) {
    ctx.fillStyle = scene.tokens.color;
    for (const s of scene.segments) ctx.fillRect(s.cx - s.size / 2, s.cy - s.size / 2, s.size, s.size);
  },
};
```

Ordem: limpar, grade, comida, cobra. O `ctx` já está na escala de pixels CSS. O `scene` tem `cols`, `rows`, `spacing`, `scale`, `width`, `height`, `dpr`, `center(x, y)`, `tokens` (já resolvidos: cores como texto, tamanhos em px, tempos em ms), `options`, `state`, `time`, `cells`, `segments` e `foodItem`. Use `scene.tokens` em vez de valores fixos. Se a sua função lançar um erro, o desenho padrão é usado e o erro aparece uma vez no console. Os padrões são exportados como `drawGrid`, `drawSnake` e `drawFood`.

## Só o motor

As regras não têm código de navegador. Use para testes ou para outra interface.

```js
import { createEngine } from './src/engine.js';
const engine = createEngine({ cols: 12, rows: 12 });
engine.turn('down');
engine.step();            // você decide o relógio
console.log(engine.getState());
```

Pelo arquivo único é `SnakeGame.createEngine(...)`. O global `SnakeGame` também tem `SnakeGameElement`, as três funções de desenho, `registerSkin`, `directionFromKey` e `directionFromSwipe`. Ele nunca substitui um `window.SnakeGame` que já exista.

## Controles e acessibilidade

- Teclado: setas ou WASD, Espaço pausa, Escape fecha. As teclas só agem com o jogo aberto (no modo `inline`, enquanto ele tem o foco).
- Toque: deslize o dedo. A página não rola enquanto você desliza sobre o tabuleiro.
- O tabuleiro tem rótulo, pontuações e fim de jogo são anunciados, os botões são botões de verdade com pelo menos 44 px, e o contorno do foco é visível.
- Com `prefers-reduced-motion`, nada se anima e o jogo abre pausado.

## Desenvolvimento

```sh
npm test                 # testes automáticos (Node, sem dependências)
npm run build            # gera de novo o dist/snake-game.js
node scripts/serve.js    # http://localhost:8000/demo/ e /examples/module.html
npm run serve:pages      # o mesmo, dentro de /snake-game/ como no GitHub Pages
```

Quando o servidor liga, ele também mostra o endereço da sua rede (por exemplo `http://192.168.0.12:8000/demo/`). Abra num celular na mesma rede Wi-Fi para testar o jogo com o dedo.

`python3 -m http.server 8000` também funciona. `examples/minimal.html` usa o arquivo único e abre com duplo clique. `demo/index.html` é uma página de teste com todas as opções, os tokens, um aviso de contraste e um registro de eventos.

Mudanças: veja o [CHANGELOG.md](CHANGELOG.md).

## Licença

MIT. Veja `LICENSE`.
