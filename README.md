# ROGUE SHOOTER

資管系三年級 C 班「網路程式設計」期末專題：一款 2D 俯視角、單機 roguelike 射擊遊戲，電腦和手機瀏覽器都能玩。

## 立即遊玩

**https://yangxun95.github.io/webgameproject/**

手機請**轉成橫向**遊玩。

## 遊戲規則

- 每一關會隨機生成地圖，打倒所有敵人 → 撿起掉落的道具 → 走進出口，進入下一關。
- **每 5 關會出現 BOSS**，打倒後掉落新武器，從手槍一路升級到加特林，共 8 把。
- 關卡無限，敵人會越來越多、越來越強。
- **死亡就從第 1 關重來**，最高紀錄會保存在瀏覽器裡。

## 操作方式

| 動作 | 電腦 | 手機（橫向） |
|---|---|---|
| 移動 | WASD | 左半邊虛擬搖桿 |
| 瞄準與射擊 | 滑鼠瞄準、按住左鍵 | 右半邊虛擬搖桿，推動就會射擊 |
| 換彈 | R | 右下「換彈」按鈕 |
| 切換武器 | 1~8 或滑鼠滾輪 | 右下「換槍」按鈕，或點左下武器欄 |
| 開始 / 重來 | Enter 或點擊畫面 | 點擊畫面 |
| 回主選單 | Esc（死亡畫面） | — |

## 在自己電腦上執行

遊戲使用 ES Modules，**不能直接雙擊 `index.html` 開啟**，需要透過本機伺服器：

```bash
python -m http.server 8000
```

然後用瀏覽器打開 `http://localhost:8000`。也可以用 VS Code 的 **Live Server** 擴充功能，對 `index.html` 按右鍵選 **Open with Live Server**。

## 技術

- 原生 JavaScript（ES Modules）+ HTML5 Canvas 2D，沒有使用任何框架、遊戲引擎或建置工具。
- 部署在 GitHub Pages（純靜態網站）。

## 專案文件

- [`AGENTS.md`](AGENTS.md)：完整的遊戲規格、程式架構與開發規則。
- [`ART_GUIDE.md`](ART_GUIDE.md)：美術圖片的規格與交付流程。
