import {REVIEW_ENDPOINT} from './review-policy.mjs';
// Temporary per-isolate protection. Not a distributed/global quota.
export const POLICY={dictionary:{minute:2,ttl:86400000},search:{minute:36,ttl:21600000},details:{minute:30,ttl:3600000},reviews:{minute:15,ttl:86400000}};
export const limited=(seconds=60)=>Object.assign(Error(`查詢保護已啟動，請約 ${seconds} 秒後再試；目前進度已保留。`),{code:'rate_limit',status:429,retryAfter:seconds,source:'policy'});
export function kindOf(url){const u=new URL(url);if(u.origin+u.pathname===REVIEW_ENDPOINT)return 'reviews';if(u.hostname!=='store.steampowered.com')throw Error('Unconfigured upstream');if(u.pathname.startsWith('/tagdata/'))return 'dictionary';if(u.pathname==='/search/results/')return 'search';if(u.pathname==='/api/appdetails')return 'details';throw Error('Unconfigured endpoint');}
// Shared by the in-memory and D1 caches; error cooldowns remain independent.
export function cacheTtl(url){const kind=kindOf(url);return kind==='search'&&/^Released_(?:ASC|DESC)$/.test(new URL(url).searchParams.get('sort_by')||'')?3600000:POLICY[kind].ttl;}
export function createPolicy({fetcher=fetch,now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms)),gap=500}={}){
 const failures=new Map(),counts=new Map(),cooldowns=new Map(),cache=new Map(),pending=new Map();let tail=Promise.resolve(),last=-Infinity;
 function take(key,max){const t=now(),a=(counts.get(key)||[]).filter(x=>t-x<60000);if(a.length>=max)throw limited(Math.max(1,Math.ceil((a[0]+60000-t)/1000)));a.push(t);counts.set(key,a);}
 async function request(url,options={}){const key=String(url),kind=kindOf(url),hit=cache.get(key);if(!options.bypassMemoryCache&&hit&&hit.until>now())return new Response(hit.body,{headers:{'Content-Type':'application/json'}});if(pending.has(key))return (await pending.get(key)).clone();if(pending.size>=48)throw limited();
 const task=tail.catch(()=>{}).then(async()=>{options.signal?.throwIfAborted();const until=Math.max(cooldowns.get('all')||0,cooldowns.get(kind)||0);if(until>now())throw limited(Math.ceil((until-now())/1000));await sleep(Math.max(0,last+gap-now()));options.signal?.throwIfAborted();take('all',80);take(kind,POLICY[kind].minute);last=now();
 let r;try{r=await fetcher(url,{...options,signal:options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(9000)]):AbortSignal.timeout(9000)});}catch(e){const n=(failures.get(kind)||0)+1;failures.set(kind,n);if(n>=3)cooldowns.set(kind,now()+60000);throw e;}
 if(r.status>=500){const n=(failures.get(kind)||0)+1;failures.set(kind,n);if(n>=3)cooldowns.set(kind,now()+60000);}else if(r.ok)failures.set(kind,0);
 if(r.status===429){const raw=r.headers.get('Retry-After'),n=Number(raw),ms=raw?(Number.isFinite(n)?n*1000:Date.parse(raw)-now()):60000;cooldowns.set('all',now()+Math.max(60000,Number.isFinite(ms)?ms:60000));}
 if(r.ok){const body=await r.clone().text();try{JSON.parse(body);if(body.length<250000){if(cache.size>=30)cache.delete(cache.keys().next().value);if(!options.bypassMemoryCache)cache.set(key,{body,until:now()+cacheTtl(url)});}}catch{/* Never cache malformed JSON. */}}
 return r;});tail=task.then(()=>{},()=>{});pending.set(key,task);try{return (await task).clone();}finally{pending.delete(key);}}
 return {request};
}
export const upstream=createPolicy();
export function budgetFetch(max,fetcher=upstream.request){let used=0;const deadline=Date.now()+90000;const wrapped=(url,options)=>{if(Date.now()>deadline||++used>max)throw limited();return fetcher(url,options);};wrapped.production=fetcher===upstream.request;return wrapped;}
export function createAdmission(now=Date.now){const state=new Map();return kind=>{const t=now(),s=state.get(kind)||{active:0,times:[]},max=kind==='recommendations'?2:6;s.times=s.times.filter(x=>t-x<60000);if(s.active>=(kind==='recommendations'?1:2)||s.times.length>=max)throw limited();s.active++;s.times.push(t);state.set(kind,s);let done=false;return ()=>{if(!done){s.active--;done=true;}};};}
export const admit=createAdmission();
