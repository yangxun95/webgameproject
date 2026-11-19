import {
  GAME_WIDTH,
  GAME_HEIGHT,
  WEAPONS,
  TOUCH_STICK_RADIUS,
  TOUCH_DEADZONE,
  TOUCH_SLOT_PADDING,
  RELOAD_BUTTON,
  SWITCH_BUTTON,
} from './config.js';
import { getWeaponSlotRect } from './ui.js';

// 輸入抽象層：把鍵盤、滑鼠、觸控轉成遊戲看得懂的狀態 (input abstraction layer)
// 其他檔案只讀取 input 物件，不直接處理任何事件，所以電腦版和手機版共用同一套遊戲邏輯。
//
// 滑鼠和觸控都用 Pointer Events 處理：同一組事件（pointerdown / pointermove / pointerup），
// 用 event.pointerType 分辨是 'mouse'（滑鼠）還是 'touch'（手指）。

// ===== 鍵盤與滑鼠的原始狀態 (raw keyboard & mouse state) =====

// 目前正被按住的按鍵 (keys currently held down)
const keysDown = new Set();

// 滑鼠在遊戲世界中的位置（邏輯座標）(mouse position in logical coordinates)
let mouseX = GAME_WIDTH / 2;
let mouseY = GAME_HEIGHT / 2;

// 滑鼠左鍵是否按住 (is left mouse button held)
let mouseDown = false;

// ===== 觸控的原始狀態 (raw touch state) =====

// 最後使用的裝置：'mouse' 或 'touch'。觸控螢幕的裝置一開始就當作 'touch' (last used device)
// matchMedia('(pointer: coarse)')：主要指標是「粗」的（手指），代表是觸控裝置 (coarse pointer = touchscreen)
let lastDevice = window.matchMedia('(pointer: coarse)').matches ? 'touch' : 'mouse';

/**
 * 建立一個搖桿的狀態 (create joystick state)
 * pointerId：是哪一根手指在控制這個搖桿，null = 沒人在推
 * baseX/baseY：底座中心（手指一開始按的位置）；knobX/knobY：搖桿頭（手指現在的位置，不超出底座）
 * @returns {object}
 */
function createStick() {
  return { pointerId: null, baseX: 0, baseY: 0, knobX: 0, knobY: 0 };
}

const leftStick = createStick();    // 左半邊：移動 (left: move)
const rightStick = createStick();   // 右半邊：瞄準與射擊 (right: aim & shoot)

// 右搖桿放開後，維持最後瞄準的方向 (keep the last aim direction after releasing)
let touchAimAngle = 0;

// ===== 「按一下」型的輸入：事件發生時記下來，updateInput 讀取後清掉 (one-shot inputs) =====
let confirmQueued = false;        // Enter 或點擊畫面 (confirm)
let reloadQueued = false;         // R 或換彈按鈕 (reload)
let switchQueued = null;          // 數字鍵或點武器欄，存武器位置 0~7；null = 沒有 (switch to slot)
let wheelQueued = 0;              // 滾輪或換槍按鈕：+1 下一把，-1 上一把 (cycle weapons)
let backQueued = false;           // Esc (back)

// 數字鍵 1~8 對應武器位置 0~7 (number keys → weapon slots)
const WEAPON_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8'];

// ===== 對外提供的輸入狀態 (input state for the game) =====
export const input = {
  moveX: 0,         // 移動方向 x，範圍 -1 ~ 1
  moveY: 0,         // 移動方向 y，範圍 -1 ~ 1
  aimAngle: 0,      // 瞄準角度，單位弧度，0 = 朝右 (aim angle in radians)
  isShooting: false, // 是否正在射擊 (is shooting)
  confirm: false,   // 這一幀是否「剛按下」確認（Enter 或點擊），只會是 true 一幀 (confirm, one frame only)
  reload: false,    // 這一幀是否剛按下換彈 (reload pressed this frame)
  switchWeapon: null, // 這一幀要切換到哪個武器位置，null = 不切換 (weapon slot to switch to)
  switchWeaponStep: 0, // 循環切換：+1 / -1 / 0 (cycle direction)
  back: false,      // 這一幀是否剛按下 Esc (back pressed this frame)
};

/**
 * 是否為觸控模式：最後一次操作是用手指 (is touch mode)
 * 遊戲用它決定要不要畫虛擬搖桿、選單要顯示哪種操作說明。
 * @returns {boolean}
 */
export function isTouchMode() {
  return lastDevice === 'touch';
}

/**
 * 給 ui.js 畫搖桿用的狀態 (joystick state for drawing)
 * @returns {{leftStick: object, rightStick: object}}
 */
export function getTouchControls() {
  return { leftStick, rightStick };
}

// ===== 小工具 (helpers) =====

/**
 * 把指標在網頁上的位置換算成遊戲邏輯座標 (convert page position to logical coordinates)
 * canvas 可能被放大或縮小顯示，所以要先扣掉 canvas 的左上角，再除以縮放比例。
 * @param {HTMLCanvasElement} canvas 遊戲畫布
 * @param {PointerEvent} event 指標事件
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
 * 某個點是否在圓形按鈕裡面 (is the point inside a round button)
 * @param {{x: number, y: number}} pos 位置
 * @param {{x: number, y: number, radius: number}} button 按鈕
 * @returns {boolean}
 */
function isInsideButton(pos, button) {
  return Math.hypot(pos.x - button.x, pos.y - button.y) <= button.radius;
}

/**
 * 某個點按到第幾格武器欄；沒按到回傳 -1 (which weapon slot was tapped)
 * 觸控範圍比畫出來的格子大一圈，手指比較好點 (hit area is padded)
 * @param {{x: number, y: number}} pos 位置
 * @returns {number}
 */
function getTappedWeaponSlot(pos) {
  for (let i = 0; i < WEAPONS.length; i++) {
    const slot = getWeaponSlotRect(i);
    if (
      pos.x >= slot.x - TOUCH_SLOT_PADDING &&
      pos.x <= slot.x + slot.size + TOUCH_SLOT_PADDING &&
      pos.y >= slot.y - TOUCH_SLOT_PADDING &&
      pos.y <= slot.y + slot.size + TOUCH_SLOT_PADDING
    ) {
      return i;
    }
  }
  return -1;
}

/**
 * 手指按下：這根手指開始控制這個搖桿，底座放在按下的位置 (start a joystick)
 * @param {object} stick 搖桿
 * @param {number} pointerId 手指編號
 * @param {{x: number, y: number}} pos 位置
 */
function startStick(stick, pointerId, pos) {
  stick.pointerId = pointerId;
  stick.baseX = pos.x;
  stick.baseY = pos.y;
  stick.knobX = pos.x;
  stick.knobY = pos.y;
}

/**
 * 手指移動：搖桿頭跟著手指，但最遠只到底座半徑 (move the knob, clamped to the base)
 * @param {object} stick 搖桿
 * @param {{x: number, y: number}} pos 手指位置
 */
function moveStick(stick, pos) {
  const dx = pos.x - stick.baseX;
  const dy = pos.y - stick.baseY;
  const distance = Math.hypot(dx, dy);

  if (distance <= TOUCH_STICK_RADIUS) {
    stick.knobX = pos.x;
    stick.knobY = pos.y;
  } else {
    // 超出底座：沿著同一個方向，拉回到半徑上 (too far: pull back onto the edge)
    stick.knobX = stick.baseX + (dx / distance) * TOUCH_STICK_RADIUS;
    stick.knobY = stick.baseY + (dy / distance) * TOUCH_STICK_RADIUS;
  }
}

/**
 * 手指放開：搖桿回到沒人控制的狀態 (release a joystick)
 * @param {object} stick 搖桿
 */
function releaseStick(stick) {
  stick.pointerId = null;
}

/**
 * 搖桿目前推的方向和力道，力道 0 ~ 1；小於死區當作 0 (stick direction & strength)
 * @param {object} stick 搖桿
 * @returns {{x: number, y: number, strength: number}} x、y 是推的量（-1 ~ 1）
 */
function readStick(stick) {
  if (stick.pointerId === null) {
    return { x: 0, y: 0, strength: 0 };
  }
  // 除以半徑，把 px 換成 -1 ~ 1 的比例 (px → ratio)
  const x = (stick.knobX - stick.baseX) / TOUCH_STICK_RADIUS;
  const y = (stick.knobY - stick.baseY) / TOUCH_STICK_RADIUS;
  const strength = Math.hypot(x, y);

  if (strength < TOUCH_DEADZONE) {
    return { x: 0, y: 0, strength: 0 };
  }
  return { x, y, strength };
}

// ===== 註冊事件 (register listeners) =====

/**
 * 註冊鍵盤、滑鼠、觸控事件，遊戲啟動時呼叫一次 (register input listeners)
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
    releaseStick(leftStick);
    releaseStick(rightStick);
  });

  // ----- 按下：滑鼠左鍵或手指碰到畫面 (pointer down) -----
  canvas.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') {
      lastDevice = 'mouse';
      if (event.button === 0) {   // 0 = 左鍵 (left button)
        mouseDown = true;
        confirmQueued = true;     // 點擊畫面也算確認 (a click also counts as confirm)
      }
      return;
    }

    // ===== 以下是觸控 (touch) =====
    // preventDefault：阻止瀏覽器把觸控再轉成一次「假的滑鼠點擊」(stop emulated mouse events)
    event.preventDefault();
    lastDevice = 'touch';
    confirmQueued = true;   // 主選單、死亡畫面點一下就開始 (tap = confirm on menus)

    // setPointerCapture：這根手指之後就算滑出 canvas，事件還是會送過來 (keep receiving this finger's events)
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (error) {
      // 少數瀏覽器可能不支援，忽略即可 (ignore if unsupported)
    }

    const pos = toLogicalPosition(canvas, event);

    // 依序判斷：按鈕 → 武器欄 → 搖桿（先判斷小目標，才不會被搖桿搶走）(buttons first, then sticks)
    if (isInsideButton(pos, RELOAD_BUTTON)) {
      reloadQueued = true;
      return;
    }
    if (isInsideButton(pos, SWITCH_BUTTON)) {
      wheelQueued = 1;
      return;
    }
    const slot = getTappedWeaponSlot(pos);
    if (slot !== -1) {
      switchQueued = slot;
      return;
    }

    // 左半邊 → 移動搖桿；右半邊 → 瞄準搖桿；那一邊已經有手指在推就不理 (left half moves, right half aims)
    if (pos.x < GAME_WIDTH / 2) {
      if (leftStick.pointerId === null) startStick(leftStick, event.pointerId, pos);
    } else {
      if (rightStick.pointerId === null) startStick(rightStick, event.pointerId, pos);
    }
  });

  // ----- 移動 (pointer move) -----
  // 監聽 window：滑鼠移出 canvas 也收得到 (listen on window)
  window.addEventListener('pointermove', (event) => {
    const pos = toLogicalPosition(canvas, event);

    if (event.pointerType === 'mouse') {
      lastDevice = 'mouse';
      mouseX = pos.x;
      mouseY = pos.y;
      return;
    }

    // 用 pointerId 找出是哪根手指，移動對應的搖桿 (match finger to stick by pointerId)
    if (event.pointerId === leftStick.pointerId) moveStick(leftStick, pos);
    if (event.pointerId === rightStick.pointerId) moveStick(rightStick, pos);
  });

  // ----- 放開 (pointer up / cancel) -----
  // pointercancel：被系統中斷，例如來電、手指滑出螢幕，也要當作放開 (cancelled by the system)
  const onPointerUp = (event) => {
    if (event.pointerType === 'mouse') {
      if (event.button === 0) mouseDown = false;
      return;
    }
    if (event.pointerId === leftStick.pointerId) releaseStick(leftStick);
    if (event.pointerId === rightStick.pointerId) releaseStick(rightStick);
  };
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  // ----- 滑鼠滾輪：往下滾 = 下一把，往上滾 = 上一把 (wheel switches weapons) -----
  // passive: false 才能用 preventDefault 阻止網頁跟著捲動 (needed to call preventDefault)
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    if (event.deltaY > 0) wheelQueued = 1;
    else if (event.deltaY < 0) wheelQueued = -1;
  }, { passive: false });

  // 在 canvas 上按右鍵或長按時不要跳出選單 (disable context menu)
  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });
}

// ===== 每幀更新 (update) =====

/**
 * 每一幀呼叫一次，把原始輸入換算成遊戲狀態 (convert raw input to game state)
 * @param {{x: number, y: number}} player 玩家，滑鼠瞄準時要算從玩家到滑鼠的角度 (player position)
 */
export function updateInput(player) {
  if (lastDevice === 'touch') {
    updateTouchInput();
  } else {
    updateKeyboardMouseInput(player);
  }

  // ----- 「按一下」型：讀完就清掉，所以只會是 true 一幀 (one-shot: read once, then reset) -----
  input.confirm = confirmQueued;
  confirmQueued = false;

  input.reload = reloadQueued;
  reloadQueued = false;

  input.switchWeapon = switchQueued;
  switchQueued = null;

  input.switchWeaponStep = wheelQueued;
  wheelQueued = 0;

  input.back = backQueued;
  backQueued = false;
}

/**
 * 電腦：WASD 移動、滑鼠瞄準、左鍵射擊 (keyboard & mouse)
 * @param {{x: number, y: number}} player 玩家
 */
function updateKeyboardMouseInput(player) {
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

  // 瞄準角度：從玩家指向滑鼠 (aim from player to mouse)
  input.aimAngle = Math.atan2(mouseY - player.y, mouseX - player.x);
  input.isShooting = mouseDown;
}

/**
 * 手機：左搖桿移動、右搖桿瞄準並自動射擊 (touch joysticks)
 */
function updateTouchInput() {
  // 左搖桿：推過死區就全速走，只看方向不看推多遠 (past the dead zone = full speed, direction only)
  // 除以 strength（推的長度）會把向量變成長度 1，就跟 WASD 一樣是全速 (normalize to length 1)
  const move = readStick(leftStick);
  if (move.strength > 0) {
    input.moveX = move.x / move.strength;
    input.moveY = move.y / move.strength;
  } else {
    input.moveX = 0;
    input.moveY = 0;
  }

  // 右搖桿：有推就朝那個方向瞄準並開火；放開就停火，但保留方向 (push to aim & fire)
  const aim = readStick(rightStick);
  if (aim.strength > 0) {
    touchAimAngle = Math.atan2(aim.y, aim.x);
    input.isShooting = true;
  } else {
    input.isShooting = false;
  }
  input.aimAngle = touchAimAngle;
}
