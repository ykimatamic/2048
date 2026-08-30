/** スコア等の数値を桁区切り表示に整形 */
export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}
