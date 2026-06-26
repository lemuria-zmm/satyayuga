import type { LocationId } from '../types';

export interface LocationContent {
  id: LocationId;
  name: string;
  summary: string;
}

export const LOCATIONS: Record<LocationId, LocationContent> = {
  hall: {
    id: 'hall',
    name: '院堂',
    summary: '丹青院日常主厅，适合修习、听训和请教导师。',
  },
  library: {
    id: 'library',
    name: '书房',
    summary: '查阅画论、旧批注和画卷档案的地方。',
  },
  garden: {
    id: 'garden',
    name: '后花园',
    summary: '休息与低压对话场景，水池尽头常有风吹过。',
  },
  market: {
    id: 'market',
    name: '京城街市',
    summary: '摊贩、行人、桥巷与药铺聚集，民生线索藏在热闹里。',
  },
  dining_hall: {
    id: 'dining_hall',
    name: '食堂',
    summary: '画院膳堂，午间院内供应免费，长桌相对最易听见院中闲话。',
  },
  dormitory: {
    id: 'dormitory',
    name: '宿舍',
    summary: '学子歇宿之所。一床一案一盏灯，养精蓄锐处。',
  },
  secret_archive: {
    id: 'secret_archive',
    name: '秘阁',
    summary: '丹青院禁地，封存特殊画卷。需晋升画正后进入。',
  },
  ximeng_studio: {
    id: 'ximeng_studio',
    name: '希孟画室',
    summary: '希孟独处作画之所，MVP 末尾才露出一角。',
  },
};

