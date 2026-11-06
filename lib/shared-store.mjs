import {fault} from './api-errors.mjs';
import {POLICY,kindOf,limited,cacheTtl} from './request-policy.mjs';
const VERSION='upstream-v1:';
export const COORDINATION={leaseMs:30000,workMs:20000,waitMs:4000,maxPolls:4};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const managed=(code,retryAfter=0,source='coordination')=>Object.assign(fault(code,retryAfter),{managed:true,source});
export function maxCacheAge(url){const kind=kindOf(url);return kind==='reviews'?259200000:kind==='search'?(cacheTtl(url)===3600000?21600000:86400000):0;}
function backoff(row,t){const raw=row.error_code;const code=raw==='429'?'rate_limit':['timeout','network','format','rate_limit','updating','interrupted'].includes(raw)?raw:/^\d{3}$/.test(raw||'')?'http':'network';return managed(code,Math.max(1,Math.ceil((row.retry_at-t)/1000)),row.error_source||'upstream');}
function retrySeconds(raw,t){if(!raw)return 60;const n=Number(raw);return Math.max(1,Math.ceil(Number.isFinite(n)?n:(Date.parse(raw)-t)/1000)||60);}
function classify(e){return e.code||(e.name==='TimeoutError'||e.name==='AbortError'?'timeout':'network');}

// All state writes are fenced by both owner and lease expiry. A timed-out owner
// may finish its network call later, but cannot publish or unlock its successor.
export function sharedFetch(db,upstream,{now=Date.now,token=()=>crypto.randomUUID(),sleep:pause=sleep,random=Math.random,onStale=()=>{},onRead=()=>{},workMs=COORDINATION.workMs,leaseMs=COORDINATION.leaseMs,waitMs=COORDINATION.waitMs}={}){
 if(!db)throw fault('database');
 if(workMs>=leaseMs)throw Error('Work deadline must fit inside lease');
 const pending=new Map();
 async function execute(url,options){
  const key=VERSION+String(url),kind=kindOf(url),owner=token();
  const read=()=>db.prepare('SELECT * FROM api_cache WHERE cache_key=?').bind(key).first();
  const fresh=row=>row?.body&&row.expires_at>now();
  const stale=row=>row?.body&&Number.isFinite(row.fetched_at)&&row.fetched_at+maxCacheAge(url)>now()&&maxCacheAge(url)>0;
  function response(row,isStale=false){const headers={'Content-Type':'application/json','X-Cache-Fetched-At':String(row.fetched_at),'X-Cache-State':isStale?'stale':'fresh'};onRead({kind,fetchedAt:row.fetched_at,stale:isStale,validUntil:isStale?row.fetched_at+maxCacheAge(url):row.expires_at});if(isStale)onStale({kind,fetchedAt:row.fetched_at});return new Response(row.body,{headers});}
  const reusable=row=>fresh(row)?response(row):stale(row)?response(row,true):null;
  let row=await read(),polls=0;const waitUntil=now()+waitMs;
  for(;;){
   if(fresh(row))return response(row);
   if(row?.retry_at>now()){const old=stale(row)&&response(row,true);if(old)return old;throw backoff(row,now());}
   const t=now();
   const lock=await db.prepare(`INSERT INTO api_cache(cache_key,kind,lease_token,lease_until) VALUES(?,?,?,?)
    ON CONFLICT(cache_key) DO UPDATE SET lease_token=excluded.lease_token,lease_until=excluded.lease_until,
    error_code=CASE WHEN api_cache.lease_token IS NOT NULL THEN 'interrupted' ELSE api_cache.error_code END,
    error_source=CASE WHEN api_cache.lease_token IS NOT NULL THEN 'coordination' ELSE api_cache.error_source END,
    last_failure_at=CASE WHEN api_cache.lease_token IS NOT NULL THEN ? ELSE api_cache.last_failure_at END,
    failure_count=CASE WHEN api_cache.lease_token IS NOT NULL THEN MIN(api_cache.failure_count+1,1000) ELSE api_cache.failure_count END
    WHERE api_cache.lease_until<=? AND api_cache.retry_at<=? AND (api_cache.body IS NULL OR api_cache.expires_at<=?)`)
    .bind(key,kind,owner,t+leaseMs,t,t,t,t).run();
   if(lock.meta?.changes)break;
   row=await read();const available=reusable(row);if(available)return available;
   if(row?.retry_at>now())throw backoff(row,now());
   const remaining=waitUntil-now();
   if(remaining<=0||polls>=COORDINATION.maxPolls)throw managed('updating',2);
   // Four bounded polls, with increasing intervals and jitter; never re-send upstream here.
   const delay=Math.min(remaining,250*2**polls+Math.floor(random()*150));polls++;
   await pause(delay);row=await read();
  }
  const acquired=await read();if(acquired?.error_code==='interrupted')console.info('cache_recovery',JSON.stringify({kind,event:'expired_owner_replaced',cause:'unknown'}));
  const owns=async()=>{const r=await read();if(r?.lease_token!==owner||r.lease_until<=now())throw managed('updating',2);return r;};
  try{
   await owns();
   // Shared quota admission, still checked before every actual refresh.
   for(const [scope,max] of [['all',80],[kind,POLICY[kind].minute]]){
    const t=now(),window=Math.floor(t/60000)*60000;
    const q=await db.prepare(`INSERT INTO api_quota(scope,window_start,used,cooldown_until) VALUES(?,?,1,0)
     ON CONFLICT(scope) DO UPDATE SET window_start=excluded.window_start,
     used=CASE WHEN api_quota.window_start=excluded.window_start THEN api_quota.used+1 ELSE 1 END
     WHERE api_quota.cooldown_until<=? AND (api_quota.window_start<>excluded.window_start OR api_quota.used<?)`)
     .bind(scope,window,t,max).run();
    if(!q.meta?.changes){const current=await db.prepare('SELECT cooldown_until,window_start FROM api_quota WHERE scope=?').bind(scope).first();throw Object.assign(limited(Math.max(1,Math.ceil((Math.max(current?.cooldown_until||0,(current?.window_start||t)+60000)-now())/1000))),{source:'quota'});}
   }
   const ownership=await owns();
   const remainingWork=Math.min(workMs,ownership.lease_until-now()-Math.min(1000,leaseMs/10));
   if(remainingWork<=0)throw managed('updating',2);
   const controller=new AbortController();let timer;
   // Bounds queue + network + body reading. Cancellation-aware upstream prevents
   // queued requests from starting after this deadline has already elapsed.
   const task=(async()=>{const r=await upstream(url,{...options,bypassMemoryCache:true,signal:options.signal?AbortSignal.any([options.signal,controller.signal]):controller.signal});
    if(!r.ok){const e=managed(r.status===429?'rate_limit':'http',retrySeconds(r.headers.get('Retry-After'),now()),'upstream');e.status=r.status;throw e;}
    const body=await r.text();let data;try{data=JSON.parse(body)}catch{throw managed('format',3600,'upstream');}
    if(kind==='reviews'&&(data?.success!==1||!Number.isSafeInteger(data.query_summary?.total_reviews)||data.query_summary.total_reviews<0))throw managed('format',3600,'upstream');
    if(body.length>250000)throw managed('format',3600,'upstream');
    return body;
   })();
   let body;try{body=await Promise.race([task,new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(managed('timeout',30,'upstream'));},remainingWork);})]);}finally{clearTimeout(timer);}
   const t=now();
   const written=await db.prepare(`UPDATE api_cache SET body=?,fetched_at=?,expires_at=?,retry_at=0,error_code=NULL,error_source=NULL,failure_count=0,last_failure_at=NULL WHERE cache_key=? AND lease_token=? AND lease_until>?`)
    .bind(body,t,t+cacheTtl(url),key,owner,t).run();
   if(!written.meta?.changes)throw managed('updating',2);
   await db.prepare('DELETE FROM api_cache WHERE cache_key IN (SELECT cache_key FROM api_cache WHERE expires_at<? AND retry_at<? AND lease_until<? LIMIT 50)').bind(t-259200000,t,t).run();
   return response({body,fetched_at:t,expires_at:t+cacheTtl(url)});
  }catch(e){
   if(e.code==='database')throw e;
   const current=await read(),t=now();
   if(current?.lease_token!==owner||current.lease_until<=t){const available=reusable(current);if(available)return available;throw managed('updating',2);}
   const code=classify(e),source=e.source||'upstream';
   const count=(current.last_failure_at&&t-current.last_failure_at<900000?current.failure_count:0)+1;
   const permanent=code==='format'||(e.status>=400&&e.status<500&&e.status!==429);
   const delay=code==='rate_limit'?Math.max(1,e.retryAfter||60)*1000:code==='updating'?2000:permanent?3600000:count>=3?900000:Math.min(300000,30000*2**(count-1));
   const retryAt=t+delay;
   // Publish the failure and release in ONE transaction, so waiters cannot see
   // an unlocked row without its backoff. Global cooldown is owner-fenced too.
   const statements=[];
   if(code==='rate_limit'&&source==='upstream')statements.push(db.prepare(`UPDATE api_quota SET cooldown_until=MAX(cooldown_until,?) WHERE scope='all' AND EXISTS (SELECT 1 FROM api_cache WHERE cache_key=? AND lease_token=? AND lease_until>?)`).bind(retryAt,key,owner,t));
   statements.push(db.prepare(`UPDATE api_cache SET retry_at=?,error_code=?,error_source=?,failure_count=?,last_failure_at=?,lease_until=0,lease_token=NULL WHERE cache_key=? AND lease_token=? AND lease_until>?`)
    .bind(retryAt,e.status?String(e.status):code,source,Math.min(1000,count),t,key,owner,t));
   const saved=await db.batch(statements);
   if(!saved[saved.length-1]?.meta?.changes){const available=reusable(await read());if(available)return available;throw managed('updating',2);}
   console.info('cache_refresh_failure',JSON.stringify({kind,code,source,failures:count,retryAfter:Math.ceil(delay/1000)}));
   if(stale(current))return response(current,true);
   throw Object.assign(managed(code,Math.ceil(delay/1000),source),{status:e.status});
  }finally{
   await db.prepare('UPDATE api_cache SET lease_until=0,lease_token=NULL WHERE cache_key=? AND lease_token=? AND lease_until>?').bind(key,owner,now()).run();
  }
 }
 return async(url,options={})=>{const key=String(url);if(pending.has(key))return (await pending.get(key)).clone();const task=execute(url,options);pending.set(key,task);try{return (await task).clone()}finally{pending.delete(key)}};
}
export async function readGames(db,ids,now=Date.now()){
 if(!ids.length)return [];
 const rows=await db.prepare(`SELECT payload_json FROM game_sources WHERE provider='steam-tags' AND schema_version=2 AND expires_at>? AND steam_app_id IN (${ids.map(()=>'?').join(',')})`).bind(now,...ids).all();
 try{return rows.results.map(x=>JSON.parse(x.payload_json))}catch{throw fault('database')}
}
export async function saveGames(db,games){
 // Stale search data must never be promoted into a new seven-day game record.
 games=games.filter(g=>!g.stale);if(!games.length)return;
 const statements=[];
 for(const g of games){
  statements.push(db.prepare('INSERT INTO games(steam_app_id,name,updated_at) VALUES(?,?,?) ON CONFLICT(steam_app_id) DO UPDATE SET name=excluded.name,updated_at=excluded.updated_at').bind(g.appid,g.name,g.checkedAt));
  statements.push(db.prepare(`INSERT INTO game_sources(id,steam_app_id,provider,external_id,fetched_at,expires_at,schema_version,payload_json) VALUES(?,?,'steam-tags',?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET fetched_at=excluded.fetched_at,expires_at=excluded.expires_at,schema_version=excluded.schema_version,payload_json=excluded.payload_json`)
   .bind('steam-tags:'+g.appid,g.appid,String(g.appid),g.checkedAt,g.checkedAt+604800000,2,JSON.stringify(g)));
 }
 await db.batch(statements);
}
