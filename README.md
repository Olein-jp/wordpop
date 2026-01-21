# WordPop

子ども向けの英単語学習アプリです。ユーザーを切り替えて、単元を選び、4択学習または筆記学習で反復できます。

GitHub Pages: https://olein-jp.github.io/wordpop/

## 概要
- ユーザー管理（ローカル保存）
- 単元選択（複数選択可）
- 出題モード（英→日 / 日→英）
- 学習モード（4択 / 筆記学習）
- 読み上げ（英→日のみ、Web Speech API）
- 学習終了時の正解率表示

## データ構造
- `public/data/index.json` に単元一覧を定義
- `public/data/units/*.json` に単元データを配置

## 使い方（ローカル）
```bash
npm install
npm run dev
```

## ビルド / デプロイ
GitHub Actions で静的書き出し（`next export` 相当）を行い、GitHub Pages にデプロイします。

```bash
npm run build
```

## 注意点
- `localStorage` を利用するため、端末・ブラウザごとに学習履歴が分かれます。
- GitHub Pages のため `basePath` を設定しています。
