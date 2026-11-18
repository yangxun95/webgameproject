import {
  GAME_HEIGHT,
  WEAPONS,
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
} from './config.js';

// HUD（抬頭顯示）：畫在遊戲畫面最上層的資訊 (heads-up display)
// 目前只有左下角的武器資訊，第 9 步會加上血量、關卡數等。

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
  const slotsTop = GAME_HEIGHT - HUD_MARGIN - HUD_SLOT_SIZE;   // 武器欄的上緣 (slot row top)
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
    const x = left + i * (HUD_SLOT_SIZE + HUD_SLOT_GAP);
    const owned = player.weapons[i] !== null;

    ctx.fillStyle = owned ? HUD_SLOT_OWNED_COLOR : HUD_SLOT_EMPTY_COLOR;
    ctx.fillRect(x, slotsTop, HUD_SLOT_SIZE, HUD_SLOT_SIZE);

    // 目前的武器加上黃色外框 (highlight current weapon)
    if (i === player.currentIndex) {
      ctx.strokeStyle = HUD_SLOT_SELECTED_COLOR;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, slotsTop, HUD_SLOT_SIZE, HUD_SLOT_SIZE);
    }

    // 格子裡寫數字鍵 1~8 (number key label)
    ctx.fillStyle = owned ? HUD_TEXT_COLOR : HUD_SUBTEXT_COLOR;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${i + 1}`, x + HUD_SLOT_SIZE / 2, slotsTop + HUD_SLOT_SIZE / 2 + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }
}
