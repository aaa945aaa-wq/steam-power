import {mergeCatalog,splitFeatures} from '../public/metadata.js';
import {fault} from './api-errors.mjs';
import {budgetFetch} from './request-policy.mjs';
import base from '../public/catalog.json' with {type:'json'};
import {PRESENTATION} from '../public/attraction.js';
export const NAMES={cards:'Deckbuilding',build:'Action RPG',strategy:'Strategy',story:'Story Rich',social:'Co-op',explore:'Exploration',loot:'Loot',manage:'Resource Management',action:'Action',tuning:'Automobile Sim',turn:'Turn-Based',random:'Roguelike',runs:'Rogue-lite',grind:'Grinding',persistent:'MMORPG',driving:'Driving',fantasy:'Fantasy',darkFantasy:'Dark Fantasy',scifi:'Sci-fi',cyberpunk:'Cyberpunk',horror:'Horror',historical:'Historical',postapocalyptic:'Post-apocalyptic',mythology:'Mythology',space:'Space',pixel:'Pixel Graphics',anime:'Anime',cute:'Cute',handdrawn:'Hand-drawn',minimalist:'Minimalist',dark:'Dark',indie:'Indie'};
export const FALLBACK={32322:'cards',1091588:'cards',1666:'cards',4231:'build',9:'strategy',1741:'strategy',1742:'story',1685:'social',3834:'explore',4236:'loot',8945:'manage',7332:'manage',1643:'manage',19:'action',1100687:'tuning'};
let dictionaryCache=null;const gameCache=new Map();
export const CACHE_INFO=Symbol('cache-info');
export async function jsonGet(url,fetcher=fetch){
 const endpoint=new URL(url).pathname;
 for(let attempt=0;attempt<2;attempt++){
  try{
   const r=await fetcher(url,{signal:AbortSignal.timeout(9000),headers:{Accept:'application/json'}});
   if(!r.ok){const e=new Error(`Steam HTTP ${r.status}`);e.code=r.status===429?'rate_limit':'http';e.retryable=r.status>=500;e.status=r.status;const raw=r.headers.get('Retry-After');if(raw){const n=Number(raw);e.retryAfter=Math.max(1,Math.ceil(Number.isFinite(n)?n:(Date.parse(raw)-Date.now())/1000)||60)}throw e;}
   try{const d=await r.json();if(d&&typeof d==='object')Object.defineProperty(d,CACHE_INFO,{value:{stale:r.headers.get('X-Cache-State')==='stale',fetchedAt:Number(r.headers.get('X-Cache-Fetched-At'))||Date.now()}});return d;}catch{const e=new Error('Steam 回應不是有效的 JSON');e.code='format';throw e;}
  }catch(e){
   const code=e.code||(e.name==='TimeoutError'||e.name==='AbortError'?'timeout':'network');
   if(!e.managed&&attempt===0&&(e.retryable||code==='timeout'||code==='network')){await new Promise(resolve=>setTimeout(resolve,350));continue;}
   console.error('steam_request_failed',JSON.stringify({endpoint,code,status:e.status||null,attempts:attempt+1}));
   e.code=code;throw e;
  }
 }
}
export async function dictionary(fetcher=fetch){if((fetcher===fetch||fetcher.production)&&dictionaryCache&&dictionaryCache.expires>Date.now())return dictionaryCache.value;const d=await jsonGet('https://store.steampowered.com/tagdata/populartags/english',fetcher);if(!Array.isArray(d))throw fault('format');const ids={},map={...FALLBACK};for(const t of d){const key=Object.keys(NAMES).find(k=>NAMES[k].toLowerCase()===String(t.name).toLowerCase());if(key&&Number.isSafeInteger(+t.tagid)){ids[key]=+t.tagid;map[+t.tagid]=key;}}const value={ids,map};if(fetcher===fetch||fetcher.production)dictionaryCache={value,expires:Date.now()+86400000};return value;}
export function parseRows(html){const rows=[];for(const m of html.matchAll(/<a\b[^>]*data-ds-appid="(\d+)"[^>]*>[\s\S]*?<\/a>/g)){const row=m[0];let tagIds=[];try{tagIds=JSON.parse(row.match(/data-ds-tagids="([^"]*)"/)?.[1]||'[]');}catch{}const name=row.match(/<span class="title">([\s\S]*?)<\/span>/)?.[1]?.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&');if(name)rows.push({appid:+m[1],name,tagIds:tagIds.filter(Number.isSafeInteger)});}return rows;}
export function asMetadata(g,map){const keys=[...new Set(g.tagIds.map(t=>map[t]).filter(Boolean))];return {appid:g.appid,name:g.name,facets:{genres:[],...splitFeatures(keys),presentation:keys.filter(t=>PRESENTATION[t])},source:'Steam 商店搜尋標籤；不代表完整玩法分析',checkedAt:Date.now(),featureStatus:'steam-tags',taxonomyVersion:2};}
export async function enrich(games,fetcher=fetch){if(fetcher===fetch)fetcher=budgetFetch(14);if(!Array.isArray(games)||games.length>12||games.some(g=>!g||!Number.isSafeInteger(g.appid)||g.appid<=0||typeof g.name!=='string'||g.name.length>250))throw Error('每批最多 12 款有效遊戲');const dict=await dictionary(fetcher);const results=[],missing=[],errors=[];let cursor=0;await Promise.all(Array.from({length:3},async()=>{while(cursor<games.length){const g=games[cursor++],cached=gameCache.get(g.appid);if((fetcher===fetch||fetcher.production)&&cached&&Date.now()-cached.checkedAt<604800000){results.push(cached);continue;}try{const u=new URL('https://store.steampowered.com/search/results/');u.search=new URLSearchParams({term:normalizeSearchTerm(g.name),count:'20',start:'0',infinite:'1',cc:'tw',l:'english',category1:'998'});const d=await jsonGet(u,fetcher);if(!d||typeof d.results_html!=='string')throw fault('format');const match=parseRows(d.results_html||'').find(x=>x.appid===g.appid);if(!match){missing.push(g.appid);continue;}const meta=asMetadata(match,dict.map);if(d[CACHE_INFO]?.stale){meta.stale=true;meta.checkedAt=d[CACHE_INFO].fetchedAt;}results.push(meta);if(!meta.stale&&(fetcher===fetch||fetcher.production)){if(gameCache.size>=5000)gameCache.delete(gameCache.keys().next().value);gameCache.set(g.appid,meta);}}catch(e){if(e.code==='database')throw e;errors.push(e);missing.push(g.appid);}}}));if(errors.length===games.length&&games.length)throw errors.find(e=>e.code==='rate_limit')||errors[0];return {games:results,missing,warnings:errors.length?['部分遊戲分類暫時無法取得，本次先使用已有分類。']:[]};}
export function mergeMetadata(extra=[]){return mergeCatalog(base,extra);}
export function normalizeSearchTerm(name){return String(name??'').replace(/[™®©]/g,' ').replace(/\s+/g,' ').trim();}
