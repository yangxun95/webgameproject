import {
  BULLET_RADIUS,
  BULLET_COLOR,
  ENEMY_BULLET_COLOR,
} from './config.js';

// 子彈 (bullet)
export class Bullet {
  /**
   * 建立一顆子彈 (create a bullet)
   * @param {number} x 起始 x 座標 (start x)
   * @param {number} y 起始 y 座標 (start y)
   * @param {number} angle 飛行方向，單位弧度 (direction in radians)
   * @param {number} speed 速度 px/秒 (speed)
   * @param {number} damage 打中時造成的傷害 (damage on hit)
   * @param {string} owner 誰射的：'player' 或 'enemy'，避免打到自己人 (who fired it)
   */
  constructor(x, y, angle, speed, damage, owner) {
    this.x = x;
    this.y = y;
    this.radius = BULLET_RADIUS;
    this.damage = damage;
    this.owner = owner;

    // 把「角度」拆成 x、y 方向的速度 (split angle into velocity components)
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    // alive = false 代表這顆子彈要被移除 (marked for removal)
    this.alive = true;
  }

  /**
   * 每一幀移動子彈 (move bullet every frame)
   * @param {number} dt 經過秒數 (delta time)
   * @param {GameMap} map 地圖，用來判斷有沒有撞到障礙物 (map for collision)
   */
  update(dt, map) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // 撞到箱子、石頭，或飛出地圖，就標記移除 (remove on hitting obstacles or leaving map)
    // 樹木不擋子彈，所以會直接穿過去 (bullets pass through trees)
    if (map.blocksBulletAtPixel(this.x, this.y)) {
      // 如果撞到的是箱子，箱子會扣耐久度 (damage crates)
      map.damageTileAtPixel(this.x, this.y, this.damage);
      this.alive = false;
    }
  }

  /**
   * 畫出子彈 (draw bullet)
   * @param {CanvasRenderingContext2D} ctx 畫筆 (canvas context)
   */
  draw(ctx) {
    ctx.fillStyle = this.owner === 'player' ? BULLET_COLOR : ENEMY_BULLET_COLOR;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
