import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {scopeValue,requestContext,scopedId,splitId} from '../src/api/workspaceScope.mjs';
import {normalizeEntityRow} from '../src/api/firebaseEntityContract.js';
test('identical contact ids in different clients stay distinct and recordings/actions route back to their client',()=>{
 const one=scopeValue({id:'same',leadId:'same',brandId:'brand',callId:'call'},'one');
 const two=scopeValue({id:'same',leadId:'same',brandId:'brand',callId:'call'},'two');
 assert.notEqual(one.id,two.id);assert.equal(requestContext({params:{callId:two.callId}},'one').tenantId,'two');
 assert.deepEqual(requestContext({recordId:two.id,data:{brandId:two.brandId,notes:'budget ~400K'}},'one'),{tenantId:'two',data:{recordId:'same',data:{brandId:'brand',notes:'budget ~400K'}}});
 assert.throws(()=>requestContext({leadId:one.id,brandId:two.brandId},'one'),/one client/);
 assert.throws(()=>requestContext({tenantId:'one',callId:two.callId},'one'),/do not match/);
});
test('dashboard and assignment brand filters keep correct composite relationships',()=>{
 const row=scopeValue(normalizeEntityRow('followUpTasks',{id:'task',tenantId:'two',brandId:'brand',leadId:'lead',callId:'call',status:'pending'}),'two');
 assert.equal(row.organization_id,'two');assert.equal(row.brand_id,scopedId('two','brand'));assert.equal(row.lead_id,scopedId('two','lead'));assert.equal(row.callId,scopedId('two','call'));
 assert.equal(splitId('not a scoped id'),null);
});
test('workspace adapter reads every authorized assignment, without a single selected organization',async()=>{
 const source=fs.readFileSync(new URL('../src/api/firebaseClient.js',import.meta.url),'utf8');
 const section=source.slice(source.indexOf('async function entityRows('),source.indexOf('async function invokeScoped('));
 const calls=[];const context={profile:{agentAssignments:[{tenantId:'one',tenantName:'One',role:'agent'},{tenantId:'two',tenantName:'Two',role:'agent'}]},ENTITY_COLLECTIONS:{Lead:'leads'},functions:{},normalizeEntityRow,scopeValue,httpsCallable:()=>async data=>{calls.push(data);return {data:{rows:[{id:'same',brandId:'brand',leadId:'same',status:'new'}]}}}};
 vm.runInNewContext(section+';globalThis.read=entityRows;',context);
 const all=await context.read('Lead',{},'',200);assert.equal(all.length,2);assert.deepEqual(calls.map(c=>c.tenantId),['one','two']);assert.notEqual(all[0].id,all[1].id);
 const filtered=await context.read('Lead',{organization_id:'two'},'',200);assert.equal(filtered.length,1);assert.equal(filtered[0].client_name,'Two');
});

test('qualification question ids and provider recording ids remain intact inside records',()=>{
 const result=scopeValue({id:'form',questions:[{id:'consent'}],recordings:[{id:'provider-uuid'}],rows:[{id:'contact'}]},'gcr');
 assert.equal(result.id,'gcr~form');assert.equal(result.questions[0].id,'consent');assert.equal(result.recordings[0].id,'provider-uuid');assert.equal(result.rows[0].id,'gcr~contact');
});
