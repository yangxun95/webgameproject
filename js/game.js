import {
  GAME_WIDTH,
  GAME_HEIGHT,
  ENEMY_COUNT,
  MESSAGE_TIME,
  GAME_OVER_INPUT_DELAY,
  MESSAGE_BG_COLOR,
  MESSAGE_TEXT_COLOR,
  GAME_OVER_OVERLAY_COLOR,
  GAME_OVER_TEXT_COLOR,
} from './config.js';
import { input, updateInput } from './input.js';
import { GameMap } from './map.js';
import { Player } from './player.js';
import { Enemy } from './enemy.js';
import { createRandomItem, applyItem } from './items.js';

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

    this.enemies = [];
    for (const pos of this.map.getEnemySpawnPositions(ENEMY_COUNT)) {
      this.enemies.push(new Enemy(pos.x, pos.y));
    }

    this.bullets = [];

    // 這一關的道具：null 代表地上沒有道具 (item on the ground, null = none)
    this.item = null;
    // 敵人是否已經全滅過（道具只掉一次）(has the stage been cleared)
    this.stageCleared = false;
    // 最後一個倒下的敵人位置，道具會掉在這裡 (where the last enemy died)
    this.lastEnemyDeathX = 0;
    this.lastEnemyDeathY = 0;

    this.showMessage(`第 ${this.stage} 關`);
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

    for (const bullet of this.bullets) {
      bullet.update(dt, this.map);
    }

    this.checkBulletHits();

    // 移除前先記下死掉敵人的位置，道具要掉在這裡 (remember where enemies died)
    for (const enemy of this.enemies) {
      if (enemy.isDead()) {
        this.lastEnemyDeathX = enemy.x;
        this.lastEnemyDeathY = enemy.y;
      }
    }

    // 清除死掉的子彈和敵人 (remove dead bullets and enemies)
    this.bullets = this.bullets.filter((bullet) => bullet.alive);
    this.enemies = this.enemies.filter((enemy) => !enemy.isDead());

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

    // ----- 撿起道具 → 套用效果，開啟出口 (pick up item: apply it and open the exit) -----
    if (this.item !== null && circlesOverlap(this.player, this.item)) {
      applyItem(this.item.type, this.player);
      this.showMessage(this.item.getPickupText());
      this.item = null;
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

  /**
   * 檢查子彈有沒有打中角色 (check bullet hits)
   * 玩家的子彈只打敵人，敵人的子彈只打玩家，不會打到自己人。
   */
  checkBulletHits() {
    for (const bullet of this.bullets) {
      if (!bullet.alive) continue;

      if (bullet.owner === 'player') {
        for (const enemy of this.enemies) {
          if (circlesOverlap(bullet, enemy)) {
            enemy.takeDamage(bullet.damage);
            bullet.alive = false;
            break; // 一顆子彈只打中一個敵人 (one bullet, one hit)
          }
        }
      } else if (circlesOverlap(bullet, this.player)) {
        this.player.takeDamage(bullet.damage);
        bullet.alive = false;
      }
    }
  }

  // ===== 繪製 (drawing) =====

  /**
   * 畫出地圖、子彈、角色，以及提示文字或死亡畫面 (draw everything)
   * @param {CanvasRenderingContext2D} ctx 畫筆
   */
  draw(ctx) {
    this.map.draw(ctx);

    if (this.item !== null) {
      this.item.draw(ctx);
    }

    for (const bullet of this.bullets) {
      bullet.draw(ctx);
    }
    for (const enemy of this.enemies) {
      enemy.draw(ctx);
    }
    this.player.draw(ctx);

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
