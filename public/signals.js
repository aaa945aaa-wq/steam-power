import {engagement} from './engagement.js';
import {attraction} from './attraction.js';
import {profile,isTool,isIdle} from './engine.js';
import {traits,FEATURE_LABELS} from './taxonomy.js';
export const MODEL_VERSION=8;
// Bounded, provisional coefficients. They are not calibrated probabilities.
export function signals(answers,catalog,library=[],threshold=6,feedback={}){
 const p=profile(answers,catalog),weights={...p.weights},evidence={...p.evidence},groups={},behavior=[];
 const add=(t,v,label)=>{weights[t]=(weights[t]||0)+v;(evidence[t]??=[]).push(label);};
 for(const g of library){
  const meta=catalog.find(c=>c.appid===g.appid);
  if(!meta||isTool(g)||isIdle(g))continue;
  const e=engagement(g.minutes,meta,threshold);if(!e)continue;
  for(const t of traits(meta)){
   const group=groups[t]??={zero:0,short:0,mid:0,long:0,baselineSamples:0};
   group[e.band]++;if(e.method==='baseline')group.baselineSamples++;
  }
 }
 for(const [t,s] of Object.entries(groups)){
  const n=s.zero+s.short+s.mid+s.long;if(n<3)continue;
  const v=Math.max(-.35,Math.min(.45,(s.long*.5+s.mid*.1-s.short*.3-s.zero*.08)/n));
  add(t,v,`行為樣本 ${n} 款：未啟動 ${s.zero}／短暫 ${s.short}／中度 ${s.mid}／投入 ${s.long}（${s.baselineSamples} 款有可信時數基準）`);
  behavior.push({tag:t,...s,value:v});
 }
 for(const f of Object.values(feedback).slice(-200)){if(!['interested','not_for_me'].includes(f.choice))continue;const fs=(f.features||[]).filter(t=>typeof t==='string').slice(0,12);if(f.choice==='interested')for(const t of fs)add(t,.12,'候選作品：表示有興趣（尚非遊玩體驗）');if(f.choice==='not_for_me'&&f.reason==='content'){const aspect=typeof f.aspect==='string'&&Object.hasOwn(FEATURE_LABELS,f.aspect)?f.aspect:null;for(const t of aspect?[aspect]:fs)add(t,-.18,aspect?'候選作品：指定玩法不合（弱修正）':'候選作品：玩法不合（弱修正）');}}
 return {weights,evidence,behavior,attraction:attraction(answers,catalog,library,feedback),coverage:library.filter(g=>catalog.some(c=>c.appid===g.appid)).length};
}
export function predict(game,answers,catalog,library=[],threshold=6){
 const rest={...answers};delete rest[game?.appid];const p=signals(rest,catalog,library.filter(g=>g.appid!==game?.appid),threshold);const ts=traits(game);const score=ts.reduce((s,t)=>s+(p.weights[t]||0),0)/Math.sqrt(Math.max(1,ts.length));const support=Object.entries(rest).filter(([id,a])=>a.rating!=='skip'&&traits(catalog.find(g=>g.appid===+id)).some(t=>ts.includes(t))).length;
 return {score,support,expected:score>=.35?'like':score<=-.35?'regret':'unknown',confident:support>=2&&Math.abs(score)>=.35};
}
export function mismatch(pred,rating){return !!pred?.confident&&((pred.expected==='like'&&rating==='regret')||(pred.expected==='regret'&&rating==='like'));}
export function discoveryOrder(games,limit=5){const left=[...games],out=[];while(left.length&&out.length<limit){const rankScore=g=>g.score>0&&Number.isFinite(g.qualityFactor)?g.score*Math.min(1,Math.max(0,g.qualityFactor)):g.score;const value=g=>rankScore(g)+.25*(g.discovery||0)-.4*Math.max(0,...out.map(o=>{const a=new Set(o.matched);return g.matched.filter(t=>a.has(t)).length/Math.max(1,new Set([...g.matched,...o.matched]).size);}));left.sort((a,b)=>value(b)-value(a)||a.appid-b.appid);out.push(left.shift());}return out;}
