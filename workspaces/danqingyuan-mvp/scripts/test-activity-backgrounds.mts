/**
 * 临时 node 单测：场景图池接入（2026-07-09）——书房 desk/shelf 昼夜分流、茶室天气变体、
 * 后花园听琴四态、午餐/夜娱弹窗图映射，并核每个引用的图文件真在 public/（防拼写漂移）。
 * 运行：<cached-tsx>/tsx scripts/test-activity-backgrounds.mts
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { activityBackground, sceneActivityBackgrounds } from '../src/content/activityBackgrounds';
import { ACTIVITY_POPUP_IMAGE, activityPopupImage } from '../src/content/activityResultImages';

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const fileExists = (p: string) => existsSync(join(PUBLIC, p.replace(/^\//, '')));

let pass = 0, fail = 0;
function check(name: string, cond: boolean) { if (cond) pass++; else { fail++; console.error(`  ✗ ${name}`); } }

// 1. 书房 desk/shelf 昼夜分流（#2）
check('研读画论 白天→desk-day', activityBackground('practice_read_treatise', 'forenoon', false) === '/bg-library-desk-day.png');
check('研读画论 晚间→desk-night', activityBackground('practice_read_treatise', 'evening', false) === '/bg-library-desk-night.png');
check('阅古画卷 白天→desk-day', activityBackground('practice_view_scrolls', 'afternoon', false) === '/bg-library-desk-day.png');
check('钻研旧档 白天→shelf-day', activityBackground('practice_deep_study', 'forenoon', false) === '/bg-library-shelf-day.png');
check('钻研旧档 晚间→shelf-night', activityBackground('practice_deep_study', 'evening', false) === '/bg-library-shelf-night.png');
check('钻研旧档 雨天→shelf-rainy', activityBackground('practice_deep_study', 'afternoon', true) === '/bg-library-shelf-rainy.png');
check('查证 白天→shelf-day', activityBackground('library_research', 'forenoon', false) === '/bg-library-shelf-day.png');

// 2. 茶室天气变体（#4）
check('茶室 白天→teahouse-day', activityBackground('teahouse', 'noon', false) === '/bg-market-teahouse-day.png');
check('茶室 雨天→teahouse-rainy', activityBackground('teahouse', 'noon', true) === '/bg-market-teahouse-rainy.png');

// 3. 后花园听琴四态（#8）
check('听琴 白天→afternoon', activityBackground('eve_tingqin', 'afternoon', false) === '/bg-garden-listening-to-qin-afternoon.png');
check('听琴 晚间→night', activityBackground('eve_tingqin', 'evening', false) === '/bg-garden-listening-to-qin-night.png');
check('听琴 雨日→rainy', activityBackground('eve_tingqin', 'noon', true) === '/bg-garden-listening-to-qin-rainy.png');
check('听琴 雨夜→rainy-night', activityBackground('eve_tingqin', 'evening', true) === '/bg-garden-listening-to-qin-rainy-night.png');

// 4. 后花园竹石雨夜（#8）
check('观竹石 雨夜→bamboo-rainy-night', activityBackground('practice_garden_observe', 'evening', true) === '/bg-garden-bamboo-rainy-night.png');

// 5. 弹窗图映射齐全（#5 #6）——9 签命中，非弹窗签为 undefined
check('共膳→stove', activityPopupImage('meal_together') === '/bg-dining-stove.png');
check('馎饦→scene-botuo', activityPopupImage('meal_botuo') === '/scene-botuo.png');
check('灌浆馒头→guanjiang', activityPopupImage('meal_mantou') === '/scene-dining-guanjiang.png');
check('蹴鞠→cuju-night', activityPopupImage('eve_cuju') === '/scene-market-cuju-night.png');
check('瓦舍→washe-theater-night', activityPopupImage('eve_tingqu') === '/scene-washe-theater-night.png');
check('街边吃食 不入弹窗', activityPopupImage('meal_street') === undefined);
check('夜市闲逛 不入弹窗', activityPopupImage('eve_nightmarket') === undefined);
check('弹窗签共 9 个', Object.keys(ACTIVITY_POPUP_IMAGE).length === 9);

// 6. 所有引用图文件真在 public/（防拼写漂移）
{
  const refIds = [
    'practice_garden_observe', 'eve_tingqin', 'practice_market_figure', 'market_sketch',
    'meal_street', 'practice_market_architecture', 'eve_nightmarket', 'teahouse',
    'practice_read_treatise', 'practice_view_scrolls', 'practice_deep_study',
    'library_research', 'library_deep_research', 'meal_chuibing', 'meal_mantou', 'meal_botuo',
  ];
  const slots = ['forenoon', 'noon', 'afternoon', 'evening'] as const;
  let missing: string[] = [];
  for (const id of refIds) {
    for (const slot of slots) {
      for (const rainy of [false, true]) {
        const p = activityBackground(id, slot, rainy);
        if (p && !fileExists(p)) missing.push(`${id}/${slot}/${rainy}=${p}`);
      }
    }
  }
  for (const p of Object.values(sceneActivityBackgrounds)) if (!fileExists(p)) missing.push(p);
  for (const p of Object.values(ACTIVITY_POPUP_IMAGE)) if (!fileExists(p)) missing.push(p);
  if (missing.length) console.error('  缺失图:', [...new Set(missing)].join('\n    '));
  check('引用图全部存在 public/', missing.length === 0);
}

console.log(`\n场景图池接入测试：${pass} 通过 / ${fail} 失败`);
process.exit(fail ? 1 : 0);
