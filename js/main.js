import {
  TILE_SIZE,
  GAME_WIDTH,
  GAME_HEIGHT,
  MAX_DELTA_TIME,
  BACKGROUND_COLOR,
  GRID_COLOR,
} from './config.js';
import { input, initInput, updateInput } from './input.js';
import { Player } from './player.js';
import { GameMap } from './map.js';

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

// 隨機生成地圖，每次重新整理頁面都會不一樣 (random map on every page load)
const map = new GameMap();

// 玩家出生在地圖指定的出生點 (spawn player at the map's spawn point)
const spawn = map.getSpawnPosition();
const player = new Player(spawn.x, spawn.y);

// 畫面上所有的子彈 (all bullets on screen)
let bullets = [];

/**
 * 更新遊戲狀態 (update game state)
 * @param {number} dt 經過秒數 (delta time)
 */
function update(dt) {
  updateInput(player);
  player.update(dt, input, bullets, map);

  // 移動每一顆子彈 (move every bullet)
  for (const bullet of bullets) {
    bullet.update(dt, map);
  }

  // 只留下還活著的子彈，飛出畫面的丟掉 (remove dead bullets)
  bullets = bullets.filter((bullet) => bullet.alive);
}

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
  map.draw(ctx);

  for (const bullet of bullets) {
    bullet.draw(ctx);
  }

  player.draw(ctx);
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

  update(dt);
  draw();

  // 預約下一幀 (schedule next frame)
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
