import {
  GAME_WIDTH,
  GAME_HEIGHT,
  GAME_TITLE,
  GAME_SUBTITLE,
  WEAPONS,
  HUD_HP_BAR_WIDTH,
  HUD_HP_BAR_HEIGHT,
  HUD_HP_COLOR,
  HUD_HP_LOW_COLOR,
  HUD_HP_LOW_RATIO,
  HUD_ARMOR_COLOR,
  HUD_ADRENALINE_COLOR,
  HUD_POWER_AMMO_COLOR,
  HUD_STAGE_PANEL_WIDTH,
  BOSS_COLOR,
  MESSAGE_BG_COLOR,
  MESSAGE_TEXT_COLOR,
  MENU_OVERLAY_COLOR,
  MENU_TITLE_COLOR,
  MENU_TEXT_COLOR,
  MENU_SUBTEXT_COLOR,
  MENU_BLINK_PERIOD,
  NEW_RECORD_COLOR,
  GAME_OVER_OVERLAY_COLOR,
  GAME_OVER_TEXT_COLOR,
  HUD_MARGIN,
  HUD_SLOT_SIZE,
  HUD_SLOT_GAP,
  HUD_BAR_WIDTH,
  HUD_BAR_HEIGHT,
  HUD_BG_COLOR,
  HUD_TEXT_COLOR,
  HUD_SUBTEXT_COLOR,
  HUD_SLOT_OWNED_COLOR,
  HUD_SLOT_EMPTY_COLOR,
  HUD_SLOT_SELECTED_COLOR,
  HUD_RELOAD_COLOR,
  HUD_SPIN_COLOR,
  MAX_ARMOR,
  TOUCH_STICK_RADIUS,
  TOUCH_KNOB_RADIUS,
  TOUCH_LEFT_HINT_X,
  TOUCH_LEFT_HINT_Y,
  TOUCH_RIGHT_HINT_X,
  TOUCH_RIGHT_HINT_Y,
  RELOAD_BUTTON,
  SWITCH_BUTTON,
  TOUCH_BASE_COLOR,
  TOUCH_BASE_BORDER_COLOR,
  TOUCH_KNOB_COLOR,
  TOUCH_HINT_COLOR,
  TOUCH_BUTTON_COLOR,
  TOUCH_BUTTON_TEXT_COLOR,
} from './config.js';

// HUD（抬頭顯示）與選單畫面：畫在遊戲畫面最上層的資訊 (heads-up display & screens)
//   左上：血量、護甲、暫時效果　右上：關卡、剩餘敵人、最高紀錄　左下：武器
//   另外還有：畫面中央提示、主選單、死亡畫面

/**
 * 設定文字樣式的小幫手，省得每次寫三行 (helper to set text style)
 * @param {CanvasRenderingContext2D} ctx 畫筆
 * @param {string} font 字型，例如 'bold 16px sans-serif'
 * @param {string} align 水平對齊：'left'、'center'、'right'
 * @param {string} baseline 垂直對齊：'top'、'middle'、'bottom'
 */
function setText(ctx, font, align, baseline) {
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
}

// ===== 左上：血量與效果 (top-left: HP & buffs) =====

/**
 * 左上角的玩家狀態：血條、護甲條、暫時效果剩餘秒數 (player status panel)
 * @param {CanvasRenderingContext2D} ctx 畫筆
 * @param {Player} player 玩家
 */
export function drawStatusHud(ctx, player) {
  const left = HUD_MARGIN;
  let y = HUD_MARGIN;   // 由上往下排，每畫一行就往下移 (stack rows downward)

  // 先算出要畫幾行，才知道底板多高 (count rows to size the panel)
  const buffs = [];
  if (player.speedBuffTimer > 0) {
    buffs.push({ text: `腎上腺素 ${Math.ceil(player.speedBuffTimer)}s`, color: HUD_ADRENALINE_COLOR });
  }
  if (player.damageBuffTimer > 0) {
    buffs.push({ text: `強化彈藥 ${Math.ceil(player.damageBuffTimer)}s`, color: HUD_POWER_AMMO_COLOR });
  }
  const panelHeight = 24 + (player.armor > 0 ? 10 : 0) + buffs.length * 18;

  ctx.fillStyle = HUD_BG_COLOR;
  ctx.fillRect(left - 6, y - 6, HUD_HP_BAR_WIDTH + 12, panelHeight + 12);

  // ----- 血條：低血量時變紅 (HP bar, red when low) -----
  const hpRatio = player.hp / player.maxHp;
  ctx.fillStyle = HUD_SLOT_EMPTY_COLOR;
  ctx.fillRect(left, y, HUD_HP_BAR_WIDTH, HUD_HP_BAR_HEIGHT);
  ctx.fillStyle = hpRatio < HUD_HP_LOW_RATIO ? HUD_HP_LOW_COLOR : HUD_HP_COLOR;
  ctx.fillRect(left, y, HUD_HP_BAR_WIDTH * hpRatio, HUD_HP_BAR_HEIGHT);

  // 血條上寫數字，例如 HP 70 / 100 (numbers on the bar)
  ctx.fillStyle = HUD_TEXT_COLOR;
  setText(ctx, 'bold 11px sans-serif', 'left', 'middle');
  ctx.fillText(`HP ${Math.ceil(player.hp)} / ${player.maxHp}`, left + 6, y + HUD_HP_BAR_HEIGHT / 2 + 1);
  y += HUD_HP_BAR_HEIGHT + 4;

  // ----- 護甲條：有護甲才畫 (armor bar, only when armored) -----
  if (player.armor > 0) {
    ctx.fillStyle = HUD_SLOT_EMPTY_COLOR;
    ctx.fillRect(left, y, HUD_HP_BAR_WIDTH, 6);
    ctx.fillStyle = HUD_ARMOR_COLOR;
    ctx.fillRect(left, y, HUD_HP_BAR_WIDTH * (player.armor / MAX_ARMOR), 6);
    y += 10;
  }

  // ----- 暫時效果 (active buffs) -----
  setText(ctx, '12px sans-serif', 'left', 'top');
  for (const buff of buffs) {
    ctx.fillStyle = buff.color;
    ctx.fillText(buff.text, left, y + 4);
    y += 18;
  }
}

// ===== 右上：關卡資訊 (top-right: stage info) =====

/**
 * 右上角的關卡資訊：第幾關、目標、最高紀錄 (stage panel)
 * @param {CanvasRenderingContext2D} ctx 畫筆
 * @param {number} stage 第幾關
 * @param {boolean} isBoss 是否為 BOSS 關
 * @param {string} objective 目前目標，例如「剩餘敵人 3」
 * @param {number} bestStage 最高紀錄
 */
export function drawStageHud(ctx, stage, isBoss, objective, bestStage) {
  const right = GAME_WIDTH - HUD_MARGIN;
  const top = HUD_MARGIN;

  ctx.fillStyle = HUD_BG_COLOR;
  ctx.fillRect(right - HUD_STAGE_PANEL_WIDTH - 6, top - 6, HUD_STAGE_PANEL_WIDTH + 12, 64);

  // 第 N 關，BOSS 關用紫色並加上標記 (stage number, purple on boss stages)
  ctx.fillStyle = isBoss ? BOSS_COLOR : HUD_TEXT_COLOR;
  setText(ctx, 'bold 18px sans-serif', 'right', 'top');
  ctx.fillText(isBoss ? `BOSS 第 ${stage} 關` : `第 ${stage} 關`, right, top);

  ctx.fillStyle = HUD_TEXT_COLOR;
  setText(ctx, '13px sans-serif', 'right', 'top');
  ctx.fillText(objective, right, top + 24);

  ctx.fillStyle = HUD_SUBTEXT_COLOR;
  setText(ctx, '11px sans-serif', 'right', 'top');
  ctx.fillText(`最高紀錄：第 ${bestStage} 關`, right, top + 42);
}

// ===== 畫面中央提示 (center message) =====

/**
 * 在畫面中央畫提示文字，背後一條半透明黑帶 (draw center message)
 * @param {CanvasRenderingContext2D} ctx 畫筆
 * @param {string} text 文字
 */
export function drawCenterMessage(ctx, text) {
  const bandHeight = 60;
  ctx.fillStyle = MESSAGE_BG_COLOR;
  ctx.fillRect(0, GAME_HEIGHT / 2 - bandHeight / 2, GAME_WIDTH, bandHeight);

  ctx.fillStyle = MESSAGE_TEXT_COLOR;
  setText(ctx, 'bold 32px sans-serif', 'center', 'middle');
  ctx.fillText(text, GAME_WIDTH / 2, GAME_HEIGHT / 2);
}

// ===== 主選單 (main menu) =====

/**
 * 主選單：標題、最高紀錄、操作說明、閃爍的開始提示 (main menu screen)
 * @param {CanvasRenderingContext2D} ctx 畫筆
 * @param {number} bestStage 最高紀錄
 * @param {number} time 進入選單後經過的秒數，用來做閃爍 (seconds on the menu, for blinking)
 * @param {boolean} touchMode 是否為觸控模式，決定顯示哪一種操作說明 (show touch or keyboard help)
 */
export function drawMenu(ctx, bestStage, time, touchMode) {
  const cx = GAME_WIDTH / 2;

  ctx.fillStyle = MENU_OVERLAY_COLOR;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // 標題 (title)
  ctx.fillStyle = MENU_TITLE_COLOR;
  setText(ctx, 'bold 56px sans-serif', 'center', 'middle');
  ctx.fillText(GAME_TITLE, cx, 150);

  ctx.fillStyle = MENU_SUBTEXT_COLOR;
  setText(ctx, '16px sans-serif', 'center', 'middle');
  ctx.fillText(GAME_SUBTITLE, cx, 200);

  // 最高紀錄：0 代表還沒玩過 (best record; 0 = never played)
  ctx.fillStyle = MENU_TEXT_COLOR;
  setText(ctx, 'bold 22px sans-serif', 'center', 'middle');
  ctx.fillText(bestStage > 0 ? `最高紀錄：第 ${bestStage} 關` : '還沒有紀錄', cx, 270);

  // 操作說明 (controls)
  ctx.fillStyle = MENU_SUBTEXT_COLOR;
  setText(ctx, '15px sans-serif', 'center', 'middle');
  if (touchMode) {
    ctx.fillText('左半邊：搖桿移動　　右半邊：搖桿瞄準並自動射擊', cx, 340);
    ctx.fillText('右下按鈕：換彈、換槍　　也可以點左下角的武器欄', cx, 368);
  } else {
    ctx.fillText('WASD 移動　　滑鼠瞄準　　按住左鍵射擊', cx, 340);
    ctx.fillText('R 換彈　　1~8 或滾輪 切換武器', cx, 368);
  }
  ctx.fillText('打倒所有敵人 → 撿起道具 → 走進出口　每 5 關有 BOSS', cx, 396);

  // 開始提示：前半個週期顯示、後半個週期隱藏，形成閃爍 (blink: visible for half of each period)
  // % 取餘數：time % 1.0 會在 0 ~ 1 之間不斷循環 (remainder loops from 0 to the period)
  if (time % MENU_BLINK_PERIOD < MENU_BLINK_PERIOD / 2) {
    ctx.fillStyle = MENU_TEXT_COLOR;
    setText(ctx, 'bold 24px sans-serif', 'center', 'middle');
    ctx.fillText(touchMode ? '點擊畫面開始' : '按 Enter 或點擊畫面開始', cx, 480);
  }
}

// ===== 死亡畫面 (game over) =====

/**
 * 死亡畫面：撐到第幾關、最高紀錄、是否破紀錄、操作提示 (game over screen)
 * @param {CanvasRenderingContext2D} ctx 畫筆
 * @param {number} stage 這局撐到第幾關
 * @param {number} bestStage 最高紀錄
 * @param {boolean} isNewRecord 這局是否破紀錄
 * @param {boolean} showHint 是否顯示操作提示（死亡後等一下才顯示）
 * @param {boolean} touchMode 是否為觸控模式 (touch mode)
 */
export function drawGameOverScreen(ctx, stage, bestStage, isNewRecord, showHint, touchMode) {
  const cx = GAME_WIDTH / 2;
  const cy = GAME_HEIGHT / 2;

  ctx.fillStyle = GAME_OVER_OVERLAY_COLOR;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.fillStyle = GAME_OVER_TEXT_COLOR;
  setText(ctx, 'bold 48px sans-serif', 'center', 'middle');
  ctx.fillText('GAME OVER', cx, cy - 80);

  setText(ctx, '24px sans-serif', 'center', 'middle');
  ctx.fillText(`撐到第 ${stage} 關`, cx, cy - 25);

  if (isNewRecord) {
    ctx.fillStyle = NEW_RECORD_COLOR;
    setText(ctx, 'bold 22px sans-serif', 'center', 'middle');
    ctx.fillText('★ 新紀錄！ ★', cx, cy + 15);
  } else {
    ctx.fillStyle = MENU_SUBTEXT_COLOR;
    setText(ctx, '18px sans-serif', 'center', 'middle');
    ctx.fillText(`最高紀錄：第 ${bestStage} 關`, cx, cy + 15);
  }

  if (showHint) {
    ctx.fillStyle = GAME_OVER_TEXT_COLOR;
    setText(ctx, '20px sans-serif', 'center', 'middle');
    // 手機沒有 Enter 和 Esc，只提示點擊 (no keyboard on phones)
    if (touchMode) {
      ctx.fillText('點擊畫面重新開始', cx, cy + 70);
    } else {
      ctx.fillText('按 Enter 或點擊畫面重新開始', cx, cy + 70);
      ctx.fillStyle = MENU_SUBTEXT_COLOR;
      setText(ctx, '16px sans-serif', 'center', 'middle');
      ctx.fillText('按 Esc 回主選單', cx, cy + 100);
    }
  }
}

// ===== 左下：武器 (bottom-left: weapon) =====

/**
 * 畫一條進度條 (draw a progress bar)
 * @param {CanvasRenderingContext2D} ctx 畫筆
 * @param {number} x 左上角 x
 * @param {number} y 左上角 y
 * @param {number} ratio 進度 0 ~ 1
 * @param {string} color 顏色
 */
function drawProgressBar(ctx, x, y, ratio, color) {
  ctx.fillStyle = HUD_BG_COLOR;
  ctx.fillRect(x, y, HUD_BAR_WIDTH, HUD_BAR_HEIGHT);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, HUD_BAR_WIDTH * ratio, HUD_BAR_HEIGHT);
}

/**
 * 左下角的武器資訊：武器名稱、彈藥、換彈 / 預熱進度、8 格武器欄 (weapon HUD)
 * @param {CanvasRenderingContext2D} ctx 畫筆
 * @param {Player} player 玩家
 */
export function drawWeaponHud(ctx, player) {
  const weapon = player.getWeapon();
  const def = weapon.def;

  const left = HUD_MARGIN;
  const panelWidth = WEAPONS.length * (HUD_SLOT_SIZE + HUD_SLOT_GAP) - HUD_SLOT_GAP;
  const panelHeight = 74;
  const panelTop = GAME_HEIGHT - HUD_MARGIN - panelHeight;

  // ----- 半透明底板 (background panel) -----
  ctx.fillStyle = HUD_BG_COLOR;
  ctx.fillRect(left - 6, panelTop - 6, panelWidth + 12, panelHeight + 12);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // ----- 武器名稱 (weapon name) -----
  ctx.fillStyle = HUD_TEXT_COLOR;
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`${def.name} ${def.nameEn}`, left, panelTop);

  // ----- 彈藥：彈匣 / 備彈，手槍顯示 ∞ (ammo: magazine / reserve) -----
  const reserveText = def.infiniteReserve ? '∞' : `${weapon.reserveAmmo}`;
  ctx.font = '14px sans-serif';
  ctx.fillText(`${weapon.ammoInMag} / ${reserveText}`, left, panelTop + 22);

  // ----- 狀態：和彈藥同一行，「文字 + 進度條」(status on the same line as ammo) -----
  const statusX = left + 84;           // 文字的位置 (label x)
  const barX = statusX + 40;           // 進度條接在文字後面 (bar after the label)
  const statusY = panelTop + 24;
  ctx.font = '12px sans-serif';

  if (weapon.isReloading()) {
    // 進度 = 已經過的時間 ÷ 總時間 (progress = elapsed / total)
    const ratio = 1 - weapon.reloadTimer / weapon.reloadDuration;
    ctx.fillStyle = HUD_SUBTEXT_COLOR;
    ctx.fillText('換彈中', statusX, statusY);
    drawProgressBar(ctx, barX, statusY + 4, ratio, HUD_RELOAD_COLOR);
  } else if (def.spinUpTime > 0 && weapon.spinTimer > 0 && weapon.spinTimer < def.spinUpTime) {
    ctx.fillStyle = HUD_SUBTEXT_COLOR;
    ctx.fillText('預熱中', statusX, statusY);
    drawProgressBar(ctx, barX, statusY + 4, weapon.spinTimer / def.spinUpTime, HUD_SPIN_COLOR);
  } else if (weapon.ammoInMag === 0 && !weapon.hasReserveAmmo()) {
    ctx.fillStyle = HUD_SPIN_COLOR;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('沒有彈藥！', statusX, statusY);
  }

  // ----- 8 格武器欄 (8 weapon slots) -----
  for (let i = 0; i < WEAPONS.length; i++) {
    const slot = getWeaponSlotRect(i);
    const owned = player.weapons[i] !== null;

    ctx.fillStyle = owned ? HUD_SLOT_OWNED_COLOR : HUD_SLOT_EMPTY_COLOR;
    ctx.fillRect(slot.x, slot.y, slot.size, slot.size);

    // 目前的武器加上黃色外框 (highlight current weapon)
    if (i === player.currentIndex) {
      ctx.strokeStyle = HUD_SLOT_SELECTED_COLOR;
      ctx.lineWidth = 2;
      ctx.strokeRect(slot.x, slot.y, slot.size, slot.size);
    }

    // 格子裡寫數字鍵 1~8 (number key label)
    ctx.fillStyle = owned ? HUD_TEXT_COLOR : HUD_SUBTEXT_COLOR;
    setText(ctx, 'bold 12px sans-serif', 'center', 'middle');
    ctx.fillText(`${i + 1}`, slot.x + slot.size / 2, slot.y + slot.size / 2 + 1);
  }
}

/**
 * 第 i 格武器欄的位置和大小；畫圖和觸控判斷共用，才不會「畫的位置」和「點的位置」對不上 (slot rectangle)
 * @param {number} i 第幾格，0 ~ 7
 * @returns {{x: number, y: number, size: number}} 左上角座標與邊長
 */
export function getWeaponSlotRect(i) {
  return {
    x: HUD_MARGIN + i * (HUD_SLOT_SIZE + HUD_SLOT_GAP),
    y: GAME_HEIGHT - HUD_MARGIN - HUD_SLOT_SIZE,
    size: HUD_SLOT_SIZE,
  };
}

// ===== 手機觸控操作 (touch controls) =====

/**
 * 畫一個圓形按鈕，例如「換彈」(draw a round button)
 * @param {CanvasRenderingContext2D} ctx 畫筆
 * @param {{x: number, y: number, radius: number, label: string}} button 按鈕設定
 */
function drawTouchButton(ctx, button) {
  ctx.fillStyle = TOUCH_BUTTON_COLOR;
  ctx.beginPath();
  ctx.arc(button.x, button.y, button.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = TOUCH_BASE_BORDER_COLOR;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = TOUCH_BUTTON_TEXT_COLOR;
  setText(ctx, 'bold 14px sans-serif', 'center', 'middle');
  ctx.fillText(button.label, button.x, button.y + 1);
}

/**
 * 畫一個搖桿：推動中畫底座 + 搖桿頭；沒推的時候在預設位置畫淡淡的提示圈 (draw one joystick)
 * @param {CanvasRenderingContext2D} ctx 畫筆
 * @param {object} stick 搖桿狀態，來自 input.js
 * @param {number} hintX 提示圈 x
 * @param {number} hintY 提示圈 y
 */
function drawStick(ctx, stick, hintX, hintY) {
  if (stick.pointerId === null) {
    ctx.fillStyle = TOUCH_HINT_COLOR;
    ctx.beginPath();
    ctx.arc(hintX, hintY, TOUCH_STICK_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // 底座：手指一開始按下的位置 (base: where the finger first touched)
  ctx.fillStyle = TOUCH_BASE_COLOR;
  ctx.beginPath();
  ctx.arc(stick.baseX, stick.baseY, TOUCH_STICK_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = TOUCH_BASE_BORDER_COLOR;
  ctx.lineWidth = 2;
  ctx.stroke();

  // 搖桿頭：跟著手指，但不超出底座 (knob: follows the finger, stays inside the base)
  ctx.fillStyle = TOUCH_KNOB_COLOR;
  ctx.beginPath();
  ctx.arc(stick.knobX, stick.knobY, TOUCH_KNOB_RADIUS, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * 畫出所有觸控操作：兩個搖桿、換彈按鈕、換槍按鈕 (draw all touch controls)
 * @param {CanvasRenderingContext2D} ctx 畫筆
 * @param {{leftStick: object, rightStick: object}} controls 搖桿狀態
 */
export function drawTouchControls(ctx, controls) {
  drawStick(ctx, controls.leftStick, TOUCH_LEFT_HINT_X, TOUCH_LEFT_HINT_Y);
  drawStick(ctx, controls.rightStick, TOUCH_RIGHT_HINT_X, TOUCH_RIGHT_HINT_Y);
  drawTouchButton(ctx, RELOAD_BUTTON);
  drawTouchButton(ctx, SWITCH_BUTTON);
}
