import {
  TILE_SIZE,
  MAP_COLS,
  MAP_ROWS,
  ROCK_COUNT,
  CRATE_COUNT,
  TREE_COUNT,
  TRAP_COUNT,
  PLAYER_SPAWN_COL,
  PLAYER_SPAWN_ROW,
  SAFE_ZONE_RADIUS,
  MAP_GEN_MAX_ATTEMPTS,
  CRATE_COLOR,
  CRATE_EDGE_COLOR,
  ROCK_COLOR,
  ROCK_HIGHLIGHT_COLOR,
  TREE_COLOR,
  TREE_HIGHLIGHT_COLOR,
  TRAP_COLOR,
  TRAP_SPIKE_COLOR,
} from './config.js';

// 每一種 tile 的特性，對應 AGENTS.md 的地圖表格 (tile properties)
// blocksMovement：會不會擋住移動；blocksBullet：會不會擋住子彈
const TILE_PROPS = {
  empty: { blocksMovement: false, blocksBullet: false },
  crate: { blocksMovement: true, blocksBullet: true },
  rock: { blocksMovement: true, blocksBullet: true },
  tree: { blocksMovement: true, blocksBullet: false },
  trap: { blocksMovement: false, blocksBullet: false },
};

// 上、下、左、右四個方向，BFS 用 (4 directions for BFS)
const DIRECTIONS = [
  { dCol: 0, dRow: -1 },
  { dCol: 0, dRow: 1 },
  { dCol: -1, dRow: 0 },
  { dCol: 1, dRow: 0 },
];

/**
 * 產生 0 ~ max-1 的隨機整數 (random integer from 0 to max - 1)
 * @param {number} max 上限（不含）
 * @returns {number}
 */
function randomInt(max) {
  return Math.floor(Math.random() * max);
}

// 遊戲地圖 (game map)
// 取名 GameMap 而不是 Map，因為 JS 已經內建一個叫 Map 的資料結構。
export class GameMap {
  constructor() {
    // tiles[row][col]：先選列（y）再選欄（x）(2D array, row first)
    this.tiles = [];
    this.generate();
  }

  // ===== 生成 (generation) =====

  /**
   * 隨機生成地圖，直到所有能走的格子都互相連通 (generate until fully connected)
   */
  generate() {
    for (let attempt = 1; attempt <= MAP_GEN_MAX_ATTEMPTS; attempt++) {
      this.fillEmpty();
      this.placeRandom('rock', ROCK_COUNT);
      this.placeRandom('crate', CRATE_COUNT);
      this.placeRandom('tree', TREE_COUNT);
      this.placeRandom('trap', TRAP_COUNT);

      if (this.isFullyConnected()) {
        return; // 成功 (success)
      }
    }

    // 理論上幾乎不會發生；真的失敗就給一張空地圖，至少遊戲能玩 (fallback)
    console.warn('地圖生成失敗，改用空地圖 (map generation failed)');
    this.fillEmpty();
  }

  /**
   * 把整張地圖清成空地 (fill the whole map with empty tiles)
   */
  fillEmpty() {
    this.tiles = [];
    for (let row = 0; row < MAP_ROWS; row++) {
      const rowTiles = [];
      for (let col = 0; col < MAP_COLS; col++) {
        rowTiles.push('empty');
      }
      this.tiles.push(rowTiles);
    }
  }

  /**
   * 在隨機的空格子放指定數量的物件，避開出生點安全區 (place objects randomly)
   * @param {string} type tile 種類，例如 'rock'
   * @param {number} count 要放幾個
   */
  placeRandom(type, count) {
    let placed = 0;
    let tries = 0;

    // tries 上限：避免空格不夠時變成無窮迴圈 (avoid infinite loop)
    while (placed < count && tries < count * 20) {
      tries++;
      const col = randomInt(MAP_COLS);
      const row = randomInt(MAP_ROWS);

      if (this.tiles[row][col] !== 'empty') continue;
      if (this.isInSafeZone(col, row)) continue;

      this.tiles[row][col] = type;
      placed++;
    }
  }

  /**
   * 這格是否在玩家出生點附近 (is this tile near the spawn point)
   * @param {number} col 欄
   * @param {number} row 列
   * @returns {boolean}
   */
  isInSafeZone(col, row) {
    return (
      Math.abs(col - PLAYER_SPAWN_COL) <= SAFE_ZONE_RADIUS &&
      Math.abs(row - PLAYER_SPAWN_ROW) <= SAFE_ZONE_RADIUS
    );
  }

  // ===== BFS 連通性檢查 (connectivity check) =====

  /**
   * 用 BFS 從出生點往外走，檢查是否每個能走的格子都走得到 (BFS flood fill)
   * 如果有格子被石頭、樹、箱子圍起來，之後敵人或出口生在那裡就打不到了。
   * @returns {boolean} 全部連通回傳 true
   */
  isFullyConnected() {
    // visited[row][col]：這格是否已經走過 (visited table)
    const visited = [];
    for (let row = 0; row < MAP_ROWS; row++) {
      visited.push(new Array(MAP_COLS).fill(false));
    }

    // 從出生點開始 (start from spawn)
    const queue = [{ col: PLAYER_SPAWN_COL, row: PLAYER_SPAWN_ROW }];
    visited[PLAYER_SPAWN_ROW][PLAYER_SPAWN_COL] = true;
    let reachedCount = 1;

    while (queue.length > 0) {
      // 取出排最前面的格子 (take the first tile in line)
      const current = queue.shift();

      // 檢查上下左右四個鄰居 (check 4 neighbours)
      for (const dir of DIRECTIONS) {
        const col = current.col + dir.dCol;
        const row = current.row + dir.dRow;

        if (!this.isInside(col, row)) continue;          // 超出地圖
        if (visited[row][col]) continue;                  // 走過了
        if (this.blocksMovementAt(col, row)) continue;    // 走不過去

        visited[row][col] = true;
        reachedCount++;
        queue.push({ col, row });
      }
    }

    // 數一數全部能走的格子有幾個 (count all walkable tiles)
    let walkableCount = 0;
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        if (!this.blocksMovementAt(col, row)) walkableCount++;
      }
    }

    return reachedCount === walkableCount;
  }

  // ===== 查詢 (queries) =====

  /**
   * (col, row) 是否在地圖範圍內 (is inside the map)
   * @returns {boolean}
   */
  isInside(col, row) {
    return col >= 0 && col < MAP_COLS && row >= 0 && row < MAP_ROWS;
  }

  /**
   * 這格會不會擋住移動；地圖外面一律當作牆 (does this tile block movement)
   * @returns {boolean}
   */
  blocksMovementAt(col, row) {
    if (!this.isInside(col, row)) return true;
    return TILE_PROPS[this.tiles[row][col]].blocksMovement;
  }

  /**
   * 某個像素位置會不會擋住子彈；地圖外面一律擋住 (does this pixel block bullets)
   * @param {number} x 像素 x
   * @param {number} y 像素 y
   * @returns {boolean}
   */
  blocksBulletAtPixel(x, y) {
    // 像素座標 ÷ 格子大小，無條件捨去 = 第幾格 (pixel → tile)
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    if (!this.isInside(col, row)) return true;
    return TILE_PROPS[this.tiles[row][col]].blocksBullet;
  }

  /**
   * 一個矩形範圍內有沒有任何擋路的格子 (does a box overlap any blocking tile)
   * @param {number} left 左邊界像素
   * @param {number} top 上邊界像素
   * @param {number} right 右邊界像素
   * @param {number} bottom 下邊界像素
   * @returns {boolean}
   */
  boxBlocksMovement(left, top, right, bottom) {
    const startCol = Math.floor(left / TILE_SIZE);
    const endCol = Math.floor(right / TILE_SIZE);
    const startRow = Math.floor(top / TILE_SIZE);
    const endRow = Math.floor(bottom / TILE_SIZE);

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        if (this.blocksMovementAt(col, row)) return true;
      }
    }
    return false;
  }

  /**
   * 玩家出生點的像素座標（格子正中央）(spawn position in pixels)
   * @returns {{x: number, y: number}}
   */
  getSpawnPosition() {
    return {
      x: PLAYER_SPAWN_COL * TILE_SIZE + TILE_SIZE / 2,
      y: PLAYER_SPAWN_ROW * TILE_SIZE + TILE_SIZE / 2,
    };
  }

  // ===== 繪製 (drawing) =====
  // 以下畫圖用的小數字（內縮、比例）只影響外觀，不影響遊戲平衡，所以直接寫在這裡。

  /**
   * 畫出整張地圖 (draw the whole map)
   * @param {CanvasRenderingContext2D} ctx 畫筆
   */
  draw(ctx) {
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const type = this.tiles[row][col];
        const x = col * TILE_SIZE; // 格子左上角 (tile top-left)
        const y = row * TILE_SIZE;

        if (type === 'crate') drawCrate(ctx, x, y);
        else if (type === 'rock') drawRock(ctx, x, y);
        else if (type === 'tree') drawTree(ctx, x, y);
        else if (type === 'trap') drawTrap(ctx, x, y);
      }
    }
  }
}

// ----- 各種 tile 的畫法 (tile drawing helpers) -----

// 箱子：咖啡色方塊加上 X 形木條 (crate)
function drawCrate(ctx, x, y) {
  const inset = 2;
  const size = TILE_SIZE - inset * 2;
  ctx.fillStyle = CRATE_COLOR;
  ctx.fillRect(x + inset, y + inset, size, size);

  ctx.strokeStyle = CRATE_EDGE_COLOR;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + inset, y + inset, size, size);
  ctx.beginPath();
  ctx.moveTo(x + inset, y + inset);
  ctx.lineTo(x + inset + size, y + inset + size);
  ctx.moveTo(x + inset + size, y + inset);
  ctx.lineTo(x + inset, y + inset + size);
  ctx.stroke();
}

// 石頭：灰色大圓加上淺色亮點 (rock)
function drawRock(ctx, x, y) {
  const cx = x + TILE_SIZE / 2;
  const cy = y + TILE_SIZE / 2;
  ctx.fillStyle = ROCK_COLOR;
  ctx.beginPath();
  ctx.arc(cx, cy, TILE_SIZE * 0.46, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = ROCK_HIGHLIGHT_COLOR;
  ctx.beginPath();
  ctx.arc(cx - 4, cy - 4, TILE_SIZE * 0.18, 0, Math.PI * 2);
  ctx.fill();
}

// 樹木：從上往下看的樹冠，深綠圓加淺綠圓 (tree, top-down canopy)
function drawTree(ctx, x, y) {
  const cx = x + TILE_SIZE / 2;
  const cy = y + TILE_SIZE / 2;
  ctx.fillStyle = TREE_COLOR;
  ctx.beginPath();
  ctx.arc(cx, cy, TILE_SIZE * 0.48, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = TREE_HIGHLIGHT_COLOR;
  ctx.beginPath();
  ctx.arc(cx - 3, cy - 3, TILE_SIZE * 0.28, 0, Math.PI * 2);
  ctx.fill();
}

// 陷阱：深色底板上四根紅色尖刺 (trap with spikes)
function drawTrap(ctx, x, y) {
  const inset = 4;
  ctx.fillStyle = TRAP_COLOR;
  ctx.fillRect(x + inset, y + inset, TILE_SIZE - inset * 2, TILE_SIZE - inset * 2);

  ctx.fillStyle = TRAP_SPIKE_COLOR;
  const half = TILE_SIZE / 2;
  // 四個小三角形，分別在格子的四個象限 (one spike per quadrant)
  for (const [ox, oy] of [[0, 0], [half, 0], [0, half], [half, half]]) {
    const sx = x + ox;
    const sy = y + oy;
    ctx.beginPath();
    ctx.moveTo(sx + half / 2, sy + 4);        // 尖端 (tip)
    ctx.lineTo(sx + half - 4, sy + half - 4); // 右下 (bottom-right)
    ctx.lineTo(sx + 4, sy + half - 4);        // 左下 (bottom-left)
    ctx.closePath();
    ctx.fill();
  }
}
