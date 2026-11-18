import {
  PLAYER_RADIUS,
  PLAYER_SPEED,
  PLAYER_MAX_HP,
  PLAYER_COLOR,
  PISTOL_FIRE_INTERVAL,
  PISTOL_DAMAGE,
  BULLET_SPEED,
  ADRENALINE_SPEED_BONUS,
  POWER_AMMO_DAMAGE_BONUS,
  SPEED_BUFF_RING_COLOR,
  DAMAGE_BUFF_RING_COLOR,
} from './config.js';
import { Character } from './character.js';

// 玩家角色：繼承 Character，只需要寫「玩家專屬」的部分 (player, extends Character)
export class Player extends Character {
  /**
   * 建立玩家 (create player)
   * @param {number} x 起始 x 座標 (start x)
   * @param {number} y 起始 y 座標 (start y)
   */
  constructor(x, y) {
    // super(...) 呼叫父類別的 constructor，把共同的屬性設定好 (call parent constructor)
    super(x, y, PLAYER_RADIUS, PLAYER_SPEED, PLAYER_MAX_HP, PLAYER_COLOR);

    // 暫時效果的剩餘秒數，> 0 代表效果中 (buff time left, active while > 0)
    this.speedBuffTimer = 0;    // 腎上腺素 (adrenaline)
    this.damageBuffTimer = 0;   // 強化彈藥 (power ammo)

    // 永久效果：換彈速度倍率，1 = 正常，快手套每個 +0.15 (permanent reload speed multiplier)
    this.reloadSpeedMultiplier = 1;
  }

  /**
   * 覆寫父類別的 getSpeed：腎上腺素效果中速度提升 (override: faster with adrenaline)
   * @returns {number}
   */
  getSpeed() {
    if (this.speedBuffTimer > 0) {
      return this.speed * (1 + ADRENALINE_SPEED_BONUS);
    }
    return this.speed;
  }

  /**
   * 目前的傷害倍率：強化彈藥效果中提升 (damage multiplier)
   * @returns {number}
   */
  getDamageMultiplier() {
    if (this.damageBuffTimer > 0) {
      return 1 + POWER_AMMO_DAMAGE_BONUS;
    }
    return 1;
  }

  /**
   * 每一幀更新：狀態、移動、瞄準、射擊 (update every frame)
   * @param {number} dt 距離上一幀經過的秒數 (delta time in seconds)
   * @param {object} input 輸入狀態，來自 input.js (input state)
   * @param {Bullet[]} bullets 子彈陣列，開槍時把新子彈放進去 (bullet list)
   * @param {GameMap} map 地圖，用來判斷碰撞 (map for collision)
   */
  update(dt, input, bullets, map) {
    this.updateStatus(dt, map);

    // 暫時效果倒數 (count down buffs)
    this.speedBuffTimer = Math.max(0, this.speedBuffTimer - dt);
    this.damageBuffTimer = Math.max(0, this.damageBuffTimer - dt);

    // 移動：方向來自玩家的輸入 (movement from player input)
    this.move(input.moveX, input.moveY, dt, map);

    // 瞄準 (aim)
    this.aimAngle = input.aimAngle;

    // 射擊：傷害乘上倍率 (shooting, damage × multiplier)
    if (input.isShooting && this.shootCooldown === 0) {
      const damage = PISTOL_DAMAGE * this.getDamageMultiplier();
      this.shootBullet(bullets, this.aimAngle, BULLET_SPEED, damage, 'player');
      this.shootCooldown = PISTOL_FIRE_INTERVAL;
    }
  }

  /**
   * 覆寫 draw：先照父類別畫好，再加上效果中的外圈 (override draw: add buff rings)
   * @param {CanvasRenderingContext2D} ctx 畫筆
   */
  draw(ctx) {
    super.draw(ctx); // 先執行父類別的 draw (call parent's draw first)

    ctx.lineWidth = 2;
    if (this.speedBuffTimer > 0) {
      ctx.strokeStyle = SPEED_BUFF_RING_COLOR;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (this.damageBuffTimer > 0) {
      ctx.strokeStyle = DAMAGE_BUFF_RING_COLOR;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
