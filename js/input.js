// 輸入抽象層：把鍵盤（之後還有滑鼠、觸控）轉成遊戲看得懂的狀態 (input abstraction layer)
// 其他檔案只讀取 input 物件，不直接處理鍵盤事件。

// 目前正被按住的按鍵 (keys currently held down)
const keysDown = new Set();

// 對外提供的輸入狀態 (input state for the game)
// moveX / moveY：移動方向，範圍 -1 ~ 1
export const input = {
  moveX: 0,
  moveY: 0,
};

/**
 * 註冊鍵盤事件，遊戲啟動時呼叫一次 (register keyboard listeners)
 */
export function initInput() {
  // 按下按鍵：記錄起來 (key pressed)
  window.addEventListener('keydown', (event) => {
    keysDown.add(event.code);
  });

  // 放開按鍵：移除記錄 (key released)
  window.addEventListener('keyup', (event) => {
    keysDown.delete(event.code);
  });

  // 視窗失去焦點（例如切到別的視窗）時清空，避免角色一直往前走 (clear keys on blur)
  window.addEventListener('blur', () => {
    keysDown.clear();
  });
}

/**
 * 每一幀呼叫一次，把按鍵狀態換算成移動方向 (convert keys to movement direction)
 */
export function updateInput() {
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
}
