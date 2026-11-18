// 遊戲所有數值都集中在這裡，方便調整 (all game settings in one place)

// ===== 畫面與地圖尺寸 (screen & map size) =====
export const TILE_SIZE = 32;                        // 每一格的邊長，單位 px (tile size)
export const MAP_COLS = 25;                         // 地圖有幾欄 (columns)
export const MAP_ROWS = 19;                         // 地圖有幾列 (rows)
export const GAME_WIDTH = TILE_SIZE * MAP_COLS;     // 邏輯寬度 = 800 (logical width)
export const GAME_HEIGHT = TILE_SIZE * MAP_ROWS;    // 邏輯高度 = 608 (logical height)

// ===== Game loop =====
// 一幀最多算 0.1 秒，避免切換分頁回來時角色瞬間移動很遠 (max delta time per frame)
export const MAX_DELTA_TIME = 0.1;

// ===== 顏色 (colors) =====
export const BACKGROUND_COLOR = '#2d3a2e';
export const GRID_COLOR = 'rgba(255, 255, 255, 0.05)';

// ===== 玩家 (player) =====
export const PLAYER_RADIUS = 12;          // 玩家圓形半徑，單位 px (radius)
export const PLAYER_SPEED = 160;          // 移動速度，單位 px/秒 (pixels per second)
export const PLAYER_COLOR = '#4fc3f7';
