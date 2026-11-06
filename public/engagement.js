import {traits} from './taxonomy.js';
export const BASELINE_MAX_AGE=180*86400000;
// Only curated, server-owned metadata can supply this contract. No IGDB fetch yet.
export function completionBaseline(meta,now=Date.now()){
 const b=meta?.completionBaseline;
 if(!b||b.status!=='verified'||!['igdb','curated'].includes(b.source)||b.unit!=='minutes'||b.scope!=='main_story'||b.modelVersion!==1)return null;
 if(!Number.isFinite(b.minutes)||b.minutes<=0||!Number.isFinite(b.checkedAt)||b.checkedAt>now||b.checkedAt+BASELINE_MAX_AGE<=now)return null;
 if(traits(meta).some(t=>['persistent','endgame','grind','runs'].includes(t)))return null;
 return b;
}
export function engagement(minutes,meta,threshold=6,now=Date.now()){
 if(!Number.isFinite(minutes)||minutes<0)return null;
 const b=completionBaseline(meta,now),ratio=b?minutes/b.minutes:null;
 const band=minutes===0?'zero':b?(ratio<.3?'short':ratio>=.8?'long':'mid'):(minutes<(threshold===8?8:6)*60?'short':'long');
 return {band,ratio,method:b?'baseline':'legacy',baseline:b};
}
