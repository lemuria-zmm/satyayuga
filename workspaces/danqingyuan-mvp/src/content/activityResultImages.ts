/**
 * 午餐 + 市集夜娱 → 弹窗场景图（2026-07-09 明明拍板）。
 * 这些食物/活动图约 1:1，不宜作背景，改中心弹窗与体力/心情增减一同弹出。
 * 命中此表的 activityId 走 ActivityResultPopup，不飘右下文字结算笺。
 */
export const ACTIVITY_POPUP_IMAGE: Record<string, string> = {
  // 午膳（膳堂 + 蜜煎点茶）
  meal_together: '/bg-dining-stove.png', // 与同僚共膳（明明指定用灶间那张）
  meal_mantou: '/scene-dining-guanjiang.png', // 灌浆馒头
  meal_botuo: '/scene-botuo.png', // 馎饦汤面
  meal_mijian: '/scene-dining-mijian-diancha.png', // 蜜煎果子配点茶
  meal_chuibing: '/bg-dining-chuibing.png', // 炊饼配豆羹
  // 市集夜娱
  eve_cuju: '/scene-market-cuju-night.png', // 蹴鞠
  eve_touhu: '/scene-market-touhu-night.png', // 投壶
  eve_weiqi: '/scene-market-weiqi-night.png', // 弈棋
  eve_tingqu: '/scene-washe-theater-night.png', // 瓦舍听曲
};

export function activityPopupImage(activityId: string | undefined): string | undefined {
  if (!activityId) return undefined;
  return ACTIVITY_POPUP_IMAGE[activityId];
}
