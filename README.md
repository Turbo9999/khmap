# 高雄政見方塊地圖（khmap）

非官方整理。用方塊風格的立體高雄地圖瀏覽賴瑞隆在 38 區提出的政見：點一區看政見，點地標看介紹，點小人聽他說一條在地政見。手機與電腦都能用。

> 本站非賴瑞隆競選團隊製作。政見摘要為自行改寫，每條附官網或新聞來源；地形高度與地標位置只是示意。

## 結構

```
index.html          地圖主頁
admin.html          管理頁（登入後新增／編輯／刪除政見）
config.js           Supabase 設定（留空＝讀 data/seed.json 的唯讀模式）
css/style.css
js/app.js           場景、介面、互動
js/world.js         方塊地形（著色器畫草地、水泥、泥土、方塊格線）
js/landmarks.js     38 區地標方塊模型
js/people.js        有臉的方塊小人
js/data.js          資料讀取（Supabase 或 seed.json）
js/admin.js         管理頁
data/terrain.js     地形網格（由 tools/build_terrain.py 產生）
data/seed.json      初始政見資料（由 tools/build_seed.py 產生）
supabase/schema.sql 資料表與權限
tools/              產生地形與初始資料的腳本
```

純靜態網站，不需要 build。

## 上線步驟

1. **Supabase**：建立專案 → SQL Editor 執行 `supabase/schema.sql`，最後一行改成你的 email 並執行。
   Authentication → Users → Add user，用同一個 email 設密碼。
2. **config.js**：填入 Project URL 與 anon key（Project Settings → API），commit 推上 GitHub。
3. **Cloudflare Pages**：Workers & Pages → Create → Pages → Connect to Git → 選 `khmap`。
   Framework preset 選 None，Build command 留空，Build output directory 填 `/`。
4. 打開 `你的網址/admin.html` 登入，按「匯入初始資料」把 `data/seed.json` 寫進資料庫。之後就在管理頁新增或修改。

每條政見可以選：
- **直接顯示內容**：標題與內容完整出現在地圖面板上，下方附來源。
- **標題＋新聞連結**：面板只顯示標題與一句摘要，按鈕連到原始新聞。

## 資料來源

- 行政區界：g0v/twgeojson（內政部鄉鎮界），簡化並投影；那瑪夏由舊「三民鄉」拆出。
- 政見：賴瑞隆競選官網 zenolai.tw 與各家新聞報導（每條資料都有來源連結）。

## 重新產生資料

```
python3 tools/build_terrain.py   # 改地形高度或網格大小
python3 tools/build_seed.py      # 改初始政見
```

Powered by Turbo Labs
