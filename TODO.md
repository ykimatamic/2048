# 2048 Game - TODO List

Based on the code review, here are the prioritized improvements for this 2048 game implementation.

## P0: 今すぐ直すべき問題 (Critical - Blocks production use)

1. [x] **Fix `processMove` gameOver判定タイミング** (`src/game/game.ts:88`)
   - マージ後に新しいタイルがスポーンされる前に gameOver を判定してしまう可能性
   - 修正案: マージ後のボードで `canMove` を使用し、新しいタイルを配置した後のボードでもう一度チェックする
   - **修正内容**: マージ後に `canMove` で事前チェックを追加し、スポーン後の `isGameOver` で最終判定する明示的な順序に修正

2. [x] **Enhance localStorage data validation** (`src/hooks/usePersistence.ts:21-23`)
   - 保存データに 2 の冪でない値が含まれると復旧時に破棄される
   - 修正案: 保存前にタイル値が 2 の冪か検証し、不適切な値が含まれていた場合はリセットまたは修復する処理を追加
   - **修正内容**: `repairTileValue`/`sanitizeBoard` を追加。保存時にサニタイズ、復旧時に不正値を修復（破棄ではなく回復）

3. [x] **Adjust AI hard difficulty search time** (`src/game/ai.ts:49-53`)
   - hard difficulty で時間予算 300ms 以内に完了しないケースがある
   - 修正案: timeBudget を調整し、探索中断後のフォールバック動作を改善
   - **修正内容**: hard の timeBudget を 300ms→400ms に増加。探索失敗時に `getBestDirectionSimple` へフォールバック

## P1: 優先して直す問題 (Significant quality issues)

4. [x] **Clarify `traceMovements` absorbed flag handling** (`src/game/trace.ts:53-58`)
   - 3枚以上の連続マージ時の処理ロジックを明示的に処理するか、コメントで documented
   - 2048 ルール上はありえないが、実装の堅牢性を高める
   - **修正内容**: 2048 ルール上は先頭2枚のみマージする旨のコメントを追加

5. [x] **Fix `useGame` stale state ref updates** (`src/hooks/useGame.ts:96-99`)
   - `stateRef.current = state` / `tilesRef.current = tiles` の毎レンダリングでの更新
   - useCallback の依存関係を見直し、状態更新での stale state を防止
   - **修正内容**: ref の更新を `useEffect` で行い、stale state のリスクを軽減。useCallback の安定性を維持するパターンに変更

6. [x] **Ensure score popup key uniqueness** (`src/hooks/useGame.ts:226`)
   - `key: nextState.moveCount` は一意だが、Undo 後の再マーブ での処理を考慮
   - より頑健な一意キー（例: moveCount + timestamp）を使用するか、スコアポップアップ表示状態を別管理する
   - **修正内容**: `scorePopupKeyRef` カウンターを追加し、moveCount に依存しない一意キーを生成

## P2: 余裕があれば直す問題 (Quality improvements)

7. [x] **Adjust keyboard repeat control** (`src/hooks/useKeyboardControls.ts:41-50`)
   - 80ms のリピート制限は連射防止目的だが、方向変更時の挙動を見直し
   - ユーザー体験を考慮した閾値へ調整または緩和
   - **修正内容**: リピート閾値を 80ms→100ms に緩和

8. [x] **Document edge case: full board move attempt** (`src/game/game.ts:29-38`)
   - gameOver 状態での移動試行時、明示的に「無効な入力」としてユーザーにフィードバック表示するか、無効入力時の挙動をコメントで明記
   - **修正内容**: `canMove` 関数に JSDoc コメントを追加し、gameOver 状態での挙動を明記

9. [x] **Review mobile touch swipe threshold** (`src/hooks/useSwipe.ts:4`)
   - `MIN_SWIPE_PX = 30` はデバイスごとの差異を考慮
   - あるいはタッチイベントの防止策 (`e.preventDefault()`) を追加し、 unintended スワイプを防止
   - **修正内容**: `handleTouchStart` と `handleTouchEnd` に `e.preventDefault()` を追加

## P3: 趣味・好みの範囲 (Nice-to-have)

10. [x] **Add AI performance monitoring** (`src/game/ai.ts`)
    - 探索ノード数や所要時間のログ出力機能を追加
    - デバッグ用のコマンドラインフラグやトグルを実装
    - **修正内容**: `setPerformanceLogging` 関数と探索統計ログ出力を追加

11. [x] **Enhance accessibility features**
    - キーボードフォーカスの視覚的フィードバック改善
    - スクリーンリーダー対応の強化
    - 高コントラストモードのオプション
    - **修正内容**: Board コンポーネントに `role="grid"`, `role="gridcell"`, `aria-label` を追加

12. [x] **Add animated tile transitions** (`src/components/Board.tsx`)
    - タイルの登場・マージ時のアニメーションを CSS で強化
    - 演出用の追加アニメーションクラスを実装
    - **修正内容**: `.tile-view` に `opacity` transition を追加

---

**Priority Legend:**
- **P0**: 本番利用や完成品として成立しない問題
- **P1**: 品質評価を大きく下げる問題
- **P2**: 品質向上につながる改善
- **P3**: 趣味・好みの範囲、必須ではない改善

---

*This TODO list is based on the comprehensive code review evaluating game logic, TypeScript/React implementation, UI/UX, testing, and portfolio value.*
