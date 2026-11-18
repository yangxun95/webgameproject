import {
  PLAYER_RADIUS,
  PLAYER_SPEED,
  PLAYER_MAX_HP,
  PLAYER_COLOR,
  PISTOL_FIRE_INTERVAL,
  PISTOL_DAMAGE,
  BULLET_SPEED,
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

    // 移動：方向來自玩家的輸入 (movement from player input)
    this.move(input.moveX, input.moveY, dt, map);

    // 瞄準 (aim)
    this.aimAngle = input.aimAngle;

    // 射擊 (shooting)
    if (input.isShooting && this.shootCooldown === 0) {
      this.shootBullet(bullets, this.aimAngle, BULLET_SPEED, PISTOL_DAMAGE, 'player');
      this.shootCooldown = PISTOL_FIRE_INTERVAL;
    }
  }
}
