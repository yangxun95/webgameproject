import {
  TILE_SIZE,
  MAP_COLS,
  MAP_ROWS,
  ROCK_CLUSTER_COUNT,
  ROCK_CLUSTER_SIZE,
  CRATE_CLUSTER_COUNT,
  CRATE_CLUSTER_SIZE,
  TREE_COUNT,
  TRAP_COUNT,
  PLAYER_SPAWN_COL,
  PLAYER_SPAWN_ROW,
  SAFE_ZONE_RADIUS,
  MAP_GEN_MAX_ATTEMPTS,
  EXIT_COL,
  EXIT_SAFE_RADIUS,
  EXIT_CLOSED_COLOR,
  EXIT_OPEN_COLOR,
  EXIT_BORDER_COLOR,
  LOS_STEP,
  CRATE_HP,
  ENEMY_MIN_SPAWN_DISTANCE,
  CRATE_COLOR,
  CRATE_EDGE_COLOR,
  ROCK_COLOR,
  ROCK_HIGHLIGHT_COLOR,
  TREE_COLOR,
  TREE_HIGHLIGHT_COLOR,
  TRAP_COLOR,
  TRAP_SPIKE_COLOR,
} from './config.js';
import { getImage } from './assets.js';

// 每一種 tile 的特性 (tile properties)
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
    // crateHp[row][col]：每個箱子剩多少耐久度，跟 tiles 一樣大 (crate durability per tile)
    this.crateHp = [];

    // 出口位置與狀態：清光敵人後才會開啟 (exit position & state)
    this.exitCol = EXIT_COL;
    this.exitRow = 0;
    this.exitOpen = false;

    // 剛被打破的箱子位置，game.js 每幀讀取後清空 (crates broken this frame, read by game.js)
    this.brokenCrates = [];

    this.generate();
  }

  // ===== 生成 (generation) =====

  /**
   * 隨機生成地圖，直到所有能走的格子都互相連通 (generate until fully connected)
   */
  generate() {
    for (let attempt = 1; attempt <= MAP_GEN_MAX_ATTEMPTS; attempt++) {
      // 出口的列隨機選，避開最上和最下一列 (random exit row, not on the edges)
      this.exitRow = randomInt(MAP_ROWS - 2) + 1;

      this.fillEmpty();
      this.placeCluster('rock', ROCK_CLUSTER_COUNT, ROCK_CLUSTER_SIZE);
      this.placeCluster('crate', CRATE_CLUSTER_COUNT, CRATE_CLUSTER_SIZE);
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
    this.crateHp = [];
    for (let row = 0; row < MAP_ROWS; row++) {
      const rowTiles = [];
      const rowHp = [];
      for (let col = 0; col < MAP_COLS; col++) {
        rowTiles.push('empty');
        rowHp.push(0);
      }
      this.tiles.push(rowTiles);
      this.crateHp.push(rowHp);
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
      if (type === 'crate') {
        this.crateHp[row][col] = CRATE_HP;
      }
      placed++;
    }
  }

  /**
   * 放幾堆「連在一起」的物件當掩體，例如一排石牆、一堆箱子 (place clusters of objects as cover)
   * 做法：隨機挑一個起點，然後每放一個就往上下左右隨機走一步，走過的格子連成一塊。
   * 走到重複或不能放的格子就略過，所以每堆最多 clusterSize 個。
   * @param {string} type tile 種類，例如 'rock'
   * @param {number} clusterCount 要放幾堆
   * @param {number} clusterSize 每堆最多幾格
   */
  placeCluster(type, clusterCount, clusterSize) {
    for (let i = 0; i < clusterCount; i++) {
      let col = randomInt(MAP_COLS);
      let row = randomInt(MAP_ROWS);

      for (let step = 0; step < clusterSize; step++) {
        const canPlace =
          this.isInside(col, row) &&
          this.tiles[row][col] === 'empty' &&
          !this.isInSafeZone(col, row);
        if (canPlace) {
          this.tiles[row][col] = type;
          if (type === 'crate') {
            this.crateHp[row][col] = CRATE_HP;
          }
        }

        // 隨機往上下左右其中一個方向走一格 (random step to a neighbor)
        const dir = DIRECTIONS[randomInt(DIRECTIONS.length)];
        col += dir.dCol;
        row += dir.dRow;
      }
    }
  }

  /**
   * 這格是否在安全區：玩家出生點附近或出口附近 (is this tile near the spawn or the exit)
   * @param {number} col 欄
   * @param {number} row 列
   * @returns {boolean}
   */
  isInSafeZone(col, row) {
    const nearSpawn =
      Math.abs(col - PLAYER_SPAWN_COL) <= SAFE_ZONE_RADIUS &&
      Math.abs(row - PLAYER_SPAWN_ROW) <= SAFE_ZONE_RADIUS;
    const nearExit =
      Math.abs(col - this.exitCol) <= EXIT_SAFE_RADIUS &&
      Math.abs(row - this.exitRow) <= EXIT_SAFE_RADIUS;
    return nearSpawn || nearExit;
  }

  // ===== 出口 (exit) =====

  /**
   * 開啟出口 (open the exit)
   */
  openExit() {
    this.exitOpen = true;
  }

  /**
   * 某個像素位置是否站在出口格子上 (is this pixel on the exit tile)
   * @param {number} x 像素 x
   * @param {number} y 像素 y
   * @returns {boolean}
   */
  isAtExit(x, y) {
    return (
      Math.floor(x / TILE_SIZE) === this.exitCol &&
      Math.floor(y / TILE_SIZE) === this.exitRow
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
   * 某個像素位置是不是陷阱 (is there a trap at this pixel)
   * @param {number} x 像素 x
   * @param {number} y 像素 y
   * @returns {boolean}
   */
  isTrapAtPixel(x, y) {
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    if (!this.isInside(col, row)) return false;
    return this.tiles[row][col] === 'trap';
  }

  /**
   * 某個像素位置是哪一種 tile；地圖外面回傳 'rock'（當作牆）(tile type at pixel)
   * @param {number} x 像素 x
   * @param {number} y 像素 y
   * @returns {string}
   */
  getTileAtPixel(x, y) {
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    if (!this.isInside(col, row)) return 'rock';
    return this.tiles[row][col];
  }

  /**
   * 某個像素所在格子的代號，例如 "5,3"，用來記錄「打過哪些格子」(tile key, e.g. "5,3")
   * @param {number} x 像素 x
   * @param {number} y 像素 y
   * @returns {string}
   */
  getTileKeyAtPixel(x, y) {
    return `${Math.floor(x / TILE_SIZE)},${Math.floor(y / TILE_SIZE)}`;
  }

  /**
   * 對某一格造成傷害；只有箱子會受傷，耐久度歸零就變成空地 (damage a crate)
   * 箱子被打破時，把位置記到 brokenCrates，讓 game.js 決定要不要掉彈藥。
   * @param {number} col 欄
   * @param {number} row 列
   * @param {number} damage 傷害量
   */
  damageTile(col, row, damage) {
    if (!this.isInside(col, row)) return;
    if (this.tiles[row][col] !== 'crate') return;

    this.crateHp[row][col] -= damage;
    if (this.crateHp[row][col] <= 0) {
      this.tiles[row][col] = 'empty'; // 箱子被打破 (crate destroyed)
      this.brokenCrates.push({
        x: col * TILE_SIZE + TILE_SIZE / 2,
        y: row * TILE_SIZE + TILE_SIZE / 2,
      });
    }
  }

  /**
   * 對某個像素位置的格子造成傷害 (damage the tile at a pixel)
   * @param {number} x 像素 x
   * @param {number} y 像素 y
   * @param {number} damage 傷害量
   */
  damageTileAtPixel(x, y, damage) {
    this.damageTile(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE), damage);
  }

  /**
   * 爆炸：對範圍內所有箱子造成傷害（格子中心在半徑內才算）(damage crates in a radius)
   * @param {number} x 爆炸中心 x
   * @param {number} y 爆炸中心 y
   * @param {number} radius 爆炸半徑
   * @param {number} damage 傷害量
   */
  damageTilesInRadius(x, y, radius, damage) {
    // 只檢查爆炸範圍的外框方格，不用跑整張地圖 (only check the bounding box)
    const startCol = Math.floor((x - radius) / TILE_SIZE);
    const endCol = Math.floor((x + radius) / TILE_SIZE);
    const startRow = Math.floor((y - radius) / TILE_SIZE);
    const endRow = Math.floor((y + radius) / TILE_SIZE);

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const centerX = col * TILE_SIZE + TILE_SIZE / 2;
        const centerY = row * TILE_SIZE + TILE_SIZE / 2;
        if (Math.hypot(centerX - x, centerY - y) <= radius) {
          this.damageTile(col, row, damage);
        }
      }
    }
  }

  /**
   * 兩點之間的視線有沒有被擋住（用「會不會擋子彈」判斷）(line of sight check)
   * 做法：沿著兩點連線，每隔 LOS_STEP px 檢查一次那個位置。
   * @param {number} x1 起點 x
   * @param {number} y1 起點 y
   * @param {number} x2 終點 x
   * @param {number} y2 終點 y
   * @returns {boolean} 沒被擋住回傳 true
   */
  hasLineOfSight(x1, y1, x2, y2) {
    const distance = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.ceil(distance / LOS_STEP);

    for (let i = 1; i < steps; i++) {
      // t 從 0 到 1，代表走到連線的幾分之幾 (t = progress along the line)
      const t = i / steps;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      if (this.blocksBulletAtPixel(x, y)) return false;
    }
    return true;
  }

  /**
   * 隨機挑選敵人的出生位置：空地、離玩家出生點夠遠、不重複 (pick enemy spawn points)
   * 地圖已經用 BFS 確認全部連通，所以任何空地玩家都走得到。
   * @param {number} count 要幾個位置
   * @returns {{x: number, y: number}[]} 像素座標陣列
   */
  getEnemySpawnPositions(count) {
    // 先列出所有合格的格子 (collect all valid tiles)
    const candidates = [];
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        if (this.tiles[row][col] !== 'empty') continue;
        if (col === this.exitCol && row === this.exitRow) continue; // 不要生在出口上 (not on the exit)
        const distance = Math.hypot(col - PLAYER_SPAWN_COL, row - PLAYER_SPAWN_ROW);
        if (distance < ENEMY_MIN_SPAWN_DISTANCE) continue;
        candidates.push({ col, row });
      }
    }

    // 隨機抽出 count 個，抽過的從清單移除，就不會重複 (draw without replacement)
    const positions = [];
    for (let i = 0; i < count && candidates.length > 0; i++) {
      const index = randomInt(candidates.length);
      const tile = candidates[index];
      candidates.splice(index, 1);
      positions.push({
        x: tile.col * TILE_SIZE + TILE_SIZE / 2,
        y: tile.row * TILE_SIZE + TILE_SIZE / 2,
      });
    }
    return positions;
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
    this.drawExit(ctx);

    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const type = this.tiles[row][col];
        if (type === 'empty') continue;

        const x = col * TILE_SIZE; // 格子左上角 (tile top-left)
        const y = row * TILE_SIZE;

        // 有美術圖片就畫圖片，剛好填滿一格；沒有就用下面的圖形畫 (sprite fills the tile, else shapes)
        // tile 的種類名稱（'rock'、'crate'…）剛好就是圖片名稱 (tile type = image name)
        const image = getImage(type);
        if (image !== null) {
          ctx.drawImage(image, x, y, TILE_SIZE, TILE_SIZE);
          continue;
        }

        if (type === 'crate') drawCrate(ctx, x, y);
        else if (type === 'rock') drawRock(ctx, x, y);
        else if (type === 'tree') drawTree(ctx, x, y);
        else if (type === 'trap') drawTrap(ctx, x, y);
      }
    }
  }

  /**
   * 畫出口：關閉時灰色，開啟時綠色 (draw exit: gray when closed, green when open)
   * @param {CanvasRenderingContext2D} ctx 畫筆
   */
  drawExit(ctx) {
    const x = this.exitCol * TILE_SIZE;
    const y = this.exitRow * TILE_SIZE;

    const image = getImage(this.exitOpen ? 'exit_open' : 'exit_closed');
    if (image !== null) {
      ctx.drawImage(image, x, y, TILE_SIZE, TILE_SIZE);
      return;
    }

    ctx.fillStyle = this.exitOpen ? EXIT_OPEN_COLOR : EXIT_CLOSED_COLOR;
    ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    ctx.strokeStyle = EXIT_BORDER_COLOR;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

    ctx.fillStyle = EXIT_BORDER_COLOR;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', x + TILE_SIZE / 2, y + TILE_SIZE / 2);
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
