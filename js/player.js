import {
  TILE_SIZE,
  COLLISION_EPSILON,
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
   * @param {GameMap} map 地圖，用來判斷碰撞 (map for collision)
   */
  update(dt, input, bullets, map) {
    // ----- 移動 (movement) -----
    // 位移 = 方向 × 速度 × 時間 (distance = direction × speed × time)
    // x、y 分開移動，撞牆時才能「貼著牆滑過去」(move each axis separately)
    this.moveX(input.moveX * this.speed * dt, map);
    this.moveY(input.moveY * this.speed * dt, map);

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
   * 碰撞用的方框：把圓形玩家當成正方形處理，計算比較簡單 (hitbox as a square)
   * @returns {{left: number, top: number, right: number, bottom: number}}
   */
  getBox() {
    return {
      left: this.x - this.radius,
      top: this.y - this.radius,
      right: this.x + this.radius,
      bottom: this.y + this.radius,
    };
  }

  /**
   * 水平移動，撞到牆就貼齊牆邊 (move horizontally, stop at walls)
   * 前提：一幀的移動距離小於一格（32px），所以最多只會撞進一欄。
   * @param {number} dx 這一幀要移動的距離 (distance this frame)
   * @param {GameMap} map 地圖
   */
  moveX(dx, map) {
    this.x += dx;
    const box = this.getBox();
    if (!map.boxBlocksMovement(box.left, box.top, box.right, box.bottom)) return;

    if (dx > 0) {
      // 往右撞牆：右邊界撞進第 col 欄，退回到那一欄的左邊 (hit a wall on the right)
      const col = Math.floor(box.right / TILE_SIZE);
      this.x = col * TILE_SIZE - this.radius - COLLISION_EPSILON;
    } else if (dx < 0) {
      // 往左撞牆：左邊界撞進第 col 欄，退回到那一欄的右邊 (hit a wall on the left)
      const col = Math.floor(box.left / TILE_SIZE);
      this.x = (col + 1) * TILE_SIZE + this.radius;
    }
  }

  /**
   * 垂直移動，撞到牆就貼齊牆邊 (move vertically, stop at walls)
   * @param {number} dy 這一幀要移動的距離 (distance this frame)
   * @param {GameMap} map 地圖
   */
  moveY(dy, map) {
    this.y += dy;
    const box = this.getBox();
    if (!map.boxBlocksMovement(box.left, box.top, box.right, box.bottom)) return;

    if (dy > 0) {
      // 往下撞牆 (hit a wall below)
      const row = Math.floor(box.bottom / TILE_SIZE);
      this.y = row * TILE_SIZE - this.radius - COLLISION_EPSILON;
    } else if (dy < 0) {
      // 往上撞牆 (hit a wall above)
      const row = Math.floor(box.top / TILE_SIZE);
      this.y = (row + 1) * TILE_SIZE + this.radius;
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
