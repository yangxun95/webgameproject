import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  PLAYER_COLOR,
  GUN_LENGTH,
  GUN_WIDTH,
  GUN_COLOR,
  PISTOL_FIRE_INTERVAL,
} from './config.js';
import { Bullet } from './bullet.js';

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

    // 目前瞄準的角度 (current aim angle)
    this.aimAngle = 0;

    // 還要等幾秒才能再開槍 (seconds until next shot is allowed)
    this.shootCooldown = 0;
  }

  /**
   * 每一幀更新：移動、瞄準、射擊 (update every frame)
   * @param {number} dt 距離上一幀經過的秒數 (delta time in seconds)
   * @param {object} input 輸入狀態，來自 input.js (input state)
   * @param {Bullet[]} bullets 子彈陣列，開槍時把新子彈放進去 (bullet list)
   */
  update(dt, input, bullets) {
    // ----- 移動 (movement) -----
    // 位移 = 方向 × 速度 × 時間 (distance = direction × speed × time)
    this.x += input.moveX * this.speed * dt;
    this.y += input.moveY * this.speed * dt;

    // 限制在畫面內，不能走出邊界 (clamp inside the screen)
    this.x = Math.max(this.radius, Math.min(GAME_WIDTH - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(GAME_HEIGHT - this.radius, this.y));

    // ----- 瞄準 (aim) -----
    this.aimAngle = input.aimAngle;

    // ----- 射擊 (shooting) -----
    // 冷卻時間倒數，最小到 0 (count down cooldown)
    this.shootCooldown = Math.max(0, this.shootCooldown - dt);

    if (input.isShooting && this.shootCooldown === 0) {
      this.shoot(bullets);
      this.shootCooldown = PISTOL_FIRE_INTERVAL;
    }
  }

  /**
   * 從槍口射出一顆子彈 (fire one bullet from the muzzle)
   * @param {Bullet[]} bullets 子彈陣列 (bullet list)
   */
  shoot(bullets) {
    // 槍口位置 = 圓心 + 往瞄準方向走 GUN_LENGTH (muzzle position)
    const muzzleX = this.x + Math.cos(this.aimAngle) * GUN_LENGTH;
    const muzzleY = this.y + Math.sin(this.aimAngle) * GUN_LENGTH;
    bullets.push(new Bullet(muzzleX, muzzleY, this.aimAngle));
  }

  /**
   * 把玩家畫出來：先畫槍管，再畫身體 (draw gun, then body)
   * @param {CanvasRenderingContext2D} ctx 畫筆 (canvas context)
   */
  draw(ctx) {
    // 槍管：從圓心畫一條線到槍口 (gun barrel)
    ctx.strokeStyle = GUN_COLOR;
    ctx.lineWidth = GUN_WIDTH;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(
      this.x + Math.cos(this.aimAngle) * GUN_LENGTH,
      this.y + Math.sin(this.aimAngle) * GUN_LENGTH
    );
    ctx.stroke();

    // 身體 (body)
    ctx.fillStyle = PLAYER_COLOR;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
