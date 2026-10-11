import test from 'node:test';import assert from 'node:assert/strict';import {computeQualificationStatus as status} from '../src/lib/qualificationStatus.js';
test('draft, zero-score and unapproved rubrics never qualify',()=>{
 assert.equal(status({status:'draft',questions:[],qualification_threshold:0},{}),'pending');
 assert.equal(status({status:'approved',questions:[{id:'a',score_weight:0}],qualification_threshold:0},{a:'yes'}),'pending');
 assert.equal(status({status:'active',scoringStatus:'pending_broker_approval',questions:[{id:'a',score_weight:100}],qualification_threshold:70},{a:'yes'}),'pending');
});
test('approved scoring requires required answers and passing score',()=>{
 const f={status:'approved',questions:[{id:'a',required:true,score_weight:100}],qualification_threshold:70};
 assert.equal(status(f,{}),'in_progress');assert.equal(status(f,{a:'no'}),'unqualified');assert.equal(status(f,{a:'yes'}),'qualified');
});
