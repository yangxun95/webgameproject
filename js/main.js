import {
  TILE_SIZE,
  GAME_WIDTH,
  GAME_HEIGHT,
  MAX_DELTA_TIME,
  BACKGROUND_COLOR,
  GRID_COLOR,
} from './config.js';
import { initInput } from './input.js';
import { Game } from './game.js';

// main.js 只負責「啟動」：準備 canvas、縮放、game loop。
// 遊戲內容（關卡、玩家、敵人）都交給 game.js。(main.js only boots the game)

// ===== 取得 canvas 和畫筆 (get canvas & context) =====
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// canvas 內部解析度固定為邏輯尺寸 800×608 (fixed logical resolution)
canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

/**
 * 依視窗大小等比例縮放 canvas，多出來的地方是黑邊 (letterbox scaling)
 * 只改「顯示大小」，遊戲邏輯永遠用 800×608 計算。
 */
function resizeCanvas() {
  const scale = Math.min(
    window.innerWidth / GAME_WIDTH,
    window.innerHeight / GAME_HEIGHT
  );
  canvas.style.width = `${GAME_WIDTH * scale}px`;
  canvas.style.height = `${GAME_HEIGHT * scale}px`;
}

// ===== 初始化 (initialize) =====
initInput(canvas);
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const game = new Game();

// 手機直向時暫停遊戲；條件和 style.css 的直向提示一樣 (pause in portrait, same rule as the CSS hint)
// matchMedia 讓 JS 也能用 CSS media query 判斷 (use a CSS media query from JS)
const portraitQuery = window.matchMedia('(orientation: portrait) and (pointer: coarse)');

/**
 * 畫格線，方便看出 tile 的大小 (draw tile grid)
 */
function drawGrid() {
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= GAME_WIDTH; x += TILE_SIZE) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, GAME_HEIGHT);
  }
  for (let y = 0; y <= GAME_HEIGHT; y += TILE_SIZE) {
    ctx.moveTo(0, y);
    ctx.lineTo(GAME_WIDTH, y);
  }
  ctx.stroke();
}

/**
 * 畫出整個畫面 (render one frame)
 */
function draw() {
  // 先用背景色蓋掉上一幀的畫面 (clear previous frame)
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  drawGrid();
  game.draw(ctx);
}

// ===== Game loop =====
let lastTime = performance.now();

/**
 * 每一幀由瀏覽器呼叫一次 (called by the browser every frame)
 * @param {number} currentTime 目前時間，單位毫秒 (timestamp in ms)
 */
function gameLoop(currentTime) {
  // 計算 delta time：毫秒換成秒 (ms → seconds)
  let dt = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  // 避免 dt 太大（例如切換分頁後回來）(cap delta time)
  dt = Math.min(dt, MAX_DELTA_TIME);

  // 直向時畫面被提示蓋住，不更新遊戲，免得玩家看不到的時候被打死 (don't update while the rotate hint is shown)
  if (!portraitQuery.matches) {
    game.update(dt);
  }
  draw();

  // 預約下一幀 (schedule next frame)
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
