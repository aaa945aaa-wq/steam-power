export const TAXONOMY_VERSION=3;
export const FEATURE_LABELS={build:'技能／裝備建構',strategy:'策略決策',cards:'牌組建構',loot:'裝備掉落',random:'隨機機制',manage:'資源與建設管理',grind:'重複養成',social:'多人互動',story:'故事敘事',explore:'探索',tuning:'車輛調校',driving:'駕駛',matchmaking:'線上配對',endgame:'終局進程',action:'即時操作',turn:'回合決策',runs:'單局進程',persistent:'長期進程'};
export const GENRES={action:'動作',rpg:'角色扮演',strategy:'策略',cards:'卡牌',management:'模擬經營',racing:'競速',puzzle:'解謎'};
// Data-driven eligibility, independent of ranking effects. No difficulty verdicts are inferred from genres.
export const DEFINITIONS={
 pace:{group:'common',ratings:['neutral','regret'],label:'步調與操作風格不合'},
 paceGood:{group:'common',ratings:['like','neutral'],label:'遊戲步調舒服'},
 style:{group:'common',ratings:['like','neutral'],label:'喜歡美術與世界'},
 styleBad:{group:'common',ratings:['regret','neutral'],label:'題材或呈現風格不合'},
 technical:{group:'common',ratings:['regret','neutral'],label:'效能、錯誤或穩定性影響體驗'},
 other:{group:'common',ratings:['like','neutral','regret'],label:'其他／說不上來'},
 build:{group:'specific',ratings:['like','neutral'],any:['build','cards','tuning'],label:'喜歡研究搭配',variants:[['tuning','車輛調校值得研究'],['cards','組牌與卡牌搭配有趣'],['build','技能與裝備搭配有趣']]},
 strategy:{group:'specific',ratings:['like','neutral'],any:['strategy'],label:'策略選擇有趣'},
 randomGood:{group:'specific',ratings:['like','neutral'],any:['random'],label:'隨機變化有樂趣'},
 randomBad:{group:'specific',ratings:['regret','neutral'],any:['random'],label:'運氣不好時難以靠決策補救'},
 story:{group:'specific',ratings:['like','neutral'],any:['story'],label:'故事吸引我'},
 social:{group:'specific',ratings:['like','neutral'],any:['social'],label:'與朋友玩很開心'},
 actionGood:{group:'specific',ratings:['like','neutral'],any:['action','driving'],label:'享受即時操作',variants:[['driving','駕駛操控手感舒服']]},
 actionBad:{group:'specific',ratings:['regret','neutral'],any:['action','driving'],label:'太依賴即時反應',variants:[['driving','駕駛操作與反應負擔太高']]},
 complexBad:{group:'specific',ratings:['regret','neutral'],any:['build','cards','tuning','manage'],label:'配置或管理系統難以理解',variants:[['tuning','車輛調校難以理解'],['cards','難以理解有效組牌方式'],['build','技能與裝備搭配難以理解'],['manage','資源與管理系統難以理解']]},
 combo:{group:'specific',ratings:['regret','neutral'],all:['action'],any:['build','manage'],label:'研究配置時還要即時反應，負擔太高'},
 grindBad:{group:'specific',ratings:['regret','neutral'],any:['grind'],label:'重複養成讓人疲乏'},
 endgameBad:{group:'specific',ratings:['regret','neutral'],any:['endgame'],label:'終局內容缺乏變化'},
 manageBad:{group:'specific',ratings:['regret','neutral'],any:['manage'],label:'建設經營玩法不合胃口'},
 adminBad:{group:'specific',ratings:['regret','neutral'],any:['manage'],label:'管理工作太瑣碎'},
 tuningVariety:{group:'specific',ratings:['regret','neutral'],any:['tuning'],label:'可用的調校選擇太少'},
 drivingBad:{group:'specific',ratings:['regret','neutral'],any:['driving'],label:'駕駛操控手感不合'},
 matchingBad:{group:'specific',ratings:['regret','neutral'],any:['matchmaking'],label:'配對對手實力差距過大'}
};
export function traits(game){if(!game)return [];if(game.facets)return [...new Set([...game.facets.mechanics,...game.facets.conditions])];return game.tags||[];}
export function applies(key,game,rating){const d=DEFINITIONS[key];if(!d||!d.ratings.includes(rating))return false;const ts=traits(game);return (!d.any||d.any.some(t=>ts.includes(t)))&&(!d.all||d.all.every(t=>ts.includes(t)))&&(!d.exclude||!d.exclude.some(t=>ts.includes(t)));}
export function reasonText(key,game){const d=DEFINITIONS[key];const ts=traits(game);return d?.variants?.find(([t])=>ts.includes(t))?.[1]||d?.label||key;}
export function reasonOptions(game,rating){return Object.keys(DEFINITIONS).filter(k=>applies(k,game,rating)&&!(k==='pace'&&rating==='like'));}

export const MODULES=[
 {id:'operation',label:'操作與節奏',description:'反應、手感與遊玩步調',keys:['actionGood','actionBad','drivingBad','paceGood','pace','combo']},
 {id:'configuration',label:'搭配與理解',description:'配置、研究與有效選擇',keys:['build','complexBad','tuningVariety']},
 {id:'decision',label:'策略與運氣',description:'決策空間與隨機局面',keys:['strategy','randomGood','randomBad']},
 {id:'progression',label:'養成與重複',description:'長期投入與後期變化',keys:['grindBad','endgameBad']},
 {id:'management',label:'資源與管理',description:'建設、分配與管理負擔',keys:['manageBad','adminBad']},
 {id:'presentation',label:'故事與風格',description:'敘事、美術與世界',keys:['story','style','styleBad']},
 {id:'social',label:'合作與競技',description:'朋友、對抗與配對',keys:['social','matchingBad']},
 {id:'other',label:'技術與其他',description:'效能、錯誤或其他感受',keys:['technical','other']}
];
export function moduleOptions(game,rating){return MODULES.map(m=>({...m,keys:m.keys.filter(k=>DEFINITIONS[k].ratings.includes(rating)),suggested:m.keys.some(k=>applies(k,game,rating))})).filter(m=>m.keys.length).sort((a,b)=>Number(b.suggested)-Number(a.suggested));}
