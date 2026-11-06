import {freshnessTracker} from '../../../lib/cache-freshness.mjs';
import {env} from 'cloudflare:workers';
import {sharedFetch} from '../../../lib/shared-store.mjs';
import {discover,validateInput} from '../../../lib/discovery.mjs';
import {admit,budgetFetch,upstream} from '../../../lib/request-policy.mjs';
import {database,errorResponse,fault,requestJson} from '../../../lib/api-errors.mjs';
export async function POST(request:Request){
 const requestId=crypto.randomUUID();let release:(()=>void)|undefined;
 try{
  if(request.headers.get('origin')!==new URL(request.url).origin)throw fault('forbidden');
  const input=await requestJson(request,5000000);
  try{validateInput(input);if(input.metadata!==undefined&&(!Array.isArray(input.metadata)||input.metadata.length>10000))throw Error()}catch{throw fault('invalid_input')}
  release=admit('recommendations');const db=database(env.DB),freshness=freshnessTracker();
  const result=await discover(input,budgetFetch(44,sharedFetch(db,upstream.request,{onRead:freshness.record})));
  const cache=freshness.result();
  return Response.json({...result,cacheUntil:cache.cacheUntil,staleSources:cache.staleSources,warnings:[...new Set([...result.warnings||[],...cache.warnings,...(input.metadata?.some((g:any)=>g.stale)?['部分遊戲分類暫用先前資料，尚未完成更新。']:[])])]},{headers:{'Cache-Control':'private, no-store','X-Request-ID':requestId}});
 }catch(e){return errorResponse(e,requestId)}finally{release?.()}
}
