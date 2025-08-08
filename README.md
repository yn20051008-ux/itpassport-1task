# ITパスポート 過去問トレーナー（PWA）

- 選択肢は **ア/イ/ウ/エ** 方式
- **1キー/1タップで即判定 → 自動で次の問題**（Enter不要）
- iPhoneのホーム画面に追加してアプリのように使えます

## 使い方
1. `data/questions.json` を差し替えて公開
   - 付属の「CSV/JSON 取込」ボタンからCSVを貼り付け→JSON化→ダウンロード可能
   - CSVヘッダ：`year,session,q_no,stem,ア,イ,ウ,エ,answer_kana,answer_abcd`
2. 任意で `manifest.json` と `icons/` を変更（アプリアイコンなど）
3. 任意で `sw.js` のキャッシュリストに追加ファイルを記述

## デプロイ
- そのまま **Vercel / Netlify / GitHub Pages** にアップロード可

## 注意
- 問題文は **要約** を推奨。出典の明記も検討してください。
