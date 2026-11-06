import {FEATURE_LABELS,GENRES} from './taxonomy.js';
import {PRESENTATION} from './attraction.js';

const CONDITIONS=new Set(['action','turn','runs','persistent','matchmaking']);
const DAY=86400000;
const validList=(xs,dict)=>Array.isArray(xs)?[...new Set(xs.filter(x=>typeof x==='string'&&Object.hasOwn(dict,x)))]:null;
export function splitFeatures(keys){
 const known=validList(keys,FEATURE_LABELS)||[];
 return {mechanics:known.filter(k=>!CONDITIONS.has(k)),conditions:known.filter(k=>CONDITIONS.has(k))};
}

// Shared by browser and server: replace supplied facets, retain absent facets.
// No permanent unions: a newer classification must be able to remove old errors.
export function mergeCatalog(base,extra=[],now=Date.now()){
 const entries=new Map(base.map(g=>[g.appid,g]));
 for(const g of extra){
  if(!g||!Number.isSafeInteger(g.appid)||g.appid<=0||typeof g.name!=='string'||!g.facets||typeof g.facets!=='object')continue;
  if(g.stale&&(!Number.isFinite(g.checkedAt)||g.checkedAt>now||g.checkedAt+DAY<=now))continue;
  if(g.featureStatus==='steam-tags'&&(!Number.isFinite(g.checkedAt)||g.checkedAt>now||g.checkedAt+7*DAY<=now))continue;
  const old=entries.get(g.appid);
  if(Number.isFinite(old?.checkedAt)&&(!Number.isFinite(g.checkedAt)||g.checkedAt<old.checkedAt))continue;
  const facets={genres:old?.facets?.genres||[],mechanics:old?.facets?.mechanics||[],conditions:old?.facets?.conditions||[],presentation:old?.facets?.presentation||[]};
  const mechanics=validList(g.facets.mechanics,FEATURE_LABELS);
  const conditions=validList(g.facets.conditions,FEATURE_LABELS);
  if(mechanics!==null){
   const split=splitFeatures(mechanics);
   facets.mechanics=split.mechanics;
   // Normalize legacy cached tags that kept conditions in mechanics.
   if(conditions!==null||split.conditions.length)facets.conditions=[...new Set([...split.conditions,...(conditions||[]).filter(k=>CONDITIONS.has(k))])];
  }else if(conditions!==null)facets.conditions=conditions.filter(k=>CONDITIONS.has(k));
  const genres=validList(g.facets.genres,GENRES),presentation=validList(g.facets.presentation,PRESENTATION);
  if(genres?.length)facets.genres=genres; // Search tags do not supply reliable genres.
  if(presentation!==null)facets.presentation=presentation;
  entries.set(g.appid,{...old,appid:g.appid,name:g.name.trim().slice(0,250)||old?.name||String(g.appid),facets,
   source:g.source==='Steam 商店搜尋標籤；不代表完整玩法分析'?g.source:'匯入特徵，待驗證',
   checkedAt:Number.isFinite(g.checkedAt)?g.checkedAt:undefined,stale:g.stale===true,
   featureStatus:g.featureStatus==='steam-tags'?'steam-tags':'provisional',taxonomyVersion:2});
  // Deliberately never accept client-supplied completion baselines or trust flags.
 }
 return [...entries.values()];
}
