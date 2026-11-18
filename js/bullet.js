import { EXPLOSION_DURATION, EXPLOSION_COLOR } from './config.js';

// 子彈 (bullet)
export class Bullet {
  /**
   * 建立一顆子彈 (create a bullet)
   * @param {number} x 起始 x 座標 (start x)
   * @param {number} y 起始 y 座標 (start y)
   * @param {number} angle 飛行方向，單位弧度 (direction in radians)
   * @param {string} owner 誰射的：'player' 或 'enemy'，避免打到自己人 (who fired it)
   * @param {object} stats 子彈數值 (bullet stats)
   * @param {number} stats.speed 速度 px/秒
   * @param {number} stats.damage 傷害
   * @param {number} stats.range 射程 px，飛超過就消失
   * @param {boolean} stats.pierce 是否貫穿敵人與箱子
   * @param {number} stats.explosionRadius 爆炸半徑，0 = 不爆炸
   * @param {number} stats.radius 子彈大小
   * @param {string} stats.color 子彈顏色
   */
  constructor(x, y, angle, owner, stats) {
    this.x = x;
    this.y = y;
    this.owner = owner;

    this.speed = stats.speed;
    this.damage = stats.damage;
    this.range = stats.range;
    this.pierce = stats.pierce;
    this.explosionRadius = stats.explosionRadius;
    this.radius = stats.radius;
    this.color = stats.color;

    // 把「角度」拆成 x、y 方向的速度 (split angle into velocity components)
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;

    this.traveled = 0;        // 已經飛了多遠 (distance traveled)
    this.alive = true;        // false 代表要被移除 (marked for removal)

    // 貫穿子彈已經打過的敵人和箱子，避免同一個目標被打很多次 (targets already hit by a piercing bullet)
    this.hitEnemies = new Set();
    this.hitCrates = new Set();
  }

  /**
   * 是否為爆炸彈 (is this an explosive bullet)
   * @returns {boolean}
   */
  isExplosive() {
    return this.explosionRadius > 0;
  }

  /**
   * 移動一小段時間，並檢查有沒有撞到障礙物或超出射程 (move for a short time)
   * game.js 會把一幀切成好幾小段呼叫這個函式，避免高速子彈穿牆。
   * @param {number} dt 這一小段的秒數 (sub-step delta time)
   * @param {GameMap} map 地圖
   */
  update(dt, map) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.traveled += this.speed * dt;

    // 超出射程就消失（榴彈會在這裡空爆）(out of range)
    if (this.traveled >= this.range) {
      this.alive = false;
      return;
    }

    // 沒撞到會擋子彈的東西就結束；樹木不擋子彈 (nothing blocking here)
    if (!map.blocksBulletAtPixel(this.x, this.y)) return;

    const tile = map.getTileAtPixel(this.x, this.y);

    if (this.pierce && tile === 'crate') {
      // 貫穿彈遇到箱子：每個箱子只打一次，然後繼續飛 (piercing: damage each crate once, keep flying)
      const key = map.getTileKeyAtPixel(this.x, this.y);
      if (!this.hitCrates.has(key)) {
        this.hitCrates.add(key);
        map.damageTileAtPixel(this.x, this.y, this.damage);
      }
      return;
    }

    // 一般情況：撞到就消失；爆炸彈不在這裡扣箱子血，交給爆炸處理 (stop here)
    if (!this.isExplosive()) {
      map.damageTileAtPixel(this.x, this.y, this.damage);
    }
    this.alive = false;
  }

  /**
   * 畫出子彈 (draw bullet)
   * @param {CanvasRenderingContext2D} ctx 畫筆 (canvas context)
   */
  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// 爆炸特效：只負責「畫出來」，傷害由 game.js 在爆炸當下一次算完 (explosion visual only)
export class Explosion {
  /**
   * 建立爆炸 (create explosion)
   * @param {number} x 中心 x
   * @param {number} y 中心 y
   * @param {number} radius 爆炸半徑
   */
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.timer = EXPLOSION_DURATION;   // 還剩幾秒消失 (time left)
  }

  /**
   * 倒數計時 (count down)
   * @param {number} dt 經過秒數
   */
  update(dt) {
    this.timer = Math.max(0, this.timer - dt);
  }

  /**
   * 是否已經結束 (is finished)
   * @returns {boolean}
   */
  isDone() {
    return this.timer === 0;
  }

  /**
   * 畫一個逐漸變淡、從小變大的圓 (draw a growing, fading circle)
   * @param {CanvasRenderingContext2D} ctx 畫筆
   */
  draw(ctx) {
    // progress 從 0（剛爆）到 1（結束）(0 = just exploded, 1 = done)
    const progress = 1 - this.timer / EXPLOSION_DURATION;

    // globalAlpha：之後畫的東西的透明度，1 = 不透明，0 = 完全透明 (transparency)
    ctx.globalAlpha = 1 - progress;
    ctx.fillStyle = EXPLOSION_COLOR;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * (0.5 + 0.5 * progress), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1; // 一定要改回來，不然之後畫的東西都會變透明 (reset!)
  }
}
