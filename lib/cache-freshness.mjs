// Per-request evidence only; never persists player identities or preferences.
export function freshnessTracker(){
 const sources=new Map();let validUntil=Infinity;
 return {
  record(info){validUntil=Math.min(validUntil,info.validUntil);if(info.stale){const old=sources.get(info.kind);sources.set(info.kind,Math.min(old??Infinity,info.fetchedAt));}},
  result(){const names={search:'搜尋資料',reviews:'評論總量'};return {cacheUntil:Math.min(Date.now()+60000,validUntil),staleSources:[...sources].map(([kind,fetchedAt])=>({kind,fetchedAt})),warnings:[...sources].map(([kind,time])=>`${names[kind]||'部分資料'}暫用先前版本（取得時間：${new Date(time).toISOString()}）；更新中或暫不可用，稍後查詢會再嘗試更新。`)};}
 };
}
