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
  ENEMY_HP_GROWTH,
  ENEMY_DAMAGE_GROWTH,
  ENEMY_FIRE_RATE_GROWTH,
  ENEMY_MIN_FIRE_INTERVAL_RATIO,
  ENEMY_HP_CAP_SECONDS,
  BOSS_HP_CAP_SECONDS,
  BOSS_RADIUS,
  BOSS_SPEED,
  BOSS_MAX_HP,
  BOSS_COLOR,
  BOSS_FIRE_INTERVAL,
  BOSS_BULLET_DAMAGE,
  BOSS_BULLET_SPEED,
  BOSS_BULLET_COUNT,
  BOSS_FAN_SPREAD,
  BOSS_BULLET_RADIUS,
  BOSS_BULLET_COLOR,
  BOSS_HP_BAR_WIDTH,
  HP_BAR_OFFSET,
  HP_BAR_HEIGHT,
} from './config.js';
import { Character } from './character.js';

// ===== 依關卡計算敵人數值 (stats per stage) =====

/**
 * 第 stage 關的成長倍率：1 + 成長率 × (關卡 - 1) (growth multiplier)
 * 例如成長率 0.15：第 1 關 1.0 倍、第 2 關 1.15 倍、第 5 關 1.6 倍。
 * @param {number} growth 每關成長率
 * @param {number} stage 第幾關
 * @returns {number}
 */
function growthMultiplier(growth, stage) {
  return 1 + growth * (stage - 1);
}

/**
 * 依關卡算出「血量、傷害、射速」這三個會成長的數值 (scaled HP, damage, fire interval)
 * 血量 = min(依關卡成長的血量, 玩家最強 DPS × 允許秒數)，避免敵人變成打不死的 bullet sponge。
 * @param {number} stage 第幾關
 * @param {number} playerBestDps 玩家最強武器的 DPS
 * @param {number} baseHp 第 1 關血量
 * @param {number} baseDamage 第 1 關子彈傷害
 * @param {number} baseFireInterval 第 1 關開槍間隔
 * @param {number} hpCapSeconds 血量上限的秒數
 * @returns {{maxHp: number, bulletDamage: number, fireInterval: number}}
 */
function scaleStats(stage, playerBestDps, baseHp, baseDamage, baseFireInterval, hpCapSeconds) {
  const grownHp = baseHp * growthMultiplier(ENEMY_HP_GROWTH, stage);
  const hpCap = playerBestDps * hpCapSeconds;

  // 開槍間隔越來越短，但有下限 (fire interval shrinks, with a floor)
  const fireRatio = Math.max(
    ENEMY_MIN_FIRE_INTERVAL_RATIO,
    1 - ENEMY_FIRE_RATE_GROWTH * (stage - 1)
  );

  return {
    maxHp: Math.round(Math.min(grownHp, hpCap)),
    bulletDamage: Math.round(baseDamage * growthMultiplier(ENEMY_DAMAGE_GROWTH, stage)),
    fireInterval: baseFireInterval * fireRatio,
  };
}

/**
 * 一般敵人在第 stage 關的完整數值 (normal enemy stats for a stage)
 * @param {number} stage 第幾關
 * @param {number} playerBestDps 玩家最強武器的 DPS
 * @returns {object}
 */
export function createEnemyStats(stage, playerBestDps) {
  const scaled = scaleStats(
    stage, playerBestDps, ENEMY_MAX_HP, ENEMY_BULLET_DAMAGE, ENEMY_FIRE_INTERVAL, ENEMY_HP_CAP_SECONDS
  );
  return {
    radius: ENEMY_RADIUS,
    speed: ENEMY_SPEED,
    color: ENEMY_COLOR,
    maxHp: scaled.maxHp,
    fireInterval: scaled.fireInterval,
    bulletDamage: scaled.bulletDamage,
    bulletSpeed: ENEMY_BULLET_SPEED,
    bulletRadius: ENEMY_BULLET_RADIUS,
    bulletColor: ENEMY_BULLET_COLOR,
    hpBarWidth: undefined, // 用預設寬度 (use default width)
    imageName: 'enemy',    // 美術圖片名稱 (sprite name)
  };
}

/**
 * BOSS 在第 stage 關的完整數值 (boss stats for a stage)
 * @param {number} stage 第幾關
 * @param {number} playerBestDps 玩家最強武器的 DPS
 * @returns {object}
 */
export function createBossStats(stage, playerBestDps) {
  const scaled = scaleStats(
    stage, playerBestDps, BOSS_MAX_HP, BOSS_BULLET_DAMAGE, BOSS_FIRE_INTERVAL, BOSS_HP_CAP_SECONDS
  );
  return {
    radius: BOSS_RADIUS,
    speed: BOSS_SPEED,
    color: BOSS_COLOR,
    maxHp: scaled.maxHp,
    fireInterval: scaled.fireInterval,
    bulletDamage: scaled.bulletDamage,
    bulletSpeed: BOSS_BULLET_SPEED,
    bulletRadius: BOSS_BULLET_RADIUS,
    bulletColor: BOSS_BULLET_COLOR,
    hpBarWidth: BOSS_HP_BAR_WIDTH,
    imageName: 'boss',
  };
}

// ===== 一般敵人 (normal enemy) =====

// 一般敵人：繼承 Character，加上自己的 AI (enemy with simple AI)
export class Enemy extends Character {
  /**
   * 建立敵人 (create enemy)
   * @param {number} x 起始 x
   * @param {number} y 起始 y
   * @param {object} stats 數值，由 createEnemyStats / createBossStats 產生 (stats object)
   */
  constructor(x, y, stats) {
    super(x, y, stats.radius, stats.speed, stats.maxHp, stats.color);

    if (stats.hpBarWidth !== undefined) {
      this.hpBarWidth = stats.hpBarWidth;
    }
    this.imageName = stats.imageName;
    this.fireInterval = stats.fireInterval;

    // 這個敵人射出的子彈數值 (bullet stats for this enemy)
    this.bulletStats = {
      speed: stats.bulletSpeed,
      damage: stats.bulletDamage,
      range: ENEMY_BULLET_RANGE,
      pierce: false,
      explosionRadius: 0,
      radius: stats.bulletRadius,
      color: stats.bulletColor,
    };

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

      if (this.shootCooldown === 0) {
        this.shootAtPlayer(bullets);
        this.shootCooldown = this.fireInterval;
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

  /**
   * 朝玩家開槍：一發，加上隨機偏移，敵人才不會百發百中 (shoot one bullet with random spread)
   * BOSS 會覆寫這個方法，改成扇形多發。
   * @param {Bullet[]} bullets 子彈陣列
   */
  shootAtPlayer(bullets) {
    const spread = (Math.random() * 2 - 1) * ENEMY_BULLET_SPREAD;
    this.shootBullet(bullets, this.aimAngle + spread, 'enemy', this.bulletStats);
  }
}

// ===== BOSS =====

// BOSS：繼承 Enemy，AI 完全一樣，只改「怎麼開槍」和外觀 (boss: same AI, different attack & look)
export class Boss extends Enemy {
  /**
   * 覆寫開槍：一次射出扇形的多顆子彈 (override: fire a fan of bullets)
   * @param {Bullet[]} bullets 子彈陣列
   */
  shootAtPlayer(bullets) {
    // 跟霰彈槍同樣的算法：從 -spread 到 +spread 平均分配 (same fan math as the shotgun)
    const step = (BOSS_FAN_SPREAD * 2) / (BOSS_BULLET_COUNT - 1);
    for (let i = 0; i < BOSS_BULLET_COUNT; i++) {
      const angle = this.aimAngle - BOSS_FAN_SPREAD + step * i;
      this.shootBullet(bullets, angle, 'enemy', this.bulletStats);
    }
  }

  /**
   * 覆寫 draw：照常畫好，再在血條上方寫 BOSS (override draw: add a BOSS label)
   * @param {CanvasRenderingContext2D} ctx 畫筆
   */
  draw(ctx) {
    super.draw(ctx);

    ctx.fillStyle = BOSS_COLOR;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('BOSS', this.x, this.y - this.radius - HP_BAR_OFFSET - HP_BAR_HEIGHT - 2);
  }
}
