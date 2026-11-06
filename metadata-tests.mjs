import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeCatalog} from './public/metadata.js';
import {asMetadata,normalizeSearchTerm} from './lib/steam-metadata.mjs';
const now=1800000000000;
const old={appid:1,name:'Game',facets:{genres:['rpg'],mechanics:['loot','build'],conditions:['action'],presentation:['fantasy']}};
test('new metadata corrects old facets instead of accumulating them and preserves missing fields',()=>{
 const g=mergeCatalog([old],[{appid:1,name:'Game',facets:{mechanics:['strategy']},checkedAt:now}],now)[0];
 assert.deepEqual(g.facets.mechanics,['strategy']);assert.deepEqual(g.facets.conditions,['action']);assert.deepEqual(g.facets.presentation,['fantasy']);
 const removed=mergeCatalog([g],[{appid:1,name:'Game',facets:{mechanics:[],conditions:[],presentation:[]},checkedAt:now}],now)[0];
 assert.deepEqual(removed.facets,{genres:['rpg'],mechanics:[],conditions:[],presentation:[]});
});
test('stale, expired, future and out-of-order metadata cannot overwrite valid classifications',()=>{
 for(const checkedAt of [now-86400000,now+1,undefined])assert.deepEqual(mergeCatalog([old],[{...old,stale:true,checkedAt}],now),[old]);
 assert.deepEqual(mergeCatalog([old],[{...old,featureStatus:'steam-tags',checkedAt:now-7*86400000}],now),[old]);
 const fresh={...old,checkedAt:now};assert.deepEqual(mergeCatalog([fresh],[{...old,checkedAt:now-1}],now),[fresh]);
 const stale=mergeCatalog([old],[{...old,stale:true,checkedAt:now-1000}],now)[0];assert.equal(stale.stale,true);assert.equal(stale.checkedAt,now-1000);
});
test('client metadata cannot inject trusted completion times; malformed facets are ignored',()=>{
 const g=mergeCatalog([old],[{...old,completionBaseline:{minutes:10,status:'verified'},facets:{mechanics:'bad',presentation:null}}],now)[0];
 assert.equal(g.completionBaseline,undefined);assert.deepEqual(g.facets,old.facets);
});
test('conditions remain separate and legacy cached condition tags migrate without duplicates',()=>{
 const g=asMetadata({appid:1,name:'x',tagIds:[1,2,3]},{1:'action',2:'strategy',3:'turn'});
 assert.deepEqual(g.facets.mechanics,['strategy']);assert.deepEqual(g.facets.conditions,['action','turn']);
 const m=mergeCatalog([],[{appid:1,name:'x',facets:{mechanics:['strategy','action'],conditions:['action']}}],now)[0];
 assert.deepEqual(m.facets.conditions,['action']);assert.equal(normalizeSearchTerm('Game™   II®'),'Game II');
});
