export function fault(code, retryAfter=0){return Object.assign(new Error(code),{code,retryAfter});}
const definitions={
 invalid_input:[400,'資料格式不正確，請檢查匯入內容或回到遊戲庫調整。',false],
 payload_too_large:[413,'資料量過大，請縮小匯入內容後再試。',false],
 forbidden:[403,'無法確認請求來源，請回到網站重新操作。',false],
 database:[503,'本站資料服務暫時無法使用，請稍後重試。',true],
 updating:[503,'資料正在準備中，請稍後再試；目前進度已保留。',true],
 interrupted:[503,'先前資料更新中斷，請稍後再試。',true],
 rate_limit:[429,'查詢暫時達到頻率上限，請等待倒數結束後重試。',true],
 timeout:[504,'Steam 回應逾時，請稍後重試。',true],
 network:[502,'暫時無法連線到 Steam，請稍後重試。',true],
 format:[502,'Steam 回傳的資料格式異常，請稍後重試。',true],
 http:[502,'Steam 服務暫時無法完成查詢，請稍後重試。',true],
 internal:[500,'本站暫時無法完成查詢，請稍後重試。',true]
};
export function errorResponse(error,requestId){
 const code=definitions[error?.code]?error.code:'internal';const [status,message,retryable]=definitions[code];
 const retryAfter=retryable?Math.max(1,Math.ceil(Number.isFinite(error?.retryAfter)&&error.retryAfter>0?error.retryAfter:60)):0;
 const headers={'Cache-Control':'private, no-store','X-Request-ID':requestId};
 if(retryAfter)headers['Retry-After']=String(retryAfter);
 // Never log payloads, identifiers, URLs, SQL, raw exceptions or secrets.
 console.error('api_failure',JSON.stringify({code,status,requestId}));
 return Response.json({error:message,code,retryable,retryAfter,requestId},{status,headers});
}
export async function requestJson(request,maxBytes){
 const reader=request.body?.getReader();if(!reader)throw fault('invalid_input');
 const chunks=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw fault('payload_too_large')}chunks.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
 let value;try{value=JSON.parse(new TextDecoder().decode(bytes))}catch{throw fault('invalid_input')}
 if(!value||typeof value!=='object'||Array.isArray(value))throw fault('invalid_input');return value;
}
// Wrap only D1 calls; preserve failures originating from the actual upstream.
export function database(db){
 if(!db)throw fault('database');
 const wrap=fn=>async(...args)=>{try{return await fn(...args)}catch{throw fault('database')}};
 return {prepare(sql){let statement;try{statement=db.prepare(sql)}catch{throw fault('database')}
  return {bind(...args){let bound;try{bound=statement.bind(...args)}catch{throw fault('database')}
   return {_bound:bound,first:wrap(()=>bound.first()),all:wrap(()=>bound.all()),run:wrap(()=>bound.run())};}}},
  batch:wrap(statements=>db.batch(statements.map(x=>x._bound)))};
}
