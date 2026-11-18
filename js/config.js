// 遊戲所有數值都集中在這裡，方便調整 (all game settings in one place)

// ===== 遊戲資訊與存檔 (game info & save data) =====
export const GAME_TITLE = 'ROGUE SHOOTER';          // 主選單標題，可以改成你們取的遊戲名稱 (menu title)
export const GAME_SUBTITLE = '資管三 C 網路程式設計期末專題'; // 主選單副標題 (menu subtitle)
// localStorage 的 key：同一個網域下的網站共用 localStorage，加上專案名稱避免撞名 (storage key, prefixed)
export const STORAGE_KEY_BEST_STAGE = 'webgameproject.bestStage';

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
export const EXIT_COL = 22;               // 出口在第幾欄（列是隨機的）(exit column; row is random)
export const EXIT_SAFE_RADIUS = 1;        // 出口周圍幾格內不放障礙物 (safe zone around exit)

// ===== 關卡流程 (stage flow) =====
export const MESSAGE_TIME = 1.5;          // 畫面中央提示文字顯示幾秒 (center message duration)
// 死亡後至少等幾秒才接受「重新開始」，避免還在狂點射擊時不小心直接重來 (restart input delay)
export const GAME_OVER_INPUT_DELAY = 1.0;

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
export const ARMOR_BAR_COLOR = '#90caf9';                  // 護甲條 (armor bar)
export const ITEM_BORDER_COLOR = '#ffffff';
export const ITEM_TEXT_COLOR = '#1b1b1b';
export const MEDKIT_COLOR = '#ef9a9a';
export const ARMOR_COLOR = '#90caf9';
export const ADRENALINE_COLOR = '#80deea';
export const POWER_AMMO_COLOR = '#ffcc80';
export const LIFE_ESSENCE_COLOR = '#f48fb1';
export const QUICK_GLOVES_COLOR = '#c5e1a5';
export const SPEED_BUFF_RING_COLOR = 'rgba(128, 222, 234, 0.8)';   // 加速中的外圈 (speed buff ring)
export const DAMAGE_BUFF_RING_COLOR = 'rgba(255, 204, 128, 0.8)';  // 強化彈藥中的外圈 (damage buff ring)
export const GAME_OVER_OVERLAY_COLOR = 'rgba(0, 0, 0, 0.6)';
export const GAME_OVER_TEXT_COLOR = '#ffffff';
export const EXIT_CLOSED_COLOR = '#455a64';               // 出口關閉 (exit closed)
export const EXIT_OPEN_COLOR = '#66bb6a';                 // 出口開啟 (exit open)
export const EXIT_BORDER_COLOR = '#263238';
export const MESSAGE_BG_COLOR = 'rgba(0, 0, 0, 0.5)';
export const MESSAGE_TEXT_COLOR = '#ffffff';

// ===== 輔助道具 (items) =====
export const ITEM_RADIUS = 11;                 // 道具圓形半徑 (item radius)
export const MEDKIT_HEAL = 30;                 // 醫療包回復量 (medkit heal amount)
export const ARMOR_AMOUNT = 50;                // 護甲每次增加量 (armor per pickup)
export const MAX_ARMOR = 100;                  // 護甲上限 (armor cap)
export const BUFF_DURATION = 15;               // 暫時效果持續秒數 (buff duration in seconds)
export const ADRENALINE_SPEED_BONUS = 0.4;     // 腎上腺素：移動速度 +40% (speed bonus)
export const POWER_AMMO_DAMAGE_BONUS = 0.5;    // 強化彈藥：傷害 +50% (damage bonus)
export const LIFE_ESSENCE_MAX_HP = 10;         // 生命精華：最大 HP +10 (max HP bonus)
export const QUICK_GLOVES_RELOAD_BONUS = 0.15; // 快手套：換彈速度 +15%，第 7 步換彈系統才會用到 (reload speed bonus)

// ===== 武器 HUD（左下角）(weapon HUD, bottom-left) =====
export const HUD_MARGIN = 12;             // 離畫面邊緣幾 px (margin from screen edge)
export const HUD_SLOT_SIZE = 22;          // 武器格子大小 (weapon slot size)
export const HUD_SLOT_GAP = 4;            // 格子間距 (gap between slots)
export const HUD_BAR_WIDTH = 76;          // 換彈 / 預熱進度條寬度 (progress bar width)
export const HUD_BAR_HEIGHT = 6;
export const HUD_BG_COLOR = 'rgba(0, 0, 0, 0.55)';
export const HUD_TEXT_COLOR = '#ffffff';
export const HUD_SUBTEXT_COLOR = '#b0bec5';
export const HUD_SLOT_OWNED_COLOR = '#546e7a';      // 已取得的武器格 (owned slot)
export const HUD_SLOT_EMPTY_COLOR = '#263238';      // 未取得的武器格 (locked slot)
export const HUD_SLOT_SELECTED_COLOR = '#ffeb3b';   // 目前武器的外框 (selected slot border)
export const HUD_RELOAD_COLOR = '#90caf9';
export const HUD_SPIN_COLOR = '#ffab40';

// ===== 狀態 HUD（左上角血量、右上角關卡）(status HUD) =====
export const HUD_HP_BAR_WIDTH = 180;
export const HUD_HP_BAR_HEIGHT = 14;
export const HUD_HP_COLOR = '#66bb6a';
export const HUD_HP_LOW_COLOR = '#ef5350';          // 血量低時變紅 (low HP color)
export const HUD_HP_LOW_RATIO = 0.3;                // 血量低於 30% 算「低」(low HP threshold)
export const HUD_ARMOR_COLOR = '#90caf9';
export const HUD_ADRENALINE_COLOR = '#80deea';
export const HUD_POWER_AMMO_COLOR = '#ffcc80';
export const HUD_STAGE_PANEL_WIDTH = 150;

// ===== 手機觸控操作 (touch controls) =====
export const TOUCH_STICK_RADIUS = 60;        // 搖桿最多能推多遠，單位 px (max knob distance)
export const TOUCH_KNOB_RADIUS = 24;         // 搖桿頭大小 (knob size)
export const TOUCH_DEADZONE = 0.2;           // 推不到 20% 當作沒推，避免手指輕微晃動 (dead zone ratio)
export const TOUCH_SLOT_PADDING = 8;         // 武器欄的觸控範圍往外多 8px，比較好點 (extra hit area)
// 沒在推的時候，畫一個淡淡的搖桿提示在這裡 (hint position when the stick is idle)
export const TOUCH_LEFT_HINT_X = 160;
export const TOUCH_LEFT_HINT_Y = 420;
export const TOUCH_RIGHT_HINT_X = GAME_WIDTH - 220;
export const TOUCH_RIGHT_HINT_Y = 420;
// 右下角的按鈕：換彈、換槍 (buttons at the bottom-right)
export const RELOAD_BUTTON = { x: GAME_WIDTH - 60, y: GAME_HEIGHT - 60, radius: 36, label: '換彈' };
export const SWITCH_BUTTON = { x: GAME_WIDTH - 60, y: GAME_HEIGHT - 150, radius: 30, label: '換槍' };
export const TOUCH_BASE_COLOR = 'rgba(255, 255, 255, 0.15)';
export const TOUCH_BASE_BORDER_COLOR = 'rgba(255, 255, 255, 0.35)';
export const TOUCH_KNOB_COLOR = 'rgba(255, 255, 255, 0.45)';
export const TOUCH_HINT_COLOR = 'rgba(255, 255, 255, 0.08)';
export const TOUCH_BUTTON_COLOR = 'rgba(0, 0, 0, 0.45)';
export const TOUCH_BUTTON_TEXT_COLOR = 'rgba(255, 255, 255, 0.85)';

// ===== 主選單與死亡畫面 (menu & game over) =====
export const MENU_OVERLAY_COLOR = 'rgba(0, 0, 0, 0.7)';
export const MENU_TITLE_COLOR = '#ffeb3b';
export const MENU_TEXT_COLOR = '#ffffff';
export const MENU_SUBTEXT_COLOR = '#b0bec5';
export const NEW_RECORD_COLOR = '#ffd54f';
// 開始提示的閃爍週期，單位秒 (blink period of the "press to start" hint)
export const MENU_BLINK_PERIOD = 1.0;

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

// ===== 武器 (weapons) =====
// 8 把槍的資料表，順序就是取得順序：手槍是第 1 把，第 N 個 BOSS 掉第 N+1 把 (weapon table, in unlock order)
// 欄位說明 (fields):
//   damage 每發傷害；fireInterval 開槍間隔秒數；magazineSize 彈匣容量；reloadTime 換彈秒數
//   bulletSpeed 子彈速度 px/秒；range 射程 px；spread 散布角度（弧度）；pellets 一次射出幾顆
//   startReserve 取得時的備彈；maxReserve 備彈上限；infiniteReserve 備彈是否無限
//   pierce 是否貫穿敵人與箱子；explosionRadius 爆炸半徑 px（0 = 不爆炸）
//   firingMoveMultiplier 開火時的移動速度倍率（1 = 不減速）；spinUpTime 開火前要空轉幾秒（0 = 不用）
//   bulletRadius、bulletColor 子彈外觀
export const WEAPONS = [
  {
    id: 'pistol', name: '手槍', nameEn: 'Pistol',
    damage: 10, fireInterval: 0.3, magazineSize: 12, reloadTime: 1.0,
    bulletSpeed: 500, range: 700, spread: 0.02, pellets: 1,
    startReserve: 0, maxReserve: 0, infiniteReserve: true,
    pierce: false, explosionRadius: 0, firingMoveMultiplier: 1, spinUpTime: 0,
    bulletRadius: 3, bulletColor: '#ffeb3b',
  },
  {
    id: 'shotgun', name: '霰彈槍', nameEn: 'Shotgun',
    damage: 8, fireInterval: 0.8, magazineSize: 6, reloadTime: 1.6,
    bulletSpeed: 450, range: 260, spread: 0.35, pellets: 6,
    startReserve: 18, maxReserve: 36, infiniteReserve: false,
    pierce: false, explosionRadius: 0, firingMoveMultiplier: 1, spinUpTime: 0,
    bulletRadius: 3, bulletColor: '#ffe082',
  },
  {
    id: 'smg', name: '衝鋒槍', nameEn: 'SMG',
    damage: 6, fireInterval: 0.08, magazineSize: 30, reloadTime: 1.4,
    bulletSpeed: 520, range: 550, spread: 0.15, pellets: 1,
    startReserve: 90, maxReserve: 180, infiniteReserve: false,
    pierce: false, explosionRadius: 0, firingMoveMultiplier: 1, spinUpTime: 0,
    bulletRadius: 2, bulletColor: '#fff59d',
  },
  {
    id: 'rifle', name: '突擊步槍', nameEn: 'Assault Rifle',
    damage: 12, fireInterval: 0.12, magazineSize: 30, reloadTime: 1.6,
    bulletSpeed: 600, range: 750, spread: 0.05, pellets: 1,
    startReserve: 90, maxReserve: 180, infiniteReserve: false,
    pierce: false, explosionRadius: 0, firingMoveMultiplier: 1, spinUpTime: 0,
    bulletRadius: 3, bulletColor: '#ffd54f',
  },
  {
    id: 'sniper', name: '狙擊槍', nameEn: 'Sniper Rifle',
    damage: 60, fireInterval: 1.2, magazineSize: 5, reloadTime: 2.2,
    bulletSpeed: 1100, range: 1000, spread: 0, pellets: 1,
    startReserve: 15, maxReserve: 30, infiniteReserve: false,
    pierce: true, explosionRadius: 0, firingMoveMultiplier: 1, spinUpTime: 0,
    bulletRadius: 3, bulletColor: '#ffffff',
  },
  {
    id: 'grenade', name: '榴彈槍', nameEn: 'Grenade Launcher',
    damage: 40, fireInterval: 0.9, magazineSize: 4, reloadTime: 2.0,
    bulletSpeed: 350, range: 400, spread: 0.02, pellets: 1,
    startReserve: 12, maxReserve: 24, infiniteReserve: false,
    pierce: false, explosionRadius: 70, firingMoveMultiplier: 1, spinUpTime: 0,
    bulletRadius: 5, bulletColor: '#9ccc65',
  },
  {
    id: 'lmg', name: '輕機槍', nameEn: 'LMG',
    damage: 14, fireInterval: 0.1, magazineSize: 100, reloadTime: 3.5,
    bulletSpeed: 600, range: 750, spread: 0.08, pellets: 1,
    startReserve: 200, maxReserve: 400, infiniteReserve: false,
    pierce: false, explosionRadius: 0, firingMoveMultiplier: 0.5, spinUpTime: 0,
    bulletRadius: 3, bulletColor: '#ffca28',
  },
  {
    id: 'gatling', name: '加特林', nameEn: 'Gatling',
    damage: 10, fireInterval: 0.04, magazineSize: 200, reloadTime: 4.0,
    bulletSpeed: 650, range: 700, spread: 0.12, pellets: 1,
    startReserve: 400, maxReserve: 800, infiniteReserve: false,
    pierce: false, explosionRadius: 0, firingMoveMultiplier: 1, spinUpTime: 1.0,
    bulletRadius: 2, bulletColor: '#ffab40',
  },
];

// ===== 子彈與爆炸 (bullets & explosions) =====
// 子彈每次最多前進幾 px 就檢查一次碰撞，避免高速子彈「穿過」牆或敵人 (sub-step size, prevents tunneling)
export const BULLET_STEP_SIZE = 8;
export const EXPLOSION_DURATION = 0.3;    // 爆炸畫面持續幾秒 (explosion visual duration)
export const EXPLOSION_COLOR = 'rgba(255, 152, 0, 0.6)';

// ===== 彈藥掉落 (ammo drops) =====
export const ENEMY_AMMO_DROP_CHANCE = 0.4;  // 敵人死亡時掉彈藥的機率 (chance per enemy)
export const CRATE_AMMO_DROP_CHANCE = 0.3;  // 箱子被打破時掉彈藥的機率 (chance per crate)
export const AMMO_PICKUP_RATIO = 0.3;       // 撿到彈藥時，每把槍補「備彈上限 × 30%」(refill ratio)
export const AMMO_PICKUP_RADIUS = 9;
export const AMMO_PICKUP_COLOR = '#a1887f';
export const AMMO_PICKUP_TEXT_COLOR = '#ffffff';

// ===== 敵人 (enemy) =====
// 以下是「第 1 關」的基礎數值，之後的關卡依「敵人強度成長」放大 (stage-1 base values)
export const ENEMY_BASE_COUNT = 2;        // 第 1 關的敵人數量 (enemies in stage 1)
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
export const ENEMY_BULLET_RANGE = 600;    // 敵人子彈射程 (range)
export const ENEMY_BULLET_RADIUS = 3;
export const ENEMY_BULLET_COLOR = '#ff7043';
export const ENEMY_BULLET_SPREAD = 0.15;  // 子彈隨機偏移的最大角度，單位弧度，約 ±8.6° (max spread)
export const ENEMY_MIN_SPAWN_DISTANCE = 10; // 敵人至少離玩家出生點幾格 (min tiles from player spawn)

// ===== 敵人強度成長 (enemy scaling per stage) =====
// 第 N 關的倍率 = 1 + 成長率 × (N - 1)，例如血量成長 0.15，第 5 關就是 1.6 倍 (linear growth)
export const ENEMY_COUNT_MAX = 8;               // 敵人數量上限 (max enemies)
export const ENEMY_COUNT_STAGES_PER_EXTRA = 2;  // 每過幾關多 1 個敵人 (stages per extra enemy)
export const ENEMY_HP_GROWTH = 0.15;            // 每關血量 +15% (HP growth per stage)
export const ENEMY_DAMAGE_GROWTH = 0.08;        // 每關子彈傷害 +8% (damage growth per stage)
export const ENEMY_FIRE_RATE_GROWTH = 0.03;     // 每關開槍間隔 -3% (fire interval shrink per stage)
export const ENEMY_MIN_FIRE_INTERVAL_RATIO = 0.5; // 開槍間隔最多縮短到原本的 50% (fire interval floor)
// 血量上限 = 玩家最強武器的 DPS × 秒數，避免敵人變成打不死的 bullet sponge (HP cap by player DPS)
export const ENEMY_HP_CAP_SECONDS = 1.0;        // 一般敵人：最多要打 1 秒 (normal enemy)
export const BOSS_HP_CAP_SECONDS = 12;          // BOSS：最多要打 12 秒 (boss)

// ===== BOSS =====
export const BOSS_STAGE_INTERVAL = 5;     // 每幾關一次 BOSS (boss every N stages)
export const BOSS_MINION_COUNT = 2;       // BOSS 關另外帶幾個小兵 (minions in a boss stage)
export const BOSS_RADIUS = 15;            // 比一般敵人大，但小於半格，才能穿過一格寬的通道 (fits 1-tile gaps)
export const BOSS_SPEED = 70;
export const BOSS_MAX_HP = 300;           // 第 1 關基準血量，實際依關卡成長 (base HP)
export const BOSS_COLOR = '#ab47bc';
export const BOSS_FIRE_INTERVAL = 1.4;
export const BOSS_BULLET_DAMAGE = 10;
export const BOSS_BULLET_SPEED = 260;
export const BOSS_BULLET_COUNT = 5;       // 一次射幾顆，排成扇形 (bullets per fan)
export const BOSS_FAN_SPREAD = 0.5;       // 扇形半角，單位弧度，約 ±29° (fan half-angle)
export const BOSS_BULLET_RADIUS = 4;
export const BOSS_BULLET_COLOR = '#ce93d8';
export const BOSS_HP_BAR_WIDTH = 44;
export const BOSS_SUPPLY_AMMO_RATIO = 1.0; // 集滿武器後，BOSS 補給箱補「備彈上限 × 100%」(supply refill ratio)

// ===== BOSS 獎勵（武器或補給箱）(boss reward) =====
export const REWARD_RADIUS = 14;
export const REWARD_COLOR = '#ffd54f';
export const REWARD_BORDER_COLOR = '#ff8f00';
export const REWARD_TEXT_COLOR = '#3e2723';
