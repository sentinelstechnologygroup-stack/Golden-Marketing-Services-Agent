import test from 'node:test';
import assert from 'node:assert/strict';
import {selectActiveAssignment} from '../src/api/assignmentSelection.mjs';
const assignments=[{tenantId:'internal',status:'active'},{tenantId:'gcr',status:'active',defaultWorkspace:true}];
test('fresh device and one-time migration choose assigned default instead of internal test workspace',()=>{assert.equal(selectActiveAssignment(assignments,null,false).selected.tenantId,'gcr');assert.equal(selectActiveAssignment(assignments,'internal',false).selected.tenantId,'gcr');});
test('later explicit client selections remain selected and inactive defaults cannot grant access',()=>{assert.equal(selectActiveAssignment(assignments,'internal',true).selected.tenantId,'internal');assert.equal(selectActiveAssignment([{...assignments[1],status:'revoked'},assignments[0]],null,false).selected.tenantId,'internal');});
