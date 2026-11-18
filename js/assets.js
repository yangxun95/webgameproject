// 圖片資源：載入美術圖片，沒有圖片的東西就用原本的圖形畫 (image assets with shape fallback)
//
// ★ 給美術：放好一張圖片後，到下面 IMAGE_FILES 把對應的 null 改成檔名（例如 'player.png'）。
//   圖片放在 assets/images/ 資料夾。詳細規格請看專案根目錄的 ART_GUIDE.md。
//
// 為什麼要手動填檔名，而不是自動找？因為網頁沒辦法「列出資料夾裡有哪些檔案」，
// 只能一個一個去要；要一個不存在的檔案，Console 就會出現紅色的 404 錯誤。

// 圖片資料夾 (image folder)
const IMAGE_FOLDER = 'assets/images/';

// 像素風格：true = 放大時保持方塊感（像素畫用），false = 平滑（一般插畫用）(pixel-art mode)
export const PIXEL_ART = false;

// 每個名稱對應一個檔名；null = 還沒有圖片，遊戲會用原本的圖形 (name → file, null = use shapes)
export const IMAGE_FILES = {
  // ----- 角色：朝「右」畫，遊戲會依瞄準方向旋轉 (characters: face RIGHT) -----
  player: null,           // 玩家
  enemy: null,            // 一般敵人
  boss: null,             // BOSS

  // ----- 地圖 (map tiles) -----
  floor: null,            // 地板，會重複鋪滿整張地圖
  rock: null,             // 石頭
  crate: null,            // 箱子
  tree: null,             // 樹木（從上往下看）
  trap: null,             // 陷阱
  exit_closed: null,      // 出口（關閉）
  exit_open: null,        // 出口（開啟）

  // ----- 輔助道具 (items) -----
  item_medkit: null,      // 醫療包
  item_armor: null,       // 護甲
  item_adrenaline: null,  // 腎上腺素
  item_powerAmmo: null,   // 強化彈藥
  item_lifeEssence: null, // 生命精華
  item_quickGloves: null, // 快手套
  ammo: null,             // 彈藥箱
  potion: null,           // 回血藥（箱子掉落）

  // ----- BOSS 掉落的武器圖示 (weapon icons dropped by bosses) -----
  weapon_shotgun: null,   // 霰彈槍
  weapon_smg: null,       // 衝鋒槍
  weapon_rifle: null,     // 突擊步槍
  weapon_sniper: null,    // 狙擊槍
  weapon_grenade: null,   // 榴彈槍
  weapon_lmg: null,       // 輕機槍
  weapon_gatling: null,   // 加特林
  reward_supply: null,    // BOSS 補給箱（武器集滿之後）
};

// 已經載入完成的圖片：名稱 → Image 物件 (loaded images: name → Image)
const loadedImages = {};

/**
 * 開始載入所有有填檔名的圖片，遊戲啟動時呼叫一次 (start loading images)
 * 載入是「非同步」的：不用等它載完，遊戲先開始；每張圖載好的那一刻才會出現在畫面上。
 */
export function loadImages() {
  for (const name of Object.keys(IMAGE_FILES)) {
    const file = IMAGE_FILES[name];
    if (file === null) continue; // 還沒有圖片 (no image yet)

    const image = new Image();

    // 載入成功：存起來，之後 getImage 就拿得到 (loaded: store it)
    image.onload = () => {
      loadedImages[name] = image;
    };

    // 載入失敗（檔名打錯、檔案不存在）：提醒一下，遊戲繼續用圖形畫 (failed: warn and keep using shapes)
    image.onerror = () => {
      console.warn(`圖片載入失敗：${IMAGE_FOLDER}${file}，請檢查檔名 (failed to load image)`);
    };

    // 設定 src 的那一刻，瀏覽器才開始下載 (setting src starts the download)
    image.src = IMAGE_FOLDER + file;
  }
}

/**
 * 取得圖片；還沒有圖片或還沒載完就回傳 null，呼叫的地方要改用圖形畫 (get an image or null)
 * @param {string} name 圖片名稱，例如 'player'
 * @returns {HTMLImageElement|null}
 */
export function getImage(name) {
  // 物件裡沒有這個 key 時會得到 undefined，用 ?? 換成 null (undefined → null)
  return loadedImages[name] ?? null;
}
