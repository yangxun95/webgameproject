import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  PLAYER_COLOR,
} from './config.js';

// 玩家角色 (player character)
export class Player {
  /**
   * 建立玩家 (create player)
   * @param {number} x 起始 x 座標 (start x)
   * @param {number} y 起始 y 座標 (start y)
   */
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = PLAYER_RADIUS;
    this.speed = PLAYER_SPEED;
  }

  /**
   * 每一幀更新位置 (update position every frame)
   * @param {number} dt 距離上一幀經過的秒數 (delta time in seconds)
   * @param {object} input 輸入狀態，來自 input.js (input state)
   */
  update(dt, input) {
    // 位移 = 方向 × 速度 × 時間 (distance = direction × speed × time)
    this.x += input.moveX * this.speed * dt;
    this.y += input.moveY * this.speed * dt;

    // 限制在畫面內，不能走出邊界 (clamp inside the screen)
    this.x = Math.max(this.radius, Math.min(GAME_WIDTH - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(GAME_HEIGHT - this.radius, this.y));
  }

  /**
   * 把玩家畫出來 (draw player)
   * @param {CanvasRenderingContext2D} ctx 畫筆 (canvas context)
   */
  draw(ctx) {
    ctx.fillStyle = PLAYER_COLOR;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
