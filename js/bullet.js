import {
  GAME_WIDTH,
  GAME_HEIGHT,
  BULLET_SPEED,
  BULLET_RADIUS,
  BULLET_COLOR,
} from './config.js';

// 子彈 (bullet)
export class Bullet {
  /**
   * 建立一顆子彈 (create a bullet)
   * @param {number} x 起始 x 座標 (start x)
   * @param {number} y 起始 y 座標 (start y)
   * @param {number} angle 飛行方向，單位弧度 (direction in radians)
   */
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    this.radius = BULLET_RADIUS;

    // 把「角度」拆成 x、y 方向的速度 (split angle into velocity components)
    this.vx = Math.cos(angle) * BULLET_SPEED;
    this.vy = Math.sin(angle) * BULLET_SPEED;

    // alive = false 代表這顆子彈要被移除 (marked for removal)
    this.alive = true;
  }

  /**
   * 每一幀移動子彈 (move bullet every frame)
   * @param {number} dt 經過秒數 (delta time)
   */
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // 飛出畫面就標記移除 (remove when out of screen)
    if (
      this.x < -this.radius ||
      this.x > GAME_WIDTH + this.radius ||
      this.y < -this.radius ||
      this.y > GAME_HEIGHT + this.radius
    ) {
      this.alive = false;
    }
  }

  /**
   * 畫出子彈 (draw bullet)
   * @param {CanvasRenderingContext2D} ctx 畫筆 (canvas context)
   */
  draw(ctx) {
    ctx.fillStyle = BULLET_COLOR;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
