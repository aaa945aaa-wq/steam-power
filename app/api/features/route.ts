import {freshnessTracker} from '../../../lib/cache-freshness.mjs';
import {env} from 'cloudflare:workers';
import {sharedFetch,readGames,saveGames} from '../../../lib/shared-store.mjs';
import {enrich} from '../../../lib/steam-metadata.mjs';
import {admit,budgetFetch,upstream} from '../../../lib/request-policy.mjs';
import {database,errorResponse,fault,requestJson} from '../../../lib/api-errors.mjs';
export async function POST(request:Request){
 const requestId=crypto.randomUUID();let release:(()=>void)|undefined;
 try{
  if(request.headers.get('origin')!==new URL(request.url).origin)throw fault('forbidden');
  const {games}=await requestJson(request,15000);
  if(!Array.isArray(games)||games.length>12||games.some(g=>!g||!Number.isSafeInteger(g.appid)||g.appid<=0||typeof g.name!=='string'||!g.name.trim()||g.name.length>250))throw fault('invalid_input');
  release=admit('features');const db=database(env.DB),freshness=freshnessTracker();
  const cached=await readGames(db,games.map(g=>g.appid));const found=new Set(cached.map(g=>g.appid));
  const needed=games.filter(g=>!found.has(g.appid));
  const fresh=needed.length?await enrich(needed,budgetFetch(14,sharedFetch(db,upstream.request,{onRead:freshness.record}))):{games:[],missing:[],warnings:[]};
  await saveGames(db,fresh.games);
  return Response.json({games:[...cached,...fresh.games],missing:fresh.missing,warnings:[...fresh.warnings||[],...freshness.result().warnings]},{headers:{'Cache-Control':'private, no-store','X-Request-ID':requestId}});
 }catch(e){return errorResponse(e,requestId)}finally{release?.()}
}
