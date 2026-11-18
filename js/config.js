// 遊戲所有數值都集中在這裡，方便調整 (all game settings in one place)

// ===== 畫面與地圖尺寸 (screen & map size) =====
export const TILE_SIZE = 32;                        // 每一格的邊長，單位 px (tile size)
export const MAP_COLS = 25;                         // 地圖有幾欄 (columns)
export const MAP_ROWS = 19;                         // 地圖有幾列 (rows)
export const GAME_WIDTH = TILE_SIZE * MAP_COLS;     // 邏輯寬度 = 800 (logical width)
export const GAME_HEIGHT = TILE_SIZE * MAP_ROWS;    // 邏輯高度 = 608 (logical height)

// ===== 地圖生成 (map generation) =====
export const ROCK_COUNT = 30;             // 石頭數量 (number of rocks)
export const CRATE_COUNT = 20;            // 箱子數量 (number of crates)
export const TREE_COUNT = 25;             // 樹木數量 (number of trees)
export const TRAP_COUNT = 8;              // 陷阱數量 (number of traps)
export const PLAYER_SPAWN_COL = 2;        // 玩家出生在第幾欄 (spawn column)
export const PLAYER_SPAWN_ROW = 9;        // 玩家出生在第幾列 (spawn row)
export const SAFE_ZONE_RADIUS = 2;        // 出生點周圍幾格內不放障礙物 (safe zone in tiles)
export const MAP_GEN_MAX_ATTEMPTS = 100;  // 最多重新生成幾次 (max regeneration attempts)

// ===== 碰撞 (collision) =====
// 撞牆後往外多推一點點，避免剛好貼在格線上被判定成重疊 (tiny push-out gap)
export const COLLISION_EPSILON = 0.001;
// 檢查視線時，沿著直線每隔幾 px 檢查一次 (line-of-sight sampling step)
export const LOS_STEP = 4;

// ===== 箱子與陷阱 (crates & traps) =====
export const CRATE_HP = 30;               // 箱子耐久度 (crate durability)
export const TRAP_DAMAGE = 10;            // 踩到陷阱扣多少血 (trap damage)
export const TRAP_COOLDOWN = 1.0;         // 站在陷阱上，每幾秒扣一次血 (seconds between trap hits)

// ===== Game loop =====
// 一幀最多算 0.1 秒，避免切換分頁回來時角色瞬間移動很遠 (max delta time per frame)
export const MAX_DELTA_TIME = 0.1;

// ===== 顏色 (colors) =====
export const BACKGROUND_COLOR = '#2d3a2e';
export const GRID_COLOR = 'rgba(255, 255, 255, 0.05)';
export const CRATE_COLOR = '#8d6e63';
export const CRATE_EDGE_COLOR = '#5d4037';
export const ROCK_COLOR = '#90a4ae';
export const ROCK_HIGHLIGHT_COLOR = '#b0bec5';
export const TREE_COLOR = '#2e7d32';
export const TREE_HIGHLIGHT_COLOR = '#43a047';
export const TRAP_COLOR = '#4e342e';
export const TRAP_SPIKE_COLOR = '#e57373';
export const HIT_FLASH_COLOR = '#ffffff';                 // 受傷閃白 (hit flash)
export const HP_BAR_BG_COLOR = 'rgba(0, 0, 0, 0.6)';
export const HP_BAR_COLOR = '#66bb6a';
export const GAME_OVER_OVERLAY_COLOR = 'rgba(0, 0, 0, 0.6)';
export const GAME_OVER_TEXT_COLOR = '#ffffff';

// ===== 受傷效果與血條 (hit effect & HP bar) =====
export const HIT_FLASH_TIME = 0.1;        // 受傷閃白幾秒 (flash duration)
export const HP_BAR_WIDTH = 28;
export const HP_BAR_HEIGHT = 4;
export const HP_BAR_OFFSET = 8;           // 血條在身體上方幾 px (gap above body)

// ===== 玩家 (player) =====
export const PLAYER_RADIUS = 12;          // 玩家圓形半徑，單位 px (radius)
export const PLAYER_SPEED = 160;          // 移動速度，單位 px/秒 (pixels per second)
export const PLAYER_COLOR = '#4fc3f7';
export const PLAYER_MAX_HP = 100;         // 玩家最大血量 (max HP)
export const GUN_LENGTH = 20;             // 槍管長度，從圓心算起，單位 px (barrel length)
export const GUN_WIDTH = 6;               // 槍管粗細 (barrel width)
export const GUN_COLOR = '#cfd8dc';

// ===== 射擊（暫時的手槍設定，第 7 步會改成完整武器系統）(shooting, temporary pistol) =====
export const PISTOL_FIRE_INTERVAL = 0.3;  // 兩發之間至少間隔幾秒 (seconds between shots)
export const PISTOL_DAMAGE = 10;          // 每發傷害 (damage per bullet)

// ===== 子彈 (bullet) =====
export const BULLET_SPEED = 500;          // 玩家子彈速度，單位 px/秒 (pixels per second)
export const BULLET_RADIUS = 3;
export const BULLET_COLOR = '#ffeb3b';
export const ENEMY_BULLET_COLOR = '#ff7043';

// ===== 敵人 (enemy) =====
export const ENEMY_COUNT = 2;             // 每關敵人數量，第 8 步會改成隨關卡增加 (enemies per stage)
export const ENEMY_RADIUS = 12;
export const ENEMY_SPEED = 90;            // 比玩家慢，玩家才逃得掉 (slower than player)
export const ENEMY_MAX_HP = 30;           // 手槍 3 發打死 (3 pistol shots)
export const ENEMY_COLOR = '#ef5350';
export const ENEMY_SIGHT_RANGE = 400;     // 看得到多遠 (sight range in px)
export const ENEMY_PREFERRED_DISTANCE = 220; // 比這遠就靠近玩家 (approach if farther)
export const ENEMY_RETREAT_DISTANCE = 120;   // 比這近就後退 (back off if closer)
export const ENEMY_FIRE_INTERVAL = 0.9;   // 開槍間隔秒數 (seconds between shots)
export const ENEMY_REACTION_TIME = 0.5;   // 剛看到玩家時，等幾秒才開第一槍 (delay before first shot)
export const ENEMY_BULLET_SPEED = 300;    // 比玩家子彈慢，玩家才躲得掉 (dodgeable)
export const ENEMY_BULLET_DAMAGE = 8;
export const ENEMY_BULLET_SPREAD = 0.15;  // 子彈隨機偏移的最大角度，單位弧度，約 ±8.6° (max spread)
export const ENEMY_MIN_SPAWN_DISTANCE = 10; // 敵人至少離玩家出生點幾格 (min tiles from player spawn)
