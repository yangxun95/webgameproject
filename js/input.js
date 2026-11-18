import { GAME_WIDTH, GAME_HEIGHT } from './config.js';

// 輸入抽象層：把鍵盤、滑鼠（之後還有觸控）轉成遊戲看得懂的狀態 (input abstraction layer)
// 其他檔案只讀取 input 物件，不直接處理鍵盤或滑鼠事件。

// 目前正被按住的按鍵 (keys currently held down)
const keysDown = new Set();

// 滑鼠在遊戲世界中的位置（邏輯座標）(mouse position in logical coordinates)
let mouseX = GAME_WIDTH / 2;
let mouseY = GAME_HEIGHT / 2;

// 滑鼠左鍵是否按住 (is left mouse button held)
let mouseDown = false;

// 有沒有「按了一下」確認鍵，等 updateInput 讀取後就清掉 (confirm pressed, waiting to be read)
let confirmQueued = false;

// 以下也是「按一下」型的輸入，讀取後清掉 (more one-shot inputs)
let reloadQueued = false;         // 按了 R (reload)
let switchQueued = null;          // 按了數字鍵，存武器位置 0~7；null = 沒按 (number key pressed)
let wheelQueued = 0;              // 滾輪：+1 下一把，-1 上一把，0 = 沒滾 (mouse wheel)
let backQueued = false;           // 按了 Esc，回主選單用 (Esc pressed)

// 數字鍵 1~8 對應武器位置 0~7 (number keys → weapon slots)
const WEAPON_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8'];

// 對外提供的輸入狀態 (input state for the game)
export const input = {
  moveX: 0,         // 移動方向 x，範圍 -1 ~ 1
  moveY: 0,         // 移動方向 y，範圍 -1 ~ 1
  aimAngle: 0,      // 瞄準角度，單位弧度，0 = 朝右 (aim angle in radians)
  isShooting: false, // 是否正在射擊 (is shooting)
  confirm: false,   // 這一幀是否「剛按下」確認（Enter 或點擊），只會是 true 一幀 (confirm, one frame only)
  reload: false,    // 這一幀是否剛按下換彈 (reload pressed this frame)
  switchWeapon: null, // 這一幀要切換到哪個武器位置，null = 不切換 (weapon slot to switch to)
  switchWeaponStep: 0, // 滾輪切換：+1 / -1 / 0 (cycle direction)
  back: false,      // 這一幀是否剛按下 Esc (back pressed this frame)
};

/**
 * 把滑鼠在網頁上的位置換算成遊戲邏輯座標 (convert page position to logical coordinates)
 * canvas 可能被放大或縮小顯示，所以要先扣掉 canvas 的左上角，再除以縮放比例。
 * @param {HTMLCanvasElement} canvas 遊戲畫布
 * @param {MouseEvent} event 滑鼠事件
 * @returns {{x: number, y: number}} 邏輯座標
 */
function toLogicalPosition(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (GAME_WIDTH / rect.width),
    y: (event.clientY - rect.top) * (GAME_HEIGHT / rect.height),
  };
}

/**
 * 註冊鍵盤與滑鼠事件，遊戲啟動時呼叫一次 (register input listeners)
 * @param {HTMLCanvasElement} canvas 遊戲畫布
 */
export function initInput(canvas) {
  // ----- 鍵盤 (keyboard) -----
  window.addEventListener('keydown', (event) => {
    keysDown.add(event.code);

    // Enter = 確認。event.repeat 代表「按住不放自動重複」，不算新的一次 (ignore auto-repeat)
    if (event.code === 'Enter' && !event.repeat) {
      confirmQueued = true;
    }

    // Esc = 返回 (back)
    if (event.code === 'Escape' && !event.repeat) {
      backQueued = true;
    }

    // R = 換彈 (reload)
    if (event.code === 'KeyR' && !event.repeat) {
      reloadQueued = true;
    }

    // 1~8 = 切換武器。indexOf 找不到會回傳 -1 (number keys; indexOf returns -1 if not found)
    const slot = WEAPON_KEYS.indexOf(event.code);
    if (slot !== -1) {
      switchQueued = slot;
    }
  });

  window.addEventListener('keyup', (event) => {
    keysDown.delete(event.code);
  });

  // 視窗失去焦點時全部放開，避免角色一直走或一直開槍 (release all on blur)
  window.addEventListener('blur', () => {
    keysDown.clear();
    mouseDown = false;
  });

  // ----- 滑鼠 (mouse) -----
  // 移動滑鼠：記錄位置 (track mouse position)
  window.addEventListener('mousemove', (event) => {
    const pos = toLogicalPosition(canvas, event);
    mouseX = pos.x;
    mouseY = pos.y;
  });

  // 在 canvas 上按下左鍵：開始射擊 (button 0 = 左鍵 left button)
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
      mouseDown = true;
      confirmQueued = true; // 點擊畫面也算確認 (a click also counts as confirm)
    }
  });

  // 放開左鍵：停止射擊。監聽 window，滑鼠移出 canvas 才放開也收得到 (listen on window)
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) {
      mouseDown = false;
    }
  });

  // 滑鼠滾輪：往下滾 deltaY > 0 = 下一把，往上滾 = 上一把 (wheel switches weapons)
  // passive: false 才能用 preventDefault 阻止網頁跟著捲動 (needed to call preventDefault)
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    if (event.deltaY > 0) wheelQueued = 1;
    else if (event.deltaY < 0) wheelQueued = -1;
  }, { passive: false });

  // 在 canvas 上按右鍵時不要跳出選單 (disable right-click menu)
  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });
}

/**
 * 每一幀呼叫一次，把原始輸入換算成遊戲狀態 (convert raw input to game state)
 * @param {{x: number, y: number}} player 玩家，用來計算瞄準角度 (player position)
 */
export function updateInput(player) {
  // ----- 移動方向 (movement) -----
  let x = 0;
  let y = 0;

  // 畫面座標：x 往右變大，y 往下變大 (screen coordinates)
  if (keysDown.has('KeyA')) x -= 1;
  if (keysDown.has('KeyD')) x += 1;
  if (keysDown.has('KeyW')) y -= 1;
  if (keysDown.has('KeyS')) y += 1;

  // 正規化：讓斜走的速度和直走一樣 (normalize diagonal movement)
  const length = Math.hypot(x, y);
  if (length > 0) {
    x = x / length;
    y = y / length;
  }

  input.moveX = x;
  input.moveY = y;

  // ----- 瞄準角度：從玩家指向滑鼠 (aim from player to mouse) -----
  input.aimAngle = Math.atan2(mouseY - player.y, mouseX - player.x);

  // ----- 射擊 (shooting) -----
  input.isShooting = mouseDown;

  // ----- 確認：讀完就清掉，所以只會是 true 一幀 (confirm: read once, then reset) -----
  input.confirm = confirmQueued;
  confirmQueued = false;

  // ----- 換彈與切換武器：一樣是讀完就清掉 (reload & switch: read once, then reset) -----
  input.reload = reloadQueued;
  reloadQueued = false;

  input.switchWeapon = switchQueued;
  switchQueued = null;

  input.switchWeaponStep = wheelQueued;
  wheelQueued = 0;

  input.back = backQueued;
  backQueued = false;
}
