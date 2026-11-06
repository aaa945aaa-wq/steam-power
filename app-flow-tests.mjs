// Unit harness for actual app handlers; not a browser/layout verification.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as taxonomy from './public/taxonomy.js';
import * as engine from './public/engine.js';
import * as signals from './public/signals.js';
import * as attraction from './public/attraction.js';
import {mergeCatalog} from './public/metadata.js';
const source=readFileSync(new URL('./public/app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').split("document.querySelectorAll('[data-nav]').forEach(b=>b.onclick")[0];
function harness(saved={}){
 const storage=new Map(Object.entries(saved)),nodes=new Map();let exported;
 function node(selector){if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',style:{},classList:{toggle(){}},remove(){nodes.delete(selector);}});return nodes.get(selector);}
 const document={querySelector:s=>s==='#storage-warning'?(nodes.get(s)||null):node(s),querySelectorAll(selector){
  const html=node('#reasons').innerHTML;
  const items=[...html.matchAll(/<button\b([^>]*)>/g)].map(([,attrs])=>({dataset:Object.fromEntries([...attrs.matchAll(/data-([\w-]+)="([^"]*)"/g)].map(([,k,v])=>[k,v]))}));
  if(selector==='[data-module]')return items.filter(x=>x.dataset.module);
  const field=selector.match(/data-field="(\w+)"/);return field?items.filter(x=>x.dataset.field===field[1]):[];
 },createElement:()=>({click(){},setAttribute(){},style:{}}),body:{prepend(el){nodes.set('#storage-warning',el);}}};
 const ctx=vm.createContext({...taxonomy,...engine,...signals,...attraction,mergeCatalog,document,Blob,structuredClone,
  URL:{createObjectURL(blob){exported=blob;return 'blob:test';},revokeObjectURL(){}},
  setTimeout(){},confirm:()=>true,window:{scrollTo(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}});
 vm.runInContext(source,ctx);vm.runInContext('render=()=>{}',ctx);
 return {run:code=>vm.runInContext(code,ctx),ctx,node,document,storage,exported:()=>exported};
}
test('reason menu remains usable without mismatch, accepts three reasons and retains category feedback',()=>{
 const h=harness();h.run("current={appid:1,name:'Unknown'};draft={rating:'neutral',categories:[],reasons:[],price:[]};reasons()");
 assert.match(h.node('#reasons').innerHTML,/data-module/);assert.doesNotMatch(h.node('#reasons').innerHTML,/有一點出乎預期/);
 function chooseModule(id){h.document.querySelectorAll('[data-module]');h.run(`activeModule='${id}';reasons()`);}
 function clickReason(key){const captured=[];const original=h.document.querySelectorAll;h.document.querySelectorAll=s=>{const xs=original(s);captured.push(...xs);return xs;};h.run('reasons()');h.document.querySelectorAll=original;captured.find(x=>x.dataset.field==='reasons'&&x.dataset.key===key).onclick();}
 chooseModule('operation');clickReason('actionGood');chooseModule('configuration');clickReason('build');chooseModule('decision');clickReason('strategy');chooseModule('presentation');clickReason('story');
 assert.equal(h.run('draft.reasons.length'),3);assert.match(h.node('#toast').textContent,/最多選擇 3/);
 h.run("draft.rating='regret';draft.categories=['price'];reasons()");assert.match(h.node('#reasons').innerHTML,/data-key="price"/);
 h.run('commit()');const state=JSON.parse(h.storage.get('steam-power-v1'));assert.deepEqual(state.answers[1].categories,['price']);assert.equal(state.answers[1].reasons.length,3);
});
test('old progress survives import/export/reload and broken JSON cannot overwrite it',async()=>{
 const h=harness();const backup={kind:'steam-power-backup',version:5,library:[{appid:1,name:'Game',minutes:20}],answers:{1:{rating:'regret',categories:['price'],reasons:['pace'],price:['base'],taxonomyVersion:3}},feedback:{8:{choice:'interested',features:['story']}},threshold:8};
 h.ctx.input=JSON.stringify(backup);await h.run('importText(input)');
 h.run('exportData()');const exported=JSON.parse(await h.exported().text());
 assert.deepEqual(exported.library,backup.library);assert.deepEqual(exported.feedback,backup.feedback);assert.deepEqual(exported.answers[1].reasons,['pace']);assert.deepEqual(exported.answers[1].categories,['price']);assert.equal(exported.threshold,8);
 const before=h.storage.get('steam-power-v1');await h.run("importText('{')");assert.equal(h.storage.get('steam-power-v1'),before);
 const reloaded=harness({'steam-power-v1':before});assert.equal(reloaded.run('state.answers[1].rating'),'regret');assert.equal(reloaded.run('state.feedback[8].choice'),'interested');
 h.ctx.localStorage.setItem=()=>{throw Error('quota');};assert.equal(h.run('save()'),false);assert.match(h.node('#storage-warning').innerHTML,/無法保存/);assert.match(h.node('#storage-warning').innerHTML,/匯出進度/);
});
