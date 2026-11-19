import {
  DAMAGE_TEXT_DURATION,
  DAMAGE_TEXT_RISE_SPEED,
  DAMAGE_TEXT_OUTLINE_COLOR,
  PARTICLE_DURATION,
  PARTICLE_SPEED,
  PARTICLE_RADIUS,
  PARTICLE_FRICTION,
} from './config.js';

// 打擊感特效：只影響畫面，不影響遊戲邏輯 (visual-only "game feel" effects)
// 每種特效都有同樣的三個方法：update(dt)、draw(ctx)、isDone()，
// 所以 game.js 可以把它們放在同一個陣列裡一起更新、一起畫。(same interface → one shared array)

// 飄起來的數字，例如打中敵人的「12」(floating text, e.g. damage numbers)
export class FloatingText {
  /**
   * 建立飄字 (create floating text)
   * @param {number} x 位置 x
   * @param {number} y 位置 y
   * @param {string} text 要顯示的文字
   * @param {string} color 文字顏色
   */
  constructor(x, y, text, color) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.timer = DAMAGE_TEXT_DURATION; // 剩下幾秒 (seconds left)
  }

  /**
   * 往上飄，計時減少 (rise and count down)
   * @param {number} dt 經過秒數
   */
  update(dt) {
    this.y -= DAMAGE_TEXT_RISE_SPEED * dt;
    this.timer -= dt;
  }

  /**
   * 時間到就可以移除 (finished?)
   * @returns {boolean}
   */
  isDone() {
    return this.timer <= 0;
  }

  /**
   * 畫出文字：先描深色邊再填色，在任何背景上都看得清楚；快消失時漸漸變透明 (outlined text, fades out)
   * @param {CanvasRenderingContext2D} ctx 畫筆
   */
  draw(ctx) {
    ctx.globalAlpha = Math.max(0, this.timer / DAMAGE_TEXT_DURATION);
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = DAMAGE_TEXT_OUTLINE_COLOR;
    ctx.strokeText(this.text, this.x, this.y);
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, this.x, this.y);
    ctx.globalAlpha = 1;
  }
}

// 碎片粒子：往隨機方向噴出去、越來越慢、漸漸消失 (particle: flies out, slows down, fades)
export class Particle {
  /**
   * 建立一顆粒子 (create one particle)
   * @param {number} x 位置 x
   * @param {number} y 位置 y
   * @param {string} color 顏色
   */
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.timer = PARTICLE_DURATION;

    // 隨機方向、隨機速度（50% ~ 100%）(random direction and speed)
    const angle = Math.random() * Math.PI * 2;
    const speed = PARTICLE_SPEED * (0.5 + Math.random() * 0.5);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  /**
   * 移動並減速 (move and slow down)
   * @param {number} dt 經過秒數
   */
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // 每秒速度剩下 PARTICLE_FRICTION 倍；用次方才不受幀率影響 (frame-rate independent slowdown)
    const keep = Math.pow(PARTICLE_FRICTION, dt);
    this.vx *= keep;
    this.vy *= keep;
    this.timer -= dt;
  }

  /**
   * 時間到就可以移除 (finished?)
   * @returns {boolean}
   */
  isDone() {
    return this.timer <= 0;
  }

  /**
   * 畫一個小圓點，越來越透明 (small fading dot)
   * @param {CanvasRenderingContext2D} ctx 畫筆
   */
  draw(ctx) {
    ctx.globalAlpha = Math.max(0, this.timer / PARTICLE_DURATION);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, PARTICLE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/**
 * 在某個位置噴出一圈碎片 (create a burst of particles)
 * @param {number} x 位置 x
 * @param {number} y 位置 y
 * @param {string} color 顏色
 * @param {number} count 幾顆
 * @returns {Particle[]} 粒子陣列
 */
export function createBurst(x, y, color, count) {
  const particles = [];
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, color));
  }
  return particles;
}
