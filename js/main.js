import {
  TILE_SIZE,
  GAME_WIDTH,
  GAME_HEIGHT,
  MAX_DELTA_TIME,
  BACKGROUND_COLOR,
  GRID_COLOR,
  ENEMY_COUNT,
  GAME_OVER_OVERLAY_COLOR,
  GAME_OVER_TEXT_COLOR,
} from './config.js';
import { input, initInput, updateInput } from './input.js';
import { Player } from './player.js';
import { Enemy } from './enemy.js';
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

// 敵人生在離玩家夠遠的隨機空地 (spawn enemies far from the player)
let enemies = [];
for (const pos of map.getEnemySpawnPositions(ENEMY_COUNT)) {
  enemies.push(new Enemy(pos.x, pos.y));
}

// 畫面上所有的子彈（玩家和敵人的都在這裡）(all bullets on screen)
let bullets = [];

/**
 * 兩個圓有沒有重疊：圓心距離 < 兩個半徑相加 (circle-circle collision)
 * @param {{x: number, y: number, radius: number}} a
 * @param {{x: number, y: number, radius: number}} b
 * @returns {boolean}
 */
function circlesOverlap(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y) < a.radius + b.radius;
}

/**
 * 檢查子彈有沒有打中角色 (check bullet hits)
 * 玩家的子彈只打敵人，敵人的子彈只打玩家，不會打到自己人。
 */
function checkBulletHits() {
  for (const bullet of bullets) {
    if (!bullet.alive) continue;

    if (bullet.owner === 'player') {
      for (const enemy of enemies) {
        if (circlesOverlap(bullet, enemy)) {
          enemy.takeDamage(bullet.damage);
          bullet.alive = false;
          break; // 一顆子彈只打中一個敵人 (one bullet, one hit)
        }
      }
    } else if (circlesOverlap(bullet, player)) {
      player.takeDamage(bullet.damage);
      bullet.alive = false;
    }
  }
}

/**
 * 更新遊戲狀態 (update game state)
 * @param {number} dt 經過秒數 (delta time)
 */
function update(dt) {
  // 玩家死了就暫停所有動作（第 5 步會做重新開始）(freeze when player is dead)
  if (player.isDead()) return;

  updateInput(player);
  player.update(dt, input, bullets, map);

  for (const enemy of enemies) {
    enemy.update(dt, player, bullets, map);
  }

  // 移動每一顆子彈，撞牆的會被標記 (move bullets)
  for (const bullet of bullets) {
    bullet.update(dt, map);
  }

  checkBulletHits();

  // 清除死掉的子彈和敵人 (remove dead bullets and enemies)
  bullets = bullets.filter((bullet) => bullet.alive);
  enemies = enemies.filter((enemy) => !enemy.isDead());
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
 * 玩家死亡時，蓋一層半透明黑色並顯示文字 (game over overlay)
 */
function drawGameOver() {
  ctx.fillStyle = GAME_OVER_OVERLAY_COLOR;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.fillStyle = GAME_OVER_TEXT_COLOR;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 48px sans-serif';
  ctx.fillText('GAME OVER', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20);
  ctx.font = '20px sans-serif';
  ctx.fillText('按 F5 重新開始', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30);
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

  for (const enemy of enemies) {
    enemy.draw(ctx);
  }

  player.draw(ctx);

  if (player.isDead()) {
    drawGameOver();
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

  update(dt);
  draw();

  // 預約下一幀 (schedule next frame)
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
