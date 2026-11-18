import {
  TILE_SIZE,
  COLLISION_EPSILON,
  GUN_LENGTH,
  GUN_WIDTH,
  GUN_COLOR,
  TRAP_DAMAGE,
  TRAP_COOLDOWN,
  HIT_FLASH_TIME,
  HIT_FLASH_COLOR,
  HP_BAR_WIDTH,
  HP_BAR_HEIGHT,
  HP_BAR_OFFSET,
  HP_BAR_BG_COLOR,
  HP_BAR_COLOR,
  ARMOR_BAR_COLOR,
  CHARACTER_SPRITE_SCALE,
  HIT_FLASH_ALPHA,
} from './config.js';
import { Bullet } from './bullet.js';
import { getImage } from './assets.js';

// 角色的共同父類別：玩家和敵人都繼承它 (base class for player and enemies)
// 放在這裡的功能：移動與撞牆、血量與受傷、陷阱、開槍、畫出身體和血條。
export class Character {
  /**
   * 建立角色 (create character)
   * @param {number} x 起始 x
   * @param {number} y 起始 y
   * @param {number} radius 身體半徑
   * @param {number} speed 移動速度 px/秒
   * @param {number} maxHp 最大血量
   * @param {string} color 身體顏色
   */
  constructor(x, y, radius, speed, maxHp, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.speed = speed;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.armor = 0;           // 護甲：受傷時先扣護甲 (armor absorbs damage first)
    this.color = color;
    this.hpBarWidth = HP_BAR_WIDTH; // 血條寬度，BOSS 會改得比較寬 (HP bar width)
    this.imageName = '';            // 美術圖片名稱，對應 assets.js；子類別會設定 (sprite name, set by subclasses)

    this.aimAngle = 0;        // 瞄準角度 (aim angle)
    this.shootCooldown = 0;   // 還要等幾秒才能開槍 (seconds until next shot)
    this.hitFlashTimer = 0;   // 受傷閃白還剩幾秒 (hit flash time left)
    this.trapCooldown = 0;    // 陷阱還要等幾秒才會再扣血 (trap cooldown)
  }

  // ===== 血量 (health) =====

  /**
   * 受到傷害：先扣護甲，護甲不夠的部分才扣血 (take damage, armor first)
   * @param {number} amount 傷害量
   */
  takeDamage(amount) {
    // 護甲能擋多少：最多擋掉全部傷害，但不能超過現有護甲 (how much armor absorbs)
    const absorbed = Math.min(this.armor, amount);
    this.armor -= absorbed;

    this.hp = Math.max(0, this.hp - (amount - absorbed));
    this.hitFlashTimer = HIT_FLASH_TIME;
  }

  /**
   * 是否死亡 (is dead)
   * @returns {boolean}
   */
  isDead() {
    return this.hp <= 0;
  }

  /**
   * 每幀都要處理的狀態：計時器倒數、陷阱扣血 (per-frame status: timers & traps)
   * @param {number} dt 經過秒數
   * @param {GameMap} map 地圖
   */
  updateStatus(dt, map) {
    this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    this.shootCooldown = Math.max(0, this.shootCooldown - dt);
    this.trapCooldown = Math.max(0, this.trapCooldown - dt);

    // 站在陷阱上，而且冷卻結束，就扣血 (trap damage with cooldown)
    if (map.isTrapAtPixel(this.x, this.y) && this.trapCooldown === 0) {
      this.takeDamage(TRAP_DAMAGE);
      this.trapCooldown = TRAP_COOLDOWN;
    }
  }

  // ===== 移動與碰撞（第 3 步的程式搬到這裡共用）(movement & collision) =====

  /**
   * 碰撞用的方框：把圓形當成正方形處理 (hitbox as a square)
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
   * 往 (dirX, dirY) 方向移動一幀，x、y 分開處理才能貼牆滑動 (move with wall sliding)
   * @param {number} dirX 方向 x，-1 ~ 1
   * @param {number} dirY 方向 y，-1 ~ 1
   * @param {number} dt 經過秒數
   * @param {GameMap} map 地圖
   */
  move(dirX, dirY, dt, map) {
    const speed = this.getSpeed();
    this.moveX(dirX * speed * dt, map);
    this.moveY(dirY * speed * dt, map);
  }

  /**
   * 目前的移動速度；子類別可以覆寫，例如玩家吃了腎上腺素會變快 (current speed, can be overridden)
   * @returns {number}
   */
  getSpeed() {
    return this.speed;
  }

  /**
   * 水平移動，撞到牆就貼齊牆邊 (move horizontally, stop at walls)
   * 前提：一幀的移動距離小於一格（32px），所以最多只會撞進一欄。
   * @param {number} dx 這一幀要移動的距離
   * @param {GameMap} map 地圖
   */
  moveX(dx, map) {
    this.x += dx;
    const box = this.getBox();
    if (!map.boxBlocksMovement(box.left, box.top, box.right, box.bottom)) return;

    if (dx > 0) {
      const col = Math.floor(box.right / TILE_SIZE);
      this.x = col * TILE_SIZE - this.radius - COLLISION_EPSILON;
    } else if (dx < 0) {
      const col = Math.floor(box.left / TILE_SIZE);
      this.x = (col + 1) * TILE_SIZE + this.radius;
    }
  }

  /**
   * 垂直移動，撞到牆就貼齊牆邊 (move vertically, stop at walls)
   * @param {number} dy 這一幀要移動的距離
   * @param {GameMap} map 地圖
   */
  moveY(dy, map) {
    this.y += dy;
    const box = this.getBox();
    if (!map.boxBlocksMovement(box.left, box.top, box.right, box.bottom)) return;

    if (dy > 0) {
      const row = Math.floor(box.bottom / TILE_SIZE);
      this.y = row * TILE_SIZE - this.radius - COLLISION_EPSILON;
    } else if (dy < 0) {
      const row = Math.floor(box.top / TILE_SIZE);
      this.y = (row + 1) * TILE_SIZE + this.radius;
    }
  }

  // ===== 開槍 (shooting) =====

  /**
   * 從槍口朝指定角度射出一顆子彈 (fire one bullet from the muzzle)
   * @param {Bullet[]} bullets 子彈陣列
   * @param {number} angle 子彈飛行角度
   * @param {string} owner 誰射的：'player' 或 'enemy'
   * @param {object} stats 子彈數值，格式見 bullet.js (bullet stats)
   */
  shootBullet(bullets, angle, owner, stats) {
    // 槍口位置 = 圓心 + 往瞄準方向走 GUN_LENGTH (muzzle position)
    const muzzleX = this.x + Math.cos(this.aimAngle) * GUN_LENGTH;
    const muzzleY = this.y + Math.sin(this.aimAngle) * GUN_LENGTH;
    bullets.push(new Bullet(muzzleX, muzzleY, angle, owner, stats));
  }

  // ===== 繪製 (drawing) =====

  /**
   * 畫出槍管、身體、血條 (draw gun, body and HP bar)
   * @param {CanvasRenderingContext2D} ctx 畫筆
   */
  draw(ctx) {
    // 有美術圖片就畫圖片，沒有就畫原本的圓形 (sprite if available, otherwise shapes)
    const image = getImage(this.imageName);
    if (image !== null) {
      this.drawSprite(ctx, image);
    } else {
      this.drawShape(ctx);
    }
    this.drawHpBar(ctx);
  }

  /**
   * 畫圖片：依瞄準方向旋轉，受傷時疊一層半透明白色 (draw rotated sprite)
   * @param {CanvasRenderingContext2D} ctx 畫筆
   * @param {HTMLImageElement} image 圖片
   */
  drawSprite(ctx, image) {
    const size = this.radius * CHARACTER_SPRITE_SCALE;

    // save / restore：先存下畫筆狀態，旋轉畫完再還原，才不會影響之後畫的東西 (save & restore canvas state)
    ctx.save();
    ctx.translate(this.x, this.y);   // 把原點移到角色中心 (move origin to the character)
    ctx.rotate(this.aimAngle);       // 整張畫布轉到瞄準方向，圖片要朝右畫 (rotate; sprite faces right)
    ctx.drawImage(image, -size / 2, -size / 2, size, size); // 以原點為中心畫圖 (centered on origin)
    ctx.restore();

    // 受傷閃白：在身體上疊一個半透明白圓 (hit flash overlay)
    if (this.hitFlashTimer > 0) {
      ctx.globalAlpha = HIT_FLASH_ALPHA;
      ctx.fillStyle = HIT_FLASH_COLOR;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  /**
   * 沒有圖片時的畫法：一條槍管 + 圓形身體 (fallback shapes: barrel + circle)
   * @param {CanvasRenderingContext2D} ctx 畫筆
   */
  drawShape(ctx) {
    // 槍管 (gun barrel)
    ctx.strokeStyle = GUN_COLOR;
    ctx.lineWidth = GUN_WIDTH;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(
      this.x + Math.cos(this.aimAngle) * GUN_LENGTH,
      this.y + Math.sin(this.aimAngle) * GUN_LENGTH
    );
    ctx.stroke();

    // 身體：受傷的瞬間閃白 (body, flashes white when hit)
    ctx.fillStyle = this.hitFlashTimer > 0 ? HIT_FLASH_COLOR : this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * 在頭上畫血條 (draw HP bar above the body)
   * @param {CanvasRenderingContext2D} ctx 畫筆
   */
  drawHpBar(ctx) {
    const width = this.hpBarWidth;
    const left = this.x - width / 2;
    const top = this.y - this.radius - HP_BAR_OFFSET;

    // 底色 (background)
    ctx.fillStyle = HP_BAR_BG_COLOR;
    ctx.fillRect(left, top, width, HP_BAR_HEIGHT);

    // 剩餘血量：寬度 = 總寬 × 血量比例 (remaining HP)
    ctx.fillStyle = HP_BAR_COLOR;
    ctx.fillRect(left, top, width * (this.hp / this.maxHp), HP_BAR_HEIGHT);

    // 有護甲時，在血條上方再畫一條護甲條，長度以「最大血量」為基準 (armor bar above HP bar)
    if (this.armor > 0) {
      const armorRatio = Math.min(1, this.armor / this.maxHp);
      ctx.fillStyle = ARMOR_BAR_COLOR;
      ctx.fillRect(left, top - HP_BAR_HEIGHT - 1, width * armorRatio, HP_BAR_HEIGHT);
    }
  }
}
