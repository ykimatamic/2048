# 2048

AI オートプレイ付き 2048 パズル。Undo・ヒント・難易度選択・盤面サイズ切替・ダークモード・PWA(オフライン再生)対応。

## 開発

```bash
npm install
npm run dev       # 開発サーバー
npm run check     # 型チェック + lint + テスト(低速なベンチ系テストは除外)
npm run test      # 全テスト(ベンチ含む・数分かかる)
npm run build     # 本番ビルド(dist/ + Service Worker)
npm run preview   # ビルド結果のローカル確認(PWA 動作確認用)
```

## 操作

| 入力 | 動作 |
| --- | --- |
| 矢印キー / WASD / スワイプ | タイル移動 |
| Z / Backspace | Undo(最大 32 手) |
| H | ヒント |
| ? | ヘルプ & 統計モーダル(Esc で閉じる) |

- **Auto**: AI が自動でプレイ。Speed スライダーで手間隔を調整
- **Easy / Normal / Hard**: AI 探索深さの難易度(Hard は最悪でも約 300ms、Worker 内で処理)
- **3x3 / 4x4 / 5x5**: 盤面サイズ切替(新規ゲーム開始)
- 効果音 On/Off・ダークモード切替・難易度・統計は localStorage に永続化

## アーキテクチャ

```
src/
├── components/    # Game(画面)、Board、Score、Modal、HelpModal、ErrorBoundary
├── hooks/         # useGame(合成)、useAutoPlayer、useKeyboardControls、useSwipe、
│                  # useHistory(Undo)、usePersistence(保存/復元)、useStats(統計)
├── game/
│   ├── ai.ts         # 4x4: bitboard LUT + 反復深化 expectimax(Web Worker で実行)
│   ├── aiSimple.ts   # 3x3/5x5: 配列ベース expectimax へ自動フォールバック
│   ├── bitboard.ts   # 行単位 LUT エンジン
│   ├── game.ts       # ルール(processMove / canMove ...)
│   ├── move.ts       # 盤面スライド&マージ(サイズ非依存)
│   ├── trace.ts      # タイル移動トレース(アニメーション用)
│   └── sounds.ts     # Web Audio 合成効果音(アセット無し)
└── styles/game.css  # CSS 変数による light/dark テーマ
```

- AI は Web Worker(`ai.worker.ts` + `aiClient.ts`)で実行され UI をブロックしない。
  Worker 障害時は同期計算へフォールバック
- 盤面はタイル ID + CSS transform でアニメーション(trace.ts)
- PWA: vite-plugin-pwa(generateSW / autoUpdate)。マスカブルアイコン対応

## テスト

- `src/__tests__/`: ルール・bitboard・trace・AI 品質・コンポーネント結合テスト
- `ai-regression.test.ts`(4x4 自己対戦)と `ai-simple-quality.test.ts`(5x5)は
  実行に時間がかかるため `npm run check` では除外される
