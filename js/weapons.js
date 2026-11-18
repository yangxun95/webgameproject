import { WEAPONS } from './config.js';

/**
 * 一把槍的理論 DPS（每秒傷害）= 每發傷害 × 彈丸數 ÷ 開槍間隔 (theoretical damage per second)
 * 例如手槍 10 × 1 ÷ 0.3 ≈ 33。用來決定敵人血量上限。
 * @param {object} def WEAPONS 裡的一筆規格
 * @returns {number}
 */
export function getWeaponDps(def) {
  return (def.damage * def.pellets) / def.fireInterval;
}

// 一把玩家持有的槍 (a weapon the player owns)
// 武器的「規格」（傷害、射速…）放在 config.js 的 WEAPONS 資料表，這裡用 this.def 指向它；
// 這把槍「自己的狀態」（彈匣剩幾發、是不是在換彈）才存在這個物件裡。
export class Weapon {
  /**
   * 建立武器 (create weapon)
   * @param {number} index 在 WEAPONS 資料表中的位置，0 = 手槍 (index in WEAPONS)
   */
  constructor(index) {
    this.index = index;
    this.def = WEAPONS[index];            // 規格 (definition / stats)

    this.ammoInMag = this.def.magazineSize; // 彈匣裡剩幾發 (rounds in magazine)
    this.reserveAmmo = this.def.startReserve; // 備彈 (reserve ammo)

    this.fireCooldown = 0;     // 還要等幾秒才能再開槍 (seconds until next shot)
    this.reloadTimer = 0;      // 換彈還剩幾秒，> 0 代表換彈中 (reload time left)
    this.reloadDuration = 0;   // 這次換彈總共要幾秒，畫進度條用 (total reload time)
    this.spinTimer = 0;        // 加特林已經空轉幾秒 (spin-up progress)
  }

  // ===== 狀態查詢 (queries) =====

  /**
   * 是否正在換彈 (is reloading)
   * @returns {boolean}
   */
  isReloading() {
    return this.reloadTimer > 0;
  }

  /**
   * 現在能不能開槍：沒在換彈、彈匣有子彈、冷卻結束、空轉完成 (can fire now)
   * @returns {boolean}
   */
  canFire() {
    return (
      !this.isReloading() &&
      this.ammoInMag > 0 &&
      this.fireCooldown === 0 &&
      this.spinTimer >= this.def.spinUpTime
    );
  }

  /**
   * 還有沒有子彈可以換：備彈無限，或備彈 > 0 (has ammo left to reload)
   * @returns {boolean}
   */
  hasReserveAmmo() {
    return this.def.infiniteReserve || this.reserveAmmo > 0;
  }

  // ===== 每幀更新 (update) =====

  /**
   * 計時器倒數：開槍冷卻、換彈、空轉 (update timers)
   * @param {number} dt 經過秒數
   * @param {boolean} triggerHeld 是否按著扳機，空轉用 (is the trigger held)
   */
  update(dt, triggerHeld) {
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);

    // 換彈計時：倒數到 0 的那一刻才真的把子彈裝進彈匣 (reload finishes when timer hits 0)
    if (this.reloadTimer > 0) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.reloadTimer = 0;
        this.finishReload();
      }
    }

    // 空轉：按著扳機就累積，一放開就歸零 (spin up while trigger is held)
    if (this.def.spinUpTime > 0) {
      if (triggerHeld && !this.isReloading()) {
        this.spinTimer = Math.min(this.def.spinUpTime, this.spinTimer + dt);
      } else {
        this.spinTimer = 0;
      }
    }
  }

  // ===== 開槍與換彈 (firing & reloading) =====

  /**
   * 開一槍：扣一發子彈、開始冷卻，回傳每顆彈丸的飛行角度 (fire once, return pellet angles)
   * 一般槍回傳 1 個角度（加上隨機散布）；霰彈槍回傳多個角度，平均排成扇形。
   * @param {number} aimAngle 瞄準角度
   * @returns {number[]} 每顆彈丸的角度
   */
  fire(aimAngle) {
    this.ammoInMag--;
    this.fireCooldown = this.def.fireInterval;

    const angles = [];
    const spread = this.def.spread;

    if (this.def.pellets === 1) {
      // 單發：在 ±spread 之間隨機偏移 (single bullet with random spread)
      angles.push(aimAngle + (Math.random() * 2 - 1) * spread);
    } else {
      // 多發：從 -spread 到 +spread 平均分配 (pellets evenly fanned out)
      const step = (spread * 2) / (this.def.pellets - 1);
      for (let i = 0; i < this.def.pellets; i++) {
        angles.push(aimAngle - spread + step * i);
      }
    }
    return angles;
  }

  /**
   * 開始換彈；彈匣已滿、已在換彈、或沒有備彈就不換 (start reloading)
   * @param {number} speedMultiplier 換彈速度倍率，快手套會讓它 > 1 (reload speed multiplier)
   */
  startReload(speedMultiplier) {
    if (this.isReloading()) return;
    if (this.ammoInMag === this.def.magazineSize) return;
    if (!this.hasReserveAmmo()) return;

    // 倍率越大越快：時間 = 原本時間 ÷ 倍率 (higher multiplier = faster)
    this.reloadDuration = this.def.reloadTime / speedMultiplier;
    this.reloadTimer = this.reloadDuration;
  }

  /**
   * 換彈完成：從備彈補滿彈匣 (reload done: fill magazine from reserve)
   */
  finishReload() {
    const needed = this.def.magazineSize - this.ammoInMag;

    if (this.def.infiniteReserve) {
      this.ammoInMag = this.def.magazineSize;
    } else {
      // 備彈不夠的話，有多少補多少 (take as much as the reserve allows)
      const taken = Math.min(needed, this.reserveAmmo);
      this.ammoInMag += taken;
      this.reserveAmmo -= taken;
    }
  }

  /**
   * 切換到別把槍時取消換彈、停止空轉 (cancel reload when switching away)
   */
  cancelReload() {
    this.reloadTimer = 0;
    this.spinTimer = 0;
  }

  /**
   * 補充備彈，不超過上限 (add reserve ammo, capped)
   * @param {number} amount 補充量
   */
  addReserveAmmo(amount) {
    if (this.def.infiniteReserve) return;
    this.reserveAmmo = Math.min(this.def.maxReserve, this.reserveAmmo + amount);
  }

  /**
   * 補滿彈匣和備彈，重複撿到同一把槍時使用 (refill everything)
   */
  refillAll() {
    this.ammoInMag = this.def.magazineSize;
    this.reserveAmmo = this.def.maxReserve;
  }
}
