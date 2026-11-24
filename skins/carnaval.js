/* snake-game | MIT (c) 2026 Carolina Cajazeira (@akacaja) */
// Skin "carnaval" (Carnival) for <snake-game>: food emojis and a palette. Optional file.
// Load it with <script src="skins/carnaval.js"></script>, before or after the game, then use skin="carnaval".
(globalThis.snakeGameSkins = globalThis.snakeGameSkins || []).push(['carnaval', {
  foods: [
    { emoji: '💃', names: { en: 'woman dancing', pt: 'dançarina' } },
    { emoji: '🎉', names: { en: 'party popper', pt: 'lança-confete' } },
    { emoji: '🎊', names: { en: 'confetti ball', pt: 'bola de confete' } },
    { emoji: '👯‍♂️', names: { en: 'men dancing', pt: 'dançarinos' } },
    { emoji: '🪅', names: { en: 'piñata', pt: 'piñata' } },
    { emoji: '🕺', names: { en: 'man dancing', pt: 'dançarino' } },
  ],
  palette: {
    color: '#6a1b9a', // snake: deep purple
    'grid-color': '#f2d4e6', // grid: soft pink
    background: '#fff7fb', // board: almost white
    backdrop: 'rgb(255 247 251 / 0.94)', // behind the game in modal mode
    'text-color': '#1a1a1a', // texts
    'focus-color': '#6a1b9a', // keyboard focus outline
    'food-color': '#d81b60', // food circle, if no emoji can be shown
    'food-halo-color': 'rgb(216 27 96 / 0.35)', // glow of that circle
  },
}]);
