// Skin "halloween" for <snake-game>: food emojis and a palette. Optional file.
// Load it with <script src="skins/halloween.js"></script>, before or after the game, then use skin="halloween".
(globalThis.snakeGameSkins = globalThis.snakeGameSkins || []).push(['halloween', {
  foods: [
    { emoji: '👻', names: { en: 'ghost', pt: 'fantasma' } },
    { emoji: '💀', names: { en: 'skull', pt: 'caveira' } },
    { emoji: '🎃', names: { en: 'jack-o\'-lantern', pt: 'abóbora de Halloween' } },
    { emoji: '🧛🏼', names: { en: 'vampire', pt: 'vampiro' } },
    { emoji: '🍭', names: { en: 'lollipop', pt: 'pirulito' } },
    { emoji: '🍬', names: { en: 'candy', pt: 'bala' } },
    { emoji: '🍫', names: { en: 'chocolate bar', pt: 'chocolate' } },
  ],
  palette: {
    color: '#ff8a1f', // snake: pumpkin
    'grid-color': '#3a2f4a', // grid: dusk purple
    background: '#1b1426', // board: night
    backdrop: 'rgb(27 20 38 / 0.94)', // behind the game in modal mode
    'text-color': '#f5ecff', // texts
    'focus-color': '#ff8a1f', // keyboard focus outline
    'food-color': '#a855f7', // food circle, if no emoji can be shown
    'food-halo-color': 'rgb(168 85 247 / 0.35)', // glow of that circle
  },
}]);
