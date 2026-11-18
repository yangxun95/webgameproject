import {
  ENEMY_RADIUS,
  ENEMY_SPEED,
  ENEMY_MAX_HP,
  ENEMY_COLOR,
  ENEMY_SIGHT_RANGE,
  ENEMY_PREFERRED_DISTANCE,
  ENEMY_RETREAT_DISTANCE,
  ENEMY_FIRE_INTERVAL,
  ENEMY_REACTION_TIME,
  ENEMY_BULLET_SPEED,
  ENEMY_BULLET_DAMAGE,
  ENEMY_BULLET_SPREAD,
  ENEMY_BULLET_RANGE,
  ENEMY_BULLET_RADIUS,
  ENEMY_BULLET_COLOR,
} from './config.js';
import { Character } from './character.js';

// 敵人手槍的子彈數值 (enemy pistol bullet stats)
const ENEMY_BULLET_STATS = {
  speed: ENEMY_BULLET_SPEED,
  damage: ENEMY_BULLET_DAMAGE,
  range: ENEMY_BULLET_RANGE,
  pierce: false,
  explosionRadius: 0,
  radius: ENEMY_BULLET_RADIUS,
  color: ENEMY_BULLET_COLOR,
};

// 一般敵人：繼承 Character，加上自己的 AI (enemy with simple AI)
export class Enemy extends Character {
  /**
   * 建立敵人 (create enemy)
   * @param {number} x 起始 x
   * @param {number} y 起始 y
   */
  constructor(x, y) {
    super(x, y, ENEMY_RADIUS, ENEMY_SPEED, ENEMY_MAX_HP, ENEMY_COLOR);

    // 上一幀是否看得到玩家 (could see the player last frame)
    this.seesPlayer = false;

    // 最後一次看到玩家的位置；null 代表從來沒看到過 (last known player position)
    this.lastSeenX = null;
    this.lastSeenY = null;
  }

  /**
   * 每一幀的 AI 判斷 (AI decision every frame)
   *
   * 規則：
   * 1. 看得到玩家：太遠就靠近、太近就後退、距離剛好就站著，並朝玩家開槍。
   * 2. 看不到玩家，但之前看過：走到最後看到玩家的位置去找。
   * 3. 從沒看過玩家：站著不動。
   *
   * @param {number} dt 經過秒數
   * @param {Player} player 玩家
   * @param {Bullet[]} bullets 子彈陣列
   * @param {GameMap} map 地圖
   */
  update(dt, player, bullets, map) {
    this.updateStatus(dt, map);

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.hypot(dx, dy);

    // 看得到 = 在視線範圍內，而且中間沒有箱子或石頭擋住 (in range and line of sight)
    const canSee =
      distance <= ENEMY_SIGHT_RANGE &&
      map.hasLineOfSight(this.x, this.y, player.x, player.y);

    if (canSee) {
      // 剛看到玩家的瞬間，給玩家一點反應時間 (reaction delay when first spotting)
      if (!this.seesPlayer) {
        this.shootCooldown = Math.max(this.shootCooldown, ENEMY_REACTION_TIME);
      }

      this.lastSeenX = player.x;
      this.lastSeenY = player.y;
      this.aimAngle = Math.atan2(dy, dx);

      // 朝玩家的單位方向 (unit direction toward player)
      const dirX = dx / distance;
      const dirY = dy / distance;

      if (distance > ENEMY_PREFERRED_DISTANCE) {
        this.move(dirX, dirY, dt, map);       // 太遠：靠近 (approach)
      } else if (distance < ENEMY_RETREAT_DISTANCE) {
        this.move(-dirX, -dirY, dt, map);     // 太近：後退 (back off)
      }

      // 開槍：角度加上隨機偏移，敵人才不會百發百中 (shoot with random spread)
      if (this.shootCooldown === 0) {
        const spread = (Math.random() * 2 - 1) * ENEMY_BULLET_SPREAD;
        this.shootBullet(bullets, this.aimAngle + spread, 'enemy', ENEMY_BULLET_STATS);
        this.shootCooldown = ENEMY_FIRE_INTERVAL;
      }
    } else if (this.lastSeenX !== null) {
      // 看不到，但記得玩家最後在哪裡：走過去找 (go to last known position)
      const tx = this.lastSeenX - this.x;
      const ty = this.lastSeenY - this.y;
      const targetDistance = Math.hypot(tx, ty);

      if (targetDistance > this.radius) {
        this.aimAngle = Math.atan2(ty, tx);
        this.move(tx / targetDistance, ty / targetDistance, dt, map);
      } else {
        // 走到了還是沒看到，就放棄 (reached it, give up)
        this.lastSeenX = null;
        this.lastSeenY = null;
      }
    }

    this.seesPlayer = canSee;
  }
}
