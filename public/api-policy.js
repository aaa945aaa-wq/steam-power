// Browser guard is best effort; D1 quota remains authoritative.
let active=false;const cooldowns=new Map();
const makeError=(code,message,retryAfter=0,retryable=true,requestId=null)=>Object.assign(Error(message),{code,retryAfter,retryable,requestId});
export function retrySeconds(raw,now=Date.now()){
 if(raw===null||raw===undefined||raw==='')return 0;
 const n=Number(raw);return Math.max(0,Math.ceil(Number.isFinite(n)?n:(Date.parse(raw)-now)/1000)||0);
}
export function cooldownUntil(url){let stored=0;try{stored=Number(localStorage.getItem('steam-power-api:'+url))||0}catch{}return Math.max(cooldowns.get(url)||0,stored);}
function hold(url,seconds){const until=Math.max(cooldownUntil(url),Date.now()+seconds*1000);cooldowns.set(url,until);try{localStorage.setItem('steam-power-api:'+url,String(until))}catch{}}
export async function apiFetch(url,options){
 const until=cooldownUntil(url);
 if(active)throw makeError('busy','上一筆查詢尚未完成，請稍候。',2);
 if(until>Date.now())throw makeError('rate_limit','查詢冷卻中，請等待倒數結束。',Math.ceil((until-Date.now())/1000));
 active=true;hold(url,url==='/api/features'?10:60);
 try{const r=await fetch(url,options);if(r.status===429||r.status===503)hold(url,retrySeconds(r.headers.get('Retry-After'))||60);return r}
 catch(e){if(e.name==='TimeoutError'||e.name==='AbortError')throw makeError('timeout','查詢逾時，請稍後重試。',60);throw makeError('network',globalThis.navigator?.onLine===false?'目前沒有網路連線，請連線後重試。':'無法連線到本站，請檢查網路後重試。',10)}finally{active=false}
}
export async function apiJson(url,options){
 const r=await apiFetch(url,options);let data;
 try{data=await r.json()}catch{throw makeError('format','本站回應格式異常，請稍後重試。',60,true,r.headers.get('X-Request-ID'))}
 if(!r.ok||data?.error){
  const messages={updating:'資料正在準備中，請稍後再試；目前進度已保留。',interrupted:'先前資料更新中斷，請稍後再試。',database:'本站資料服務暫時無法使用，請稍後重試。',rate_limit:'查詢暫時達到頻率上限，請等待倒數結束。',timeout:'Steam 回應逾時，請稍後重試。',network:'暫時無法連線到 Steam，請稍後重試。',format:'Steam 回傳資料格式異常，請稍後重試。',http:'Steam 暫時無法完成查詢，請稍後重試。',invalid_input:'資料格式不正確，請回到遊戲庫檢查。',payload_too_large:'資料量過大，請縮小內容後再試。',forbidden:'請回到網站重新操作。',internal:'本站暫時無法完成查詢，請稍後重試。'};
  const code=messages[data?.code]?data.code:'internal',retryable=![400,403,413].includes(r.status)&&data?.retryable!==false;
  const seconds=Math.max(retrySeconds(r.headers.get('Retry-After')),Number.isFinite(data?.retryAfter)?data.retryAfter:0);
  if(retryable&&seconds)hold(url,seconds);
  throw makeError(code,messages[code],retryable?seconds:0,retryable,data?.requestId||r.headers.get('X-Request-ID'));
 }
 if(!data||typeof data!=='object'||(url==='/api/features'?!Array.isArray(data.games)||!Array.isArray(data.missing):!['success','needs_feedback'].includes(data.status)||(data.status==='success'&&!Array.isArray(data.games))))throw makeError('format','本站回應內容不完整，請稍後重試。',60);
 return data;
}
export function retryDeadline(error,url,now=Date.now()){return Math.max(now+Math.max(0,error.retryAfter||0)*1000,cooldownUntil(url));}
