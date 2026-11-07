import test from 'node:test';
import assert from 'node:assert/strict';
import {completionBaseline,engagement,BASELINE_MAX_AGE} from './public/engagement.js';
import {signals} from './public/signals.js';
import {evaluateReviews} from './lib/review-policy.mjs';
import {discover,eligible} from './lib/discovery.mjs';
const now=Date.now();
const baseline={minutes:240,unit:'minutes',source:'curated',scope:'main_story',status:'verified',checkedAt:now,modelVersion:1};
const game={appid:1,name:'Story',facets:{mechanics:['story'],conditions:[]},completionBaseline:baseline};
test('same playtime respects reliable short/long baselines and invalid data falls back',()=>{
 assert.equal(engagement(220,game,6,now).band,'long');
 assert.equal(engagement(220,{...game,completionBaseline:{...baseline,minutes:2400}},6,now).band,'short');
 assert.equal(engagement(0,game,6,now).band,'zero');
 assert.equal(engagement(72,game,6,now).band,'mid');assert.equal(engagement(192,game,6,now).band,'long');
 for(const change of [{minutes:0},{minutes:-1},{minutes:Infinity},{minutes:'240'},{unit:'seconds'},{scope:'completionist'},{status:'estimated'},{source:'unknown'},{checkedAt:now+1},{checkedAt:now-BASELINE_MAX_AGE},{modelVersion:2}]){
  const meta={...game,completionBaseline:{...baseline,...change}};
  assert.equal(completionBaseline(meta,now),null);assert.equal(engagement(220,meta,6,now).method,'legacy');
 }
 for(const t of ['persistent','endgame','grind','runs'])assert.equal(engagement(220,{...game,facets:{mechanics:[t],conditions:[]}},6,now).method,'legacy');
 for(const x of [-1,Infinity,NaN])assert.equal(engagement(x,game,6,now),null);
 assert.equal(engagement(400,null,8,now).band,'short');assert.equal(engagement(400,null,6,now).band,'long');
 assert.equal(engagement(220,{...game,completionBaseline:undefined,igdbTimeToBeat:240},6,now).method,'legacy');
});
test('trusted baselines change bounded behavior without overpowering explicit feedback',()=>{
 const cat=[1,2,3].map(appid=>({...game,appid})),lib=cat.map(g=>({...g,minutes:220}));
 assert.ok(signals({},cat,lib).weights.story>0);
 assert.ok(signals({},cat.map(g=>({...g,completionBaseline:undefined})),lib).weights.story<0);
 assert.deepEqual(signals({},cat,lib.slice(0,2)).weights,{});
 const p=signals({1:{rating:'neutral',reasons:['story'],taxonomyVersion:3}},cat,lib);
 assert.ok(p.weights.story>=2&&p.weights.story<=2.45);
});
test('review qualification has exact count boundary with qualified positive rates',()=>{
 for(const n of [0,19,20,29,30])assert.equal(evaluateReviews({total_reviews:n,total_positive:n}).eligible,n>=20);
 assert.equal(evaluateReviews({total_reviews:20,total_positive:4}).eligible,true);
 for(const summary of [null,{}, {total_reviews:-1},{total_reviews:20,total_positive:21},{total_reviews:20,total_positive:-1},{total_reviews:20,total_positive:null}]){
  assert.equal(evaluateReviews(summary).reason,'unknown');assert.equal(evaluateReviews(summary).eligible,false);
 }
 assert.equal(evaluateReviews({total_reviews:0,total_positive:0}).reason,'insufficient');
});
const answers={646570:{rating:'like',reasons:['strategy'],taxonomyVersion:3}};
const ids=[801,802,803,804,805,806];
const counts=[0,19,20,29,30,null];
const mock=async url=>{
 const u=new URL(url);
 if(u.pathname.includes('tagdata'))return Response.json([{tagid:9,name:'Strategy'}]);
 if(u.pathname.includes('/search/'))return Response.json({success:1,results_html:ids.map(id=>`<a data-ds-appid="${id}" data-ds-tagids="[9]"><span class="title">Game ${id}</span></a>`).join('')});
 if(u.pathname.includes('appreviews')){const count=counts[ids.indexOf(Number(u.pathname.split('/').pop()))];return Response.json({success:1,query_summary:{total_reviews:count,total_positive:count===null?null:Math.ceil(count*.2)}},{headers:{'X-Cache-State':'stale','X-Cache-Fetched-At':String(Date.now()-1000)}});}
 const id=u.searchParams.get('appids');return Response.json({[id]:{success:true,data:{type:'game',name:'Game '+id,release_date:{coming_soon:false},is_free:true}}});
};
test('full discovery excludes insufficient/unknown reviews and accepts grace-cache valid counts',async()=>{
 const result=await discover({owned:[],answers},mock);
 // Membership is the contract here; order now also reflects review quality (same 20% rate, different sample sizes).
 assert.deepEqual(result.games.map(g=>g.appid).sort((a,b)=>a-b),[803,804,805]);
 assert.ok(result.warnings.some(w=>w.includes('未滿 20')));assert.ok(result.warnings.some(w=>w.includes('無法確認')));
 const excluded=await discover({owned:[803],answers,feedback:{804:{choice:'known'}}},mock);
 assert.deepEqual(excluded.games.map(g=>g.appid),[805]);
});
test('review-stage infrastructure failures keep original retry semantics',async()=>{
 for(const code of ['database','updating','interrupted','rate_limit'])await assert.rejects(discover({owned:[],answers},async url=>{
  if(String(url).includes('/appreviews/'))throw Object.assign(Error(code),{code,retryAfter:90,managed:true});
  return mock(url);
 }),e=>e.code===code&&e.retryAfter===90);
});
test('exploration never relaxes the existing fit threshold',()=>{
 const gs=[{appid:1,fit:1,matched:['story']},{appid:2,fit:.3,score:10,matched:['story']}];
 assert.deepEqual(eligible(gs).map(g=>g.appid),[1]);
});

test('full discovery rejects low or unknown positive rates including grace-cache responses',async()=>{
 for(const summary of [{total_reviews:20,total_positive:3},{total_reviews:20}]){
  const result=await discover({owned:[],answers},async url=>{
   if(!String(url).includes('/appreviews/'))return mock(url);
   const u=new URL(url);assert.equal(u.searchParams.get('language'),'all');assert.equal(u.searchParams.get('purchase_type'),'all');
   return Response.json({success:1,query_summary:summary},{headers:{'X-Cache-State':'stale','X-Cache-Fetched-At':String(Date.now()-1000)}});
  });
  assert.equal(result.games.length,0);
  assert.ok(result.warnings.some(w=>w.includes(summary.total_positive===undefined?'無法確認':'好評率低於 20%')));
  assert.ok(!result.warnings.some(w=>w.includes('未滿 20')));
 }
});
