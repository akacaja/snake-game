/* snake-game | MIT (c) 2026 Carolina Cajazeira (@akacaja) */
// Skin "natal" (Christmas) for <snake-game>: food emojis and a palette. Optional file.
// Load it with <script src="skins/natal.js"></script>, before or after the game, then use skin="natal".
(globalThis.snakeGameSkins = globalThis.snakeGameSkins || []).push(['natal', {
  foods: [
    { emoji: '🎄', names: { en: 'Christmas tree', pt: 'árvore de Natal' } },
    { emoji: '🎅🏼', names: { en: 'Santa Claus', pt: 'Papai Noel' } },
    { emoji: '🫎', names: { en: 'moose', pt: 'alce' } },
    { emoji: '⛄️', names: { en: 'snowman', pt: 'boneco de neve' } },
    { emoji: '🎁', names: { en: 'gift', pt: 'presente' } },
    { emoji: '🥨', names: { en: 'pretzel', pt: 'pretzel' } },
    { emoji: '🌠', names: { en: 'shooting star', pt: 'estrela cadente' } },
  ],
  palette: {
    color: '#146b3a', // snake: pine green
    'grid-color': '#e8d9c4', // grid: warm sand
    background: '#fdf6ec', // board: cream
    backdrop: 'rgb(253 246 236 / 0.94)', // behind the game in modal mode
    'text-color': '#1a1a1a', // texts
    'focus-color': '#146b3a', // keyboard focus outline
    'food-color': '#c62828', // food circle, if no emoji can be shown
    'food-halo-color': 'rgb(198 40 40 / 0.35)', // glow of that circle
  },
}]);
