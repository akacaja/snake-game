// Snake engine: pure game rules. No timers, no DOM. The UI calls step() on a clock.

const VECTORS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
const MAX_QUEUED_TURNS = 2;

export function createEngine(options = {}) {
  const {
    cols,
    rows,
    wrap = false,
    startLength = 3,
    speed: baseSpeed = 5,
    speedStep = 0.3,
    maxSpeed = 14,
    startPaused = false,
    random = Math.random,
    initial = null, // { snake: [{x,y}...] head first, direction, food } for tests
  } = options;

  if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 1 || rows < 1) {
    throw new RangeError('createEngine: cols and rows must be positive integers');
  }

  const listeners = new Map();
  let snake;
  let direction;
  let queue;
  let food;
  let score;
  let status;
  let speed;
  let reason;

  function emit(type, detail) {
    const set = listeners.get(type);
    if (!set) return;
    for (const fn of [...set]) fn(detail);
  }

  function placeFood() {
    const taken = new Set(snake.map((c) => c.y * cols + c.x));
    const free = [];
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (!taken.has(y * cols + x)) free.push({ x, y });
      }
    }
    if (free.length === 0) {
      food = null;
      return false;
    }
    const index = Math.min(free.length - 1, Math.floor(random() * free.length));
    food = free[index];
    return true;
  }

  function reset() {
    if (initial) {
      snake = initial.snake.map((c) => ({ x: c.x, y: c.y }));
      direction = initial.direction || 'right';
    } else {
      const length = Math.max(1, Math.min(startLength, cols));
      const headX = Math.min(cols - 1, Math.max(length - 1, Math.floor(cols / 2)));
      const y = Math.floor((rows - 1) / 2);
      snake = [];
      for (let i = 0; i < length; i += 1) snake.push({ x: headX - i, y });
      direction = 'right';
    }
    queue = [];
    score = 0;
    speed = baseSpeed;
    reason = null;
    status = 'running';
    if (initial && initial.food) food = { ...initial.food };
    else placeFood();
  }

  function finish(why) {
    status = why === 'full' ? 'won' : 'over';
    reason = why;
    emit('gameover', { score, reason: why });
    return false;
  }

  function step() {
    if (status !== 'running') return false;
    if (queue.length) direction = queue.shift();
    const vector = VECTORS[direction];
    const head = snake[0];
    let nx = head.x + vector.x;
    let ny = head.y + vector.y;
    if (wrap) {
      nx = (nx + cols) % cols;
      ny = (ny + rows) % rows;
    } else if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) {
      return finish('wall');
    }
    const eating = food !== null && food.x === nx && food.y === ny;
    // The tail cell is free to enter unless the snake grows this move.
    const staying = eating ? snake : snake.slice(0, -1);
    if (staying.some((c) => c.x === nx && c.y === ny)) return finish('self');

    snake.unshift({ x: nx, y: ny });
    const removedTail = eating ? null : snake.pop();
    emit('step', { head: { x: nx, y: ny }, removedTail: removedTail && { ...removedTail }, ate: eating });

    if (eating) {
      score += 1;
      speed = Math.min(maxSpeed, Math.round((speed + speedStep) * 1e6) / 1e6);
      emit('eat', { score, length: snake.length });
      emit('score', { score });
      if (!placeFood()) finish('full');
    }
    return true;
  }

  function turn(dir) {
    if (status !== 'running' || !VECTORS[dir]) return false;
    const last = queue.length ? queue[queue.length - 1] : direction;
    if (dir === last || dir === OPPOSITE[last]) return false;
    if (queue.length >= MAX_QUEUED_TURNS) return false;
    queue.push(dir);
    return true;
  }

  function pause() {
    if (status !== 'running') return;
    status = 'paused';
    emit('pause');
  }

  function resume() {
    if (status !== 'paused') return;
    status = 'running';
    emit('resume');
  }

  function togglePause() {
    if (status === 'running') pause();
    else if (status === 'paused') resume();
  }

  function restart() {
    reset();
    emit('restart');
  }

  function getState() {
    return {
      cols,
      rows,
      snake: snake.map((c) => ({ x: c.x, y: c.y })),
      direction,
      food: food && { x: food.x, y: food.y },
      score,
      status,
      reason,
      speed,
      interval: 1000 / speed,
    };
  }

  function on(type, fn) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(fn);
    return () => listeners.get(type).delete(fn);
  }

  reset();
  if (startPaused) status = 'paused';

  return { step, turn, pause, resume, togglePause, restart, getState, on };
}
