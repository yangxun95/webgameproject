import {
  ENEMY_BASE_COUNT,
  ENEMY_COUNT_MAX,
  ENEMY_COUNT_STAGES_PER_EXTRA,
  BOSS_STAGE_INTERVAL,
  BOSS_MINION_COUNT,
  MESSAGE_TIME,
  GAME_OVER_INPUT_DELAY,
  STORAGE_KEY_BEST_STAGE,
  BULLET_STEP_SIZE,
  STAGE_HEAL,
  AIM_ASSIST_ANGLE,
  AIM_ASSIST_RANGE,
  SCREEN_SHAKE_DURATION,
  SCREEN_SHAKE_STRENGTH,
  KNOCKBACK_DISTANCE,
  KNOCKBACK_COOLDOWN,
  DAMAGE_TEXT_SPREAD,
  DAMAGE_TEXT_OFFSET_Y,
  DAMAGE_TEXT_COLOR,
  PLAYER_DAMAGE_TEXT_COLOR,
  DEATH_PARTICLE_COUNT,
  CRATE_PARTICLE_COUNT,
  CRATE_COLOR,
  ENEMY_AMMO_DROP_CHANCE,
  CRATE_AMMO_DROP_CHANCE,
  AMMO_PICKUP_RATIO,
  CRATE_POTION_DROP_CHANCE,
  POTION_HEAL,
} from './config.js';
import { input, updateInput, isTouchMode, getTouchControls } from './input.js';
import { GameMap } from './map.js';
import { Player } from './player.js';
import { Enemy, Boss, createEnemyStats, createBossStats } from './enemy.js';
import { Explosion } from './bullet.js';
import { FloatingText, createBurst } from './effects.js';
import { createRandomItem, applyItem, AmmoPickup, HealthPotion, BossReward } from './items.js';
import {
  drawWeaponHud,
  drawStatusHud,
  drawStageHud,
  drawCenterMessage,
  drawMenu,
  drawGameOverScreen,
  drawTouchControls,
} from './ui.js';

// ===== 最高紀錄存檔：localStorage (best record in localStorage) =====
// localStorage 是瀏覽器提供的小型儲存空間，關掉網頁再打開資料還在，但只能存字串。
// 無痕模式或瀏覽器封鎖儲存時可能會出錯，所以用 try / catch 包起來，失敗就當作沒有紀錄。

/**
 * 讀取最高紀錄 (load best stage)
 * @returns {number} 最高關卡，沒有紀錄回傳 0
 */
function loadBestStage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_BEST_STAGE); // 沒存過會得到 null (null if never saved)
    const value = Number(saved);                                // 字串轉數字，null 會變 0 (string → number)
    return Number.isFinite(value) ? value : 0;                  // 不是正常數字就當 0 (guard against junk)
  } catch (error) {
    return 0;
  }
}

/**
 * 儲存最高紀錄 (save best stage)
 * @param {number} stage 關卡數
 */
function saveBestStage(stage) {
  try {
    localStorage.setItem(STORAGE_KEY_BEST_STAGE, String(stage)); // 只能存字串 (strings only)
  } catch (error) {
    // 存不了就算了，遊戲照樣能玩 (ignore: the game still works without saving)
  }
}

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
// 遊戲狀態 state 有三種：
//   'menu'   ：主選單（背景是一張還沒開始的地圖）
//   'playing'：遊戲中
//   'dead'   ：玩家死亡，等待重新開始或回主選單
//
//   menu ──Enter──→ playing ──死亡──→ dead ──Enter──→ playing
//     ↑                                 │
//     └──────────────Esc────────────────┘
export class Game {
  constructor() {
    this.bestStage = loadBestStage();
    // 畫面震動：剩下幾秒，以及這一幀的偏移量 (screen shake: time left and this frame's offset)
    this.shakeTimer = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.goToMenu();
  }

  // ===== 流程控制 (flow control) =====

  /**
   * 回到主選單：先準備好一局當作背景，但不開始更新 (go to the main menu)
   */
  goToMenu() {
    this.state = 'menu';
    this.prepareRun();
    this.menuTimer = 0;      // 在選單停留幾秒，閃爍提示用 (seconds on the menu)
    this.messageTimer = 0;   // 選單上不顯示「第 1 關」(no stage banner on the menu)
  }

  /**
   * 開始新的一局並進入遊戲 (start a new run and play)
   */
  startNewRun() {
    this.state = 'playing';
    this.prepareRun();
  }

  /**
   * 準備一局：從第 1 關開始，玩家重新建立（血量、武器、道具全部重置）(prepare a fresh run)
   * 主選單和開新局都會用到，差別只在 state。
   */
  prepareRun() {
    this.stage = 1;
    this.player = null;     // 設成 null，loadStage 才會建立新玩家 (force a fresh player)
    this.deadTimer = 0;     // 死亡後經過幾秒 (seconds since death)
    // 記下開局時的紀錄，死亡時比較，才知道這局有沒有破紀錄 (record before this run)
    this.recordAtRunStart = this.bestStage;
    this.loadStage();
  }

  /**
   * 目前關卡超過最高紀錄就更新並存檔 (update and save the best record)
   * 每進一關就檢查，所以就算玩到一半直接關掉網頁，紀錄也不會不見。
   */
  updateBestStage() {
    if (this.state !== 'playing') return; // 主選單的背景地圖不算 (menu background doesn't count)
    if (this.stage > this.bestStage) {
      this.bestStage = this.stage;
      saveBestStage(this.bestStage);
    }
  }

  /**
   * 這局是否破了紀錄 (did this run beat the old record)
   * @returns {boolean}
   */
  isNewRecord() {
    return this.stage > this.recordAtRunStart;
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
      // 下一關：同一個玩家搬到新出生點，回一點血 (next stage: keep the player, heal a bit)
      this.player.x = spawn.x;
      this.player.y = spawn.y;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + STAGE_HEAL);
    }

    this.spawnEnemies();

    this.bullets = [];
    this.explosions = [];     // 畫面上的爆炸特效 (explosion visuals)
    this.effects = [];        // 傷害數字、碎片等打擊感特效 (damage numbers, particles)
    this.ammoPickups = [];    // 地上的彈藥 (ammo on the ground)
    this.potions = [];        // 地上的回血藥 (health potions on the ground)

    // 這一關的道具：null 代表地上沒有道具 (item on the ground, null = none)
    this.item = null;
    // 敵人是否已經全滅過（道具只掉一次）(has the stage been cleared)
    this.stageCleared = false;
    // 最後一個倒下的敵人位置，道具會掉在這裡 (where the last enemy died)
    this.lastEnemyDeathX = 0;
    this.lastEnemyDeathY = 0;
    // BOSS 掉落的獎勵：null 代表沒有 (boss reward on the ground, null = none)
    this.bossReward = null;

    this.updateBestStage();

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
    this.updateShake(dt);
    this.updateEffects(dt);

    if (this.state === 'menu') {
      this.updateMenu(dt);
    } else if (this.state === 'playing') {
      this.updatePlaying(dt);
    } else if (this.state === 'dead') {
      this.updateDead(dt);
    }
  }

  /**
   * 主選單的更新：按 Enter 或點擊就開始新的一局 (update on the menu)
   * @param {number} dt 經過秒數
   */
  updateMenu(dt) {
    this.menuTimer += dt;
    if (input.confirm) {
      this.startNewRun();
    }
  }

  /**
   * 遊戲中的更新：每一幀依序處理移動、戰鬥、掉落、撿東西、關卡進度 (update while playing)
   * @param {number} dt 經過秒數
   */
  updatePlaying(dt) {
    // 先記下血量 + 護甲，更新完再比較，就知道這一幀有沒有受傷（子彈、陷阱都算）(detect damage taken this frame)
    const healthBefore = this.player.hp + this.player.armor;

    // 手機射擊時才做瞄準輔助；電腦用滑鼠，本來就瞄得準 (aim assist only for touch)
    if (isTouchMode() && input.isShooting) {
      this.applyAimAssist();
    }
    this.player.update(dt, input, this.bullets, this.map);
    for (const enemy of this.enemies) {
      enemy.update(dt, this.player, this.bullets, this.map);
    }
    this.updateBullets(dt);
    for (const explosion of this.explosions) {
      explosion.update(dt);
    }

    const healthLost = healthBefore - (this.player.hp + this.player.armor);
    if (healthLost > 0) {
      this.startShake();
      this.addDamageText(this.player, healthLost, PLAYER_DAMAGE_TEXT_COLOR);
    }

    this.handleEnemyDeaths();
    this.handleBrokenCrates();
    this.handlePickups();
    this.removeFinishedObjects();

    // 玩家死亡就切到死亡畫面，這一幀後面都不用做了 (player died: switch state and stop here)
    if (this.player.isDead()) {
      this.state = 'dead';
      this.deadTimer = 0;
      this.messageTimer = 0; // 收掉提示文字，免得跟 GAME OVER 疊在一起 (hide message)
      return;
    }

    this.checkStageProgress();
  }

  /**
   * 處理這一幀死掉的敵人：記下位置、可能掉彈藥、噴碎片，BOSS 掉獎勵 (handle enemies that died this frame)
   * 要在 removeFinishedObjects() 之前呼叫，不然死掉的敵人已經被移除了。
   */
  handleEnemyDeaths() {
    for (const enemy of this.enemies) {
      if (!enemy.isDead()) continue;

      // 清關道具會掉在最後一個倒下的敵人位置 (the stage item drops where the last enemy died)
      this.lastEnemyDeathX = enemy.x;
      this.lastEnemyDeathY = enemy.y;
      this.tryDropAmmo(enemy.x, enemy.y, ENEMY_AMMO_DROP_CHANCE);
      this.effects.push(...createBurst(enemy.x, enemy.y, enemy.color, DEATH_PARTICLE_COUNT));

      if (enemy instanceof Boss) {
        this.bossReward = new BossReward(enemy.x, enemy.y, this.getBossNumber());
      }
    }
  }

  /**
   * 處理這一幀被打破的箱子：先抽回血藥，沒抽中才抽彈藥 (handle crates broken this frame)
   */
  handleBrokenCrates() {
    for (const crate of this.map.brokenCrates) {
      this.effects.push(...createBurst(crate.x, crate.y, CRATE_COLOR, CRATE_PARTICLE_COUNT));
      if (Math.random() < CRATE_POTION_DROP_CHANCE) {
        this.potions.push(new HealthPotion(crate.x, crate.y));
      } else {
        this.tryDropAmmo(crate.x, crate.y, CRATE_AMMO_DROP_CHANCE);
      }
    }
    // 讀完就清空，下一幀才不會重複處理 (clear so they're handled only once)
    this.map.brokenCrates = [];
  }

  /**
   * 撿地上的彈藥和回血藥 (pick up ammo and potions)
   */
  handlePickups() {
    for (const ammo of this.ammoPickups) {
      if (circlesOverlap(this.player, ammo)) {
        this.player.addAmmoToAll(AMMO_PICKUP_RATIO);
        ammo.pickedUp = true;
      }
    }

    // 血沒滿才撿，滿血時留在地上，之後受傷再回來撿 (only pick up potions when hurt)
    for (const potion of this.potions) {
      if (circlesOverlap(this.player, potion) && this.player.hp < this.player.maxHp) {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + POTION_HEAL);
        potion.pickedUp = true;
        this.showMessage(`回血藥：回復 ${POTION_HEAL} HP`);
      }
    }
  }

  /**
   * 把死掉的子彈、敵人、結束的爆炸、撿走的東西從陣列移除 (remove finished objects)
   */
  removeFinishedObjects() {
    this.bullets = this.bullets.filter((bullet) => bullet.alive);
    this.enemies = this.enemies.filter((enemy) => !enemy.isDead());
    this.explosions = this.explosions.filter((explosion) => !explosion.isDone());
    this.ammoPickups = this.ammoPickups.filter((ammo) => !ammo.pickedUp);
    this.potions = this.potions.filter((potion) => !potion.pickedUp);
  }

  /**
   * 關卡進度：敵人全滅 → 掉道具 → 撿起道具和 BOSS 獎勵 → 出口開啟 → 走進出口進下一關 (stage progress)
   */
  checkStageProgress() {
    if (this.enemies.length === 0 && !this.stageCleared) {
      this.stageCleared = true;
      this.item = createRandomItem(this.lastEnemyDeathX, this.lastEnemyDeathY);
      this.showMessage('敵人全滅！撿起道具');
    }

    if (this.item !== null && circlesOverlap(this.player, this.item)) {
      applyItem(this.item.type, this.player);
      this.showMessage(this.item.getPickupText());
      this.item = null;
    }

    if (this.bossReward !== null && circlesOverlap(this.player, this.bossReward)) {
      this.showMessage(this.bossReward.apply(this.player));
      this.bossReward = null;
    }

    // BOSS 獎勵也要撿才開出口，避免玩家不小心錯過新武器 (exit opens only after everything is picked up)
    if (this.stageCleared && this.item === null && this.bossReward === null && !this.map.exitOpen) {
      this.map.openExit();
    }

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
    if (this.deadTimer < GAME_OVER_INPUT_DELAY) return; // 還在等待時間內 (still in the delay)

    if (input.confirm) {
      this.startNewRun();
    } else if (input.back) {
      this.goToMenu();
    }
  }

  /**
   * 右上角要顯示的目前目標 (current objective text)
   * @returns {string}
   */
  getObjectiveText() {
    if (this.enemies.length > 0) {
      return `剩餘敵人：${this.enemies.length}`;
    }
    if (!this.map.exitOpen) {
      return this.bossReward !== null ? '撿起道具和 BOSS 獎勵' : '撿起道具';
    }
    return '前往出口！';
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

      // 被打退的方向 = 子彈飛行的方向 (knock back along the bullet's direction)
      this.hitEnemy(enemy, bullet.damage, Math.atan2(bullet.vy, bullet.vx));

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
        // 從爆炸中心往外推 (knock away from the blast center)
        this.hitEnemy(enemy, damage, Math.atan2(enemy.y - y, enemy.x - x));
      }
    }
    this.map.damageTilesInRadius(x, y, radius, damage);
    this.explosions.push(new Explosion(x, y, radius));
    this.startShake();
  }

  // ===== 打擊感 (game feel) =====

  /**
   * 敵人中彈：扣血、跳出傷害數字、往後退一點 (enemy got hit: damage, number, knockback)
   * @param {Enemy} enemy 被打中的敵人
   * @param {number} damage 傷害
   * @param {number} angle 被推開的方向，弧度 (knockback direction in radians)
   */
  hitEnemy(enemy, damage, angle) {
    enemy.takeDamage(damage);
    this.addDamageText(enemy, damage, DAMAGE_TEXT_COLOR);

    // BOSS 很重，不會被推開；剛被推過的也先不推 (bosses are too heavy; respect the cooldown)
    if (enemy instanceof Boss) return;
    if (enemy.knockbackCooldown > 0) return;
    enemy.knockbackCooldown = KNOCKBACK_COOLDOWN;
    // 用角色本來的 moveX / moveY，推進牆裡也會被擋住 (reuse wall collision)
    enemy.moveX(Math.cos(angle) * KNOCKBACK_DISTANCE, this.map);
    enemy.moveY(Math.sin(angle) * KNOCKBACK_DISTANCE, this.map);
  }

  /**
   * 在角色頭上加一個飄起來的傷害數字 (add a floating damage number above a character)
   * @param {Character} character 角色
   * @param {number} amount 傷害量
   * @param {string} color 顏色
   */
  addDamageText(character, amount, color) {
    // 隨機偏一點（左右偏多、上下偏少），霰彈一次打中好幾顆時數字才不會疊在一起 (random offset)
    const offsetX = (Math.random() * 2 - 1) * DAMAGE_TEXT_SPREAD;
    const offsetY = (Math.random() * 2 - 1) * DAMAGE_TEXT_SPREAD / 2;
    const x = character.x + offsetX;
    const y = character.y - character.radius - DAMAGE_TEXT_OFFSET_Y + offsetY;
    this.effects.push(new FloatingText(x, y, String(Math.round(amount)), color));
  }

  /**
   * 開始畫面震動 (start screen shake)
   */
  startShake() {
    this.shakeTimer = SCREEN_SHAKE_DURATION;
  }

  /**
   * 更新畫面震動：每幀隨機偏移，越接近結束晃得越小 (random offset that fades out)
   * @param {number} dt 經過秒數
   */
  updateShake(dt) {
    this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    // 剩下的時間比例 1 → 0，乘上去讓震動慢慢變小 (strength fades with remaining time)
    const strength = SCREEN_SHAKE_STRENGTH * (this.shakeTimer / SCREEN_SHAKE_DURATION);
    this.shakeX = (Math.random() * 2 - 1) * strength;
    this.shakeY = (Math.random() * 2 - 1) * strength;
  }

  /**
   * 更新所有特效，移除結束的 (update effects and remove finished ones)
   * @param {number} dt 經過秒數
   */
  updateEffects(dt) {
    for (const effect of this.effects) {
      effect.update(dt);
    }
    this.effects = this.effects.filter((effect) => !effect.isDone());
  }

  /**
   * 瞄準輔助：在玩家推的方向附近找一個看得到的敵人，把瞄準角度改成對準他 (aim assist)
   * 條件：距離在 AIM_ASSIST_RANGE 內、角度差在 AIM_ASSIST_ANGLE 內、中間沒被擋住。
   * 有好幾個符合時，選角度差最小的，也就是最接近玩家想瞄的那個。
   */
  applyAimAssist() {
    let bestEnemy = null;
    let bestDiff = AIM_ASSIST_ANGLE;

    for (const enemy of this.enemies) {
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      if (Math.hypot(dx, dy) > AIM_ASSIST_RANGE) continue;

      // 兩個角度相減後再用 atan2(sin, cos) 轉回 -π ~ π，才不會出現 350° 這種繞遠路的差 (wrap angle difference)
      const enemyAngle = Math.atan2(dy, dx);
      const raw = enemyAngle - input.aimAngle;
      const diff = Math.abs(Math.atan2(Math.sin(raw), Math.cos(raw)));
      if (diff > bestDiff) continue;

      if (!this.map.hasLineOfSight(this.player.x, this.player.y, enemy.x, enemy.y)) continue;

      bestEnemy = enemy;
      bestDiff = diff;
    }

    if (bestEnemy !== null) {
      input.aimAngle = Math.atan2(bestEnemy.y - this.player.y, bestEnemy.x - this.player.x);
    }
  }

  /**
   * 依機率在某個位置掉落彈藥；玩家沒有需要彈藥的槍就不掉 (maybe drop ammo)
   * @param {number} x 位置 x
   * @param {number} y 位置 y
   * @param {number} chance 機率 0 ~ 1
   */
  tryDropAmmo(x, y, chance) {
    if (!this.player.needsAmmo()) return;
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
    // 遊戲世界跟著畫面震動一起偏移；HUD 不動，才看得清楚 (shake the world, not the HUD)
    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);

    this.map.draw(ctx);

    for (const ammo of this.ammoPickups) {
      ammo.draw(ctx);
    }
    for (const potion of this.potions) {
      potion.draw(ctx);
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
    for (const effect of this.effects) {
      effect.draw(ctx);
    }
    ctx.restore(); // 取消震動偏移，接下來畫 HUD (undo shake before the HUD)

    // ----- 依狀態畫最上層的介面 (UI layer by state) -----
    if (this.state === 'menu') {
      drawMenu(ctx, this.bestStage, this.menuTimer, isTouchMode());
      return; // 選單不畫 HUD (no HUD on the menu)
    }

    drawStatusHud(ctx, this.player);
    drawStageHud(ctx, this.stage, this.isBossStage(), this.getObjectiveText(), this.bestStage);
    drawWeaponHud(ctx, this.player);

    // 觸控模式而且在遊戲中，才畫虛擬搖桿和按鈕 (touch controls only while playing on touch)
    if (isTouchMode() && this.state === 'playing') {
      drawTouchControls(ctx, getTouchControls());
    }

    if (this.messageTimer > 0) {
      drawCenterMessage(ctx, this.messageText);
    }
    if (this.state === 'dead') {
      drawGameOverScreen(
        ctx,
        this.stage,
        this.bestStage,
        this.isNewRecord(),
        this.deadTimer >= GAME_OVER_INPUT_DELAY,
        isTouchMode()
      );
    }
  }
}
