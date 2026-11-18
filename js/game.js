import {
  GAME_WIDTH,
  GAME_HEIGHT,
  ENEMY_BASE_COUNT,
  ENEMY_COUNT_MAX,
  ENEMY_COUNT_STAGES_PER_EXTRA,
  BOSS_STAGE_INTERVAL,
  BOSS_MINION_COUNT,
  MESSAGE_TIME,
  GAME_OVER_INPUT_DELAY,
  MESSAGE_BG_COLOR,
  MESSAGE_TEXT_COLOR,
  GAME_OVER_OVERLAY_COLOR,
  GAME_OVER_TEXT_COLOR,
  BULLET_STEP_SIZE,
  ENEMY_AMMO_DROP_CHANCE,
  CRATE_AMMO_DROP_CHANCE,
  AMMO_PICKUP_RATIO,
} from './config.js';
import { input, updateInput } from './input.js';
import { GameMap } from './map.js';
import { Player } from './player.js';
import { Enemy, Boss, createEnemyStats, createBossStats } from './enemy.js';
import { Explosion } from './bullet.js';
import { createRandomItem, applyItem, AmmoPickup, BossReward } from './items.js';
import { drawWeaponHud } from './ui.js';

/**
 * 兩個圓有沒有重疊：圓心距離 < 兩個半徑相加 (circle-circle collision)
 * @param {{x: number, y: number, radius: number}} a
 * @param {{x: number, y: number, radius: number}} b
 * @returns {boolean}
 */
function circlesOverlap(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y) < a.radius + b.radius;
}

// 遊戲本體：管理目前狀態、第幾關，以及地圖、玩家、敵人、子彈 (game state & stage flow)
//
// 遊戲狀態 state 只有兩種：
//   'playing'：遊戲中
//   'dead'   ：玩家死亡，等待重新開始
// 第 9 步做主選單時會再加一個 'menu'。
export class Game {
  constructor() {
    this.startNewRun();
  }

  // ===== 流程控制 (flow control) =====

  /**
   * 開始新的一局：從第 1 關開始，玩家重新建立（血量、之後的武器道具全部重置）(start a new run)
   */
  startNewRun() {
    this.state = 'playing';
    this.stage = 1;
    this.player = null;     // 設成 null，loadStage 才會建立新玩家 (force a fresh player)
    this.deadTimer = 0;     // 死亡後經過幾秒 (seconds since death)
    this.loadStage();
  }

  /**
   * 載入目前這一關：新地圖、新敵人、清空子彈 (load the current stage)
   * 玩家會保留血量，只是移到新地圖的出生點。
   */
  loadStage() {
    this.map = new GameMap();
    const spawn = this.map.getSpawnPosition();

    if (this.player === null) {
      // 新的一局：建立新玩家 (new run: create a new player)
      this.player = new Player(spawn.x, spawn.y);
    } else {
      // 下一關：同一個玩家搬到新出生點，血量不變 (next stage: keep the same player)
      this.player.x = spawn.x;
      this.player.y = spawn.y;
    }

    this.spawnEnemies();

    this.bullets = [];
    this.explosions = [];     // 畫面上的爆炸特效 (explosion visuals)
    this.ammoPickups = [];    // 地上的彈藥 (ammo on the ground)

    // 這一關的道具：null 代表地上沒有道具 (item on the ground, null = none)
    this.item = null;
    // 敵人是否已經全滅過（道具只掉一次）(has the stage been cleared)
    this.stageCleared = false;
    // 最後一個倒下的敵人位置，道具會掉在這裡 (where the last enemy died)
    this.lastEnemyDeathX = 0;
    this.lastEnemyDeathY = 0;
    // BOSS 掉落的獎勵：null 代表沒有 (boss reward on the ground, null = none)
    this.bossReward = null;

    if (this.isBossStage()) {
      this.showMessage(`第 ${this.stage} 關 - BOSS 戰！`);
    } else {
      this.showMessage(`第 ${this.stage} 關`);
    }
  }

  /**
   * 這一關是不是 BOSS 關：關卡數能被 5 整除 (is this a boss stage)
   * @returns {boolean}
   */
  isBossStage() {
    return this.stage % BOSS_STAGE_INTERVAL === 0;
  }

  /**
   * 這是第幾個 BOSS：第 5 關是第 1 個、第 10 關是第 2 個 (which boss is this, 1-based)
   * @returns {number}
   */
  getBossNumber() {
    return this.stage / BOSS_STAGE_INTERVAL;
  }

  /**
   * 一般關卡的敵人數量：每過幾關多 1 個，有上限 (enemy count for a normal stage)
   * 例如第 1~2 關 2 個、第 3~4 關 3 個……最多 8 個。
   * @returns {number}
   */
  getEnemyCount() {
    const extra = Math.floor((this.stage - 1) / ENEMY_COUNT_STAGES_PER_EXTRA);
    return Math.min(ENEMY_COUNT_MAX, ENEMY_BASE_COUNT + extra);
  }

  /**
   * 依目前關卡產生敵人；BOSS 關是 1 個 BOSS 加幾個小兵 (spawn enemies for this stage)
   */
  spawnEnemies() {
    // 敵人的數值依「關卡」和「玩家最強武器」決定 (stats depend on stage and player's best weapon)
    const bestDps = this.player.getBestDps();
    const enemyStats = createEnemyStats(this.stage, bestDps);

    this.enemies = [];

    if (this.isBossStage()) {
      // 第一個位置給 BOSS，其他給小兵 (first position for the boss, rest for minions)
      const positions = this.map.getEnemySpawnPositions(1 + BOSS_MINION_COUNT);
      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        if (i === 0) {
          this.enemies.push(new Boss(pos.x, pos.y, createBossStats(this.stage, bestDps)));
        } else {
          this.enemies.push(new Enemy(pos.x, pos.y, enemyStats));
        }
      }
    } else {
      for (const pos of this.map.getEnemySpawnPositions(this.getEnemyCount())) {
        this.enemies.push(new Enemy(pos.x, pos.y, enemyStats));
      }
    }
  }

  /**
   * 在畫面中央顯示一段提示文字，幾秒後消失 (show a center message for a while)
   * @param {string} text 要顯示的文字
   */
  showMessage(text) {
    this.messageText = text;
    this.messageTimer = MESSAGE_TIME;
  }

  // ===== 每幀更新 (update) =====

  /**
   * 依目前狀態更新遊戲 (update according to current state)
   * @param {number} dt 經過秒數
   */
  update(dt) {
    updateInput(this.player);
    this.messageTimer = Math.max(0, this.messageTimer - dt);

    if (this.state === 'playing') {
      this.updatePlaying(dt);
    } else if (this.state === 'dead') {
      this.updateDead(dt);
    }
  }

  /**
   * 遊戲中的更新 (update while playing)
   * @param {number} dt 經過秒數
   */
  updatePlaying(dt) {
    this.player.update(dt, input, this.bullets, this.map);

    for (const enemy of this.enemies) {
      enemy.update(dt, this.player, this.bullets, this.map);
    }

    this.updateBullets(dt);

    for (const explosion of this.explosions) {
      explosion.update(dt);
    }

    // 移除前先記下死掉敵人的位置，道具要掉在這裡；也有機率掉彈藥 (enemy deaths: remember position, maybe drop ammo)
    for (const enemy of this.enemies) {
      if (enemy.isDead()) {
        this.lastEnemyDeathX = enemy.x;
        this.lastEnemyDeathY = enemy.y;
        this.tryDropAmmo(enemy.x, enemy.y, ENEMY_AMMO_DROP_CHANCE);

        // instanceof：檢查這個物件是不是 Boss 這個 class 建立的 (is this enemy a Boss?)
        if (enemy instanceof Boss) {
          this.bossReward = new BossReward(enemy.x, enemy.y, this.getBossNumber());
        }
      }
    }

    // 被打破的箱子也有機率掉彈藥，讀完就清空清單 (broken crates may drop ammo)
    for (const crate of this.map.brokenCrates) {
      this.tryDropAmmo(crate.x, crate.y, CRATE_AMMO_DROP_CHANCE);
    }
    this.map.brokenCrates = [];

    // 撿彈藥 (pick up ammo)
    for (const ammo of this.ammoPickups) {
      if (circlesOverlap(this.player, ammo)) {
        this.player.addAmmoToAll(AMMO_PICKUP_RATIO);
        ammo.pickedUp = true;
      }
    }

    // 清除死掉的子彈、敵人、結束的爆炸、撿走的彈藥 (remove finished objects)
    this.bullets = this.bullets.filter((bullet) => bullet.alive);
    this.enemies = this.enemies.filter((enemy) => !enemy.isDead());
    this.explosions = this.explosions.filter((explosion) => !explosion.isDone());
    this.ammoPickups = this.ammoPickups.filter((ammo) => !ammo.pickedUp);

    // ----- 玩家死亡 (player died) -----
    if (this.player.isDead()) {
      this.state = 'dead';
      this.deadTimer = 0;
      this.messageTimer = 0; // 收掉提示文字，免得跟 GAME OVER 疊在一起 (hide message)
      return;
    }

    // ----- 清關：敵人全滅 → 在最後一個敵人倒下的位置掉落道具 (stage clear: drop an item) -----
    if (this.enemies.length === 0 && !this.stageCleared) {
      this.stageCleared = true;
      this.item = createRandomItem(this.lastEnemyDeathX, this.lastEnemyDeathY);
      this.showMessage('敵人全滅！撿起道具');
    }

    // ----- 撿起道具 → 套用效果 (pick up item) -----
    if (this.item !== null && circlesOverlap(this.player, this.item)) {
      applyItem(this.item.type, this.player);
      this.showMessage(this.item.getPickupText());
      this.item = null;
    }

    // ----- 撿起 BOSS 獎勵：新武器或補給箱 (pick up boss reward) -----
    if (this.bossReward !== null && circlesOverlap(this.player, this.bossReward)) {
      this.showMessage(this.bossReward.apply(this.player));
      this.bossReward = null;
    }

    // ----- 開啟出口：已清關，而且道具和 BOSS 獎勵都撿完了 (open exit when everything is picked up) -----
    // BOSS 獎勵也要撿才開，避免玩家不小心錯過新武器 (so the player can't miss the new weapon)
    if (this.stageCleared && this.item === null && this.bossReward === null && !this.map.exitOpen) {
      this.map.openExit();
    }

    // ----- 走進開啟的出口：進入下一關 (enter the open exit: next stage) -----
    if (this.map.exitOpen && this.map.isAtExit(this.player.x, this.player.y)) {
      this.stage++;
      this.loadStage();
    }
  }

  /**
   * 死亡畫面的更新：等一下下，然後按 Enter 或點擊就重新開始 (update on game over)
   * @param {number} dt 經過秒數
   */
  updateDead(dt) {
    this.deadTimer += dt;
    if (this.deadTimer >= GAME_OVER_INPUT_DELAY && input.confirm) {
      this.startNewRun();
    }
  }

  // ===== 子彈、爆炸、彈藥 (bullets, explosions, ammo) =====

  /**
   * 移動所有子彈；每顆子彈把這一幀切成好幾小段，每段都檢查碰撞 (move bullets with sub-steps)
   * 為什麼要切？狙擊槍子彈一幀可能飛 100px 以上，一次飛完會直接「跳過」中間的牆或敵人。
   * 切成每段最多 BULLET_STEP_SIZE（8px），就不會漏掉。
   * @param {number} dt 經過秒數
   */
  updateBullets(dt) {
    for (const bullet of this.bullets) {
      const distance = bullet.speed * dt;
      const steps = Math.max(1, Math.ceil(distance / BULLET_STEP_SIZE));
      const stepDt = dt / steps;

      for (let i = 0; i < steps && bullet.alive; i++) {
        bullet.update(stepDt, this.map);
        if (bullet.alive) {
          this.checkBulletHit(bullet);
        }
      }

      // 爆炸彈不管是撞牆、打中敵人還是飛到射程盡頭，消失的那一刻都會爆炸 (explode on death)
      if (!bullet.alive && bullet.isExplosive()) {
        this.explode(bullet.x, bullet.y, bullet.explosionRadius, bullet.damage);
      }
    }
  }

  /**
   * 檢查一顆子彈有沒有打中角色 (check one bullet against characters)
   * 玩家的子彈只打敵人，敵人的子彈只打玩家，不會打到自己人。
   * @param {Bullet} bullet 子彈
   */
  checkBulletHit(bullet) {
    if (bullet.owner === 'enemy') {
      if (circlesOverlap(bullet, this.player)) {
        this.player.takeDamage(bullet.damage);
        bullet.alive = false;
      }
      return;
    }

    for (const enemy of this.enemies) {
      if (enemy.isDead()) continue;
      if (bullet.hitEnemies.has(enemy)) continue; // 貫穿彈已經打過這個敵人 (already hit)
      if (!circlesOverlap(bullet, enemy)) continue;

      if (bullet.isExplosive()) {
        // 榴彈打中敵人：不直接扣血，消失後由爆炸造成範圍傷害 (grenade: damage comes from the explosion)
        bullet.alive = false;
        return;
      }

      enemy.takeDamage(bullet.damage);

      if (bullet.pierce) {
        bullet.hitEnemies.add(enemy); // 記下來，繼續往前飛 (remember, keep flying)
      } else {
        bullet.alive = false;
        return; // 一顆子彈只打中一個敵人 (one bullet, one hit)
      }
    }
  }

  /**
   * 在某個位置爆炸：範圍內的敵人和箱子都受到傷害，並產生爆炸特效 (explode)
   * 玩家不會被自己的爆炸炸到，比較好玩。(the player is immune to own explosions)
   * @param {number} x 中心 x
   * @param {number} y 中心 y
   * @param {number} radius 半徑
   * @param {number} damage 傷害
   */
  explode(x, y, radius, damage) {
    for (const enemy of this.enemies) {
      // 敵人身體任何一部分在爆炸範圍內就算：距離 < 爆炸半徑 + 敵人半徑 (any part inside the blast)
      if (Math.hypot(enemy.x - x, enemy.y - y) < radius + enemy.radius) {
        enemy.takeDamage(damage);
      }
    }
    this.map.damageTilesInRadius(x, y, radius, damage);
    this.explosions.push(new Explosion(x, y, radius));
  }

  /**
   * 依機率在某個位置掉落彈藥；玩家沒有需要彈藥的槍就不掉 (maybe drop ammo)
   * @param {number} x 位置 x
   * @param {number} y 位置 y
   * @param {number} chance 機率 0 ~ 1
   */
  tryDropAmmo(x, y, chance) {
    if (!this.player.needsAmmo()) return;
    // Math.random() < 0.4 的機率剛好是 40% (random() < chance happens with that probability)
    if (Math.random() < chance) {
      this.ammoPickups.push(new AmmoPickup(x, y));
    }
  }

  // ===== 繪製 (drawing) =====

  /**
   * 畫出地圖、子彈、角色，以及提示文字或死亡畫面 (draw everything)
   * @param {CanvasRenderingContext2D} ctx 畫筆
   */
  draw(ctx) {
    this.map.draw(ctx);

    for (const ammo of this.ammoPickups) {
      ammo.draw(ctx);
    }
    if (this.item !== null) {
      this.item.draw(ctx);
    }
    if (this.bossReward !== null) {
      this.bossReward.draw(ctx);
    }

    for (const bullet of this.bullets) {
      bullet.draw(ctx);
    }
    for (const enemy of this.enemies) {
      enemy.draw(ctx);
    }
    this.player.draw(ctx);

    for (const explosion of this.explosions) {
      explosion.draw(ctx);
    }

    drawWeaponHud(ctx, this.player);

    if (this.messageTimer > 0) {
      this.drawMessage(ctx);
    }
    if (this.state === 'dead') {
      this.drawGameOver(ctx);
    }
  }

  /**
   * 在畫面中央畫提示文字，背後一條半透明黑帶 (draw center message)
   * @param {CanvasRenderingContext2D} ctx 畫筆
   */
  drawMessage(ctx) {
    const bandHeight = 60;
    ctx.fillStyle = MESSAGE_BG_COLOR;
    ctx.fillRect(0, GAME_HEIGHT / 2 - bandHeight / 2, GAME_WIDTH, bandHeight);

    ctx.fillStyle = MESSAGE_TEXT_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(this.messageText, GAME_WIDTH / 2, GAME_HEIGHT / 2);
  }

  /**
   * 玩家死亡時，蓋一層半透明黑色並顯示文字 (game over overlay)
   * @param {CanvasRenderingContext2D} ctx 畫筆
   */
  drawGameOver(ctx) {
    ctx.fillStyle = GAME_OVER_OVERLAY_COLOR;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.fillStyle = GAME_OVER_TEXT_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText('GAME OVER', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40);
    ctx.font = '24px sans-serif';
    ctx.fillText(`撐到第 ${this.stage} 關`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10);

    // 等待時間過了才顯示操作提示 (show hint after the delay)
    if (this.deadTimer >= GAME_OVER_INPUT_DELAY) {
      ctx.font = '20px sans-serif';
      ctx.fillText('按 Enter 或點擊畫面重新開始', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50);
    }
  }
}
