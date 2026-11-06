import test from 'node:test';import assert from 'node:assert/strict';
import {fault,errorResponse,requestJson,database} from './lib/api-errors.mjs';
import {enrich,jsonGet} from './lib/steam-metadata.mjs';
import {discover} from './lib/discovery.mjs';
const request=body=>new Request('https://test/api',{method:'POST',body});
test('invalid JSON, null and arrays are input errors; byte limit stops a stream',async()=>{
 for(const text of ['{','null','[]'])await assert.rejects(requestJson(request(text),100),e=>e.code==='invalid_input');
 await assert.rejects(requestJson(request('"中文"'),5),e=>e.code==='payload_too_large');
 assert.deepEqual(await requestJson(request('{"games":[]}'),100),{games:[]});
});
test('safe public error response separates DB and upstream and never exposes raw exceptions',async()=>{
 for(const [code,status] of [['database',503],['network',502],['timeout',504],['invalid_input',400],['forbidden',403],['rate_limit',429]]){
  const r=errorResponse(Object.assign(Error('SECRET_SQL token=secret'),{code,retryAfter:180}),'test-id');const d=await r.json();assert.equal(r.status,status);assert.equal(d.code,code);assert.equal(JSON.stringify(d).includes('SECRET'),false);assert.equal(d.requestId,'test-id');if(d.retryable)assert.equal(r.headers.get('Retry-After'),'180');else assert.equal(r.headers.get('Retry-After'),null);
 }
 const r=errorResponse(Error('SQL internal details'),'test-id');assert.equal(r.status,500);assert.equal((await r.json()).code,'internal');
});
test('D1 prepare, async read and batch errors have a database code',async()=>{
 assert.throws(()=>database(null),e=>e.code==='database');
 assert.throws(()=>database({prepare(){throw Error('SQL')}}).prepare('select'),e=>e.code==='database');
 await assert.rejects(database({prepare(){return {bind(){return {first:async()=>{throw Error('SQL')}}}}}}).prepare('select').bind().first(),e=>e.code==='database');
 await assert.rejects(database({batch:async()=>{throw Error('SQL')}}).batch([]),e=>e.code==='database');
});
test('D1 wrapper forwards original statements through atomic batch',async()=>{
 const statement={run:async()=>({ok:true})};const db=database({prepare:()=>({bind:()=>statement}),batch:async xs=>{assert.equal(xs[0],statement);return [{success:true}]}});assert.deepEqual(await db.batch([db.prepare('sql').bind(1)]),[{success:true}]);
});
test('upstream 429 Retry-After survives without retry',async()=>{let n=0;await assert.rejects(jsonGet('https://store.steampowered.com/search/results/',async()=>{n++;return new Response('',{status:429,headers:{'Retry-After':'180'}})}),e=>e.code==='rate_limit'&&e.retryAfter===180);assert.equal(n,1)});
test('database failure is not retried or disguised by dictionary/enrichment',async()=>{let n=0;await assert.rejects(enrich([{appid:1,name:'Test'}],async()=>{n++;throw fault('database')}),e=>e.code==='database');assert.equal(n,1)});
test('database failures during search propagate beyond partial result handlers',async()=>{
 await assert.rejects(discover({owned:[646570],library:[],answers:{646570:{rating:'like',reasons:[]}}},async url=>{if(String(url).includes('tagdata'))return Response.json([]);throw fault('database')}),e=>e.code==='database');
});
test('all enrichment requests failing return failure; exact-match absence remains missing',async()=>{
 const games=[{appid:1,name:'Test'}];
 await assert.rejects(enrich(games,async url=>String(url).includes('tagdata')?Response.json([]):new Response('',{status:429,headers:{'Retry-After':'120'}})),e=>e.code==='rate_limit');
 const d=await enrich(games,async url=>String(url).includes('tagdata')?Response.json([]):Response.json({results_html:''}));assert.deepEqual(d.missing,[1]);assert.deepEqual(d.games,[]);
});
test('browser client classifies JSON/non-JSON, storage denial, cooldown and recovery',async()=>{
 const originalFetch=globalThis.fetch,originalStorage=globalThis.localStorage,originalNow=Date.now;let time=1000000,calls=0;
 Date.now=()=>time;globalThis.localStorage={getItem(){throw Error('denied')},setItem(){throw Error('denied')}};
 try{
  const {apiJson,cooldownUntil}=await import('./public/api-policy.js');
  globalThis.fetch=async()=>{calls++;return Response.json({code:'database',error:'RAW INTERNAL SQL',retryAfter:180,retryable:true,requestId:'test'},{status:503,headers:{'Retry-After':'180'}})};
  await assert.rejects(apiJson('/api/features',{}),e=>e.code==='database'&&!e.message.includes('SQL'));assert.equal(cooldownUntil('/api/features'),time+180000);
  await assert.rejects(apiJson('/api/features',{}),e=>e.code==='rate_limit');assert.equal(calls,1);
  time+=180001;globalThis.fetch=async()=>{calls++;return Response.json({games:[],missing:[]})};assert.deepEqual(await apiJson('/api/features',{}),{games:[],missing:[]});
  time+=10001;globalThis.fetch=async()=>new Response('<html>Proxy error</html>',{status:502});await assert.rejects(apiJson('/api/features',{}),e=>e.code==='format');
  time+=10001;globalThis.fetch=async()=>{throw new DOMException('timeout','TimeoutError')};await assert.rejects(apiJson('/api/features',{}),e=>e.code==='timeout');
  time+=10001;globalThis.fetch=async()=>Response.json({games:null});await assert.rejects(apiJson('/api/features',{}),e=>e.code==='format');
 }finally{globalThis.fetch=originalFetch;globalThis.localStorage=originalStorage;Date.now=originalNow}
});

test('browser preserves updating classification and does not automatically resend',async()=>{const originalFetch=globalThis.fetch,originalNow=Date.now;let time=90000000,calls=0;Date.now=()=>time;try{const {apiJson}=await import('./public/api-policy.js');globalThis.fetch=async()=>{calls++;return Response.json({code:'updating',error:'RAW',retryAfter:2,retryable:true},{status:503,headers:{'Retry-After':'2'}})};await assert.rejects(apiJson('/api/recommendations',{}),e=>e.code==='updating'&&e.message.includes('準備中'));assert.equal(calls,1);time+=60001;globalThis.fetch=async()=>{calls++;return Response.json({status:'success',games:[]})};assert.equal((await apiJson('/api/recommendations',{})).status,'success');assert.equal(calls,2)}finally{globalThis.fetch=originalFetch;Date.now=originalNow}});
