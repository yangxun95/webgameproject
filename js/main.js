import {
  TILE_SIZE,
  MAP_COLS,
  MAP_ROWS,
  GAME_WIDTH,
  GAME_HEIGHT,
  MAX_DELTA_TIME,
  BACKGROUND_COLOR,
  GRID_COLOR,
} from './config.js';
import { initInput } from './input.js';
import { Game } from './game.js';
import { loadImages, getImage, PIXEL_ART } from './assets.js';

// main.js 只負責「啟動」：準備 canvas、縮放、game loop。
// 遊戲內容（關卡、玩家、敵人）都交給 game.js。(main.js only boots the game)

// ===== 取得 canvas 和畫筆 (get canvas & context) =====
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// canvas 內部解析度固定為邏輯尺寸 896×416 (fixed logical resolution)
canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

/**
 * 依視窗大小等比例縮放 canvas，多出來的地方是黑邊 (letterbox scaling)
 * 只改「顯示大小」，遊戲邏輯永遠用 896×416 計算。
 */
function resizeCanvas() {
  const scale = Math.min(
    window.innerWidth / GAME_WIDTH,
    window.innerHeight / GAME_HEIGHT
  );
  canvas.style.width = `${GAME_WIDTH * scale}px`;
  canvas.style.height = `${GAME_HEIGHT * scale}px`;
}

// 像素風格圖片放大時不要變模糊 (keep pixel art sharp when scaled)
// 這個設定在改 canvas.width 之後會被重設，所以放在設定尺寸之後 (must be set after resizing the canvas)
ctx.imageSmoothingEnabled = !PIXEL_ART;

// ===== 初始化 (initialize) =====
loadImages();   // 開始下載美術圖片，不用等它，遊戲先開始 (start loading images, don't wait)
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
  // 畫面震動時，地板也要跟著遊戲世界一起偏移 (the floor shakes together with the world)
  // 先塗黑底，偏移後露出的邊緣才不會留下上一幀的殘影 (black first so edges don't show the last frame)
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  ctx.save();
  ctx.translate(game.shakeX, game.shakeY);
  drawFloor();
  ctx.restore();

  game.draw(ctx);
}

/**
 * 畫地板：有地板圖片就一格一格鋪滿，沒有就用背景色加格線 (draw floor: tiled image or color + grid)
 * 如果也有 floor_alt，就和 floor 交錯成棋盤格 (checkerboard when floor_alt exists)
 * 地板會蓋掉上一幀的整個畫面，所以每幀一定要先畫它 (also clears the previous frame)
 */
function drawFloor() {
  const floorImage = getImage('floor');

  if (floorImage === null) {
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    drawGrid();
    return;
  }

  // 沒有第二種地板就全部用同一張 (no floor_alt → use floor everywhere)
  let altImage = getImage('floor_alt');
  if (altImage === null) {
    altImage = floorImage;
  }

  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLS; col++) {
      // (row + col) 是偶數畫 floor、奇數畫 floor_alt，就會變成棋盤格 (even → floor, odd → floor_alt)
      const image = (row + col) % 2 === 0 ? floorImage : altImage;
      ctx.drawImage(image, col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }
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
