import {
  ITEM_RADIUS,
  MEDKIT_HEAL,
  ARMOR_AMOUNT,
  MAX_ARMOR,
  BUFF_DURATION,
  ADRENALINE_SPEED_BONUS,
  POWER_AMMO_DAMAGE_BONUS,
  LIFE_ESSENCE_MAX_HP,
  QUICK_GLOVES_RELOAD_BONUS,
  ITEM_BORDER_COLOR,
  ITEM_TEXT_COLOR,
  MEDKIT_COLOR,
  ARMOR_COLOR,
  ADRENALINE_COLOR,
  POWER_AMMO_COLOR,
  LIFE_ESSENCE_COLOR,
  QUICK_GLOVES_COLOR,
} from './config.js';

// 六種輔助道具的資料表，對應 AGENTS.md 的道具表格 (item definitions)
// label：畫在道具上的字；name：道具名稱；description：撿到時顯示的說明
const ITEM_TYPES = {
  medkit: {
    label: '醫',
    name: '醫療包',
    description: `回復 ${MEDKIT_HEAL} HP`,
    color: MEDKIT_COLOR,
  },
  armor: {
    label: '甲',
    name: '護甲',
    description: `獲得 ${ARMOR_AMOUNT} 點護甲`,
    color: ARMOR_COLOR,
  },
  adrenaline: {
    label: '速',
    name: '腎上腺素',
    description: `${BUFF_DURATION} 秒內移動速度 +${Math.round(ADRENALINE_SPEED_BONUS * 100)}%`,
    color: ADRENALINE_COLOR,
  },
  powerAmmo: {
    label: '攻',
    name: '強化彈藥',
    description: `${BUFF_DURATION} 秒內傷害 +${Math.round(POWER_AMMO_DAMAGE_BONUS * 100)}%`,
    color: POWER_AMMO_COLOR,
  },
  lifeEssence: {
    label: '命',
    name: '生命精華',
    description: `最大 HP +${LIFE_ESSENCE_MAX_HP}`,
    color: LIFE_ESSENCE_COLOR,
  },
  quickGloves: {
    label: '手',
    name: '快手套',
    description: `換彈速度 +${Math.round(QUICK_GLOVES_RELOAD_BONUS * 100)}%`,
    color: QUICK_GLOVES_COLOR,
  },
};

// 所有道具種類的名稱清單，例如 ['medkit', 'armor', ...] (list of item type keys)
const ITEM_KEYS = Object.keys(ITEM_TYPES);

// 地上的道具 (an item lying on the ground)
export class Item {
  /**
   * 建立道具 (create item)
   * @param {number} x 位置 x
   * @param {number} y 位置 y
   * @param {string} type 道具種類，例如 'medkit'
   */
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.radius = ITEM_RADIUS;
  }

  /**
   * 撿起道具時要顯示的文字，例如「醫療包：回復 30 HP」(pickup message)
   * @returns {string}
   */
  getPickupText() {
    const info = ITEM_TYPES[this.type];
    return `${info.name}：${info.description}`;
  }

  /**
   * 畫出道具：彩色圓形 + 白框 + 一個字 (draw item)
   * @param {CanvasRenderingContext2D} ctx 畫筆
   */
  draw(ctx) {
    const info = ITEM_TYPES[this.type];

    ctx.fillStyle = info.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = ITEM_BORDER_COLOR;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = ITEM_TEXT_COLOR;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(info.label, this.x, this.y + 1);
  }
}

/**
 * 在指定位置隨機產生一個道具，每種機率相同 (create a random item)
 * @param {number} x 位置 x
 * @param {number} y 位置 y
 * @returns {Item}
 */
export function createRandomItem(x, y) {
  const index = Math.floor(Math.random() * ITEM_KEYS.length);
  return new Item(x, y, ITEM_KEYS[index]);
}

/**
 * 把道具效果套用到玩家身上 (apply item effect to the player)
 * @param {string} type 道具種類
 * @param {Player} player 玩家
 */
export function applyItem(type, player) {
  if (type === 'medkit') {
    // 立即：回血，但不超過最大血量 (instant heal, capped at max HP)
    player.hp = Math.min(player.maxHp, player.hp + MEDKIT_HEAL);
  } else if (type === 'armor') {
    // 立即：加護甲，不超過上限 (instant armor, capped)
    player.armor = Math.min(MAX_ARMOR, player.armor + ARMOR_AMOUNT);
  } else if (type === 'adrenaline') {
    // 暫時：設定計時器，計時器 > 0 的期間有效果 (timed buff)
    player.speedBuffTimer = BUFF_DURATION;
  } else if (type === 'powerAmmo') {
    player.damageBuffTimer = BUFF_DURATION;
  } else if (type === 'lifeEssence') {
    // 永久：最大血量增加，目前血量也跟著加，才感覺得到 (permanent max HP up)
    player.maxHp += LIFE_ESSENCE_MAX_HP;
    player.hp += LIFE_ESSENCE_MAX_HP;
  } else if (type === 'quickGloves') {
    // 永久：換彈速度倍率增加，第 7 步換彈時使用 (permanent reload speed up)
    player.reloadSpeedMultiplier += QUICK_GLOVES_RELOAD_BONUS;
  }
}
