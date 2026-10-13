import test from 'node:test';
import assert from 'node:assert/strict';
import {createBrowserClient} from '../src/lib/telephony/browserClient.js';
test('one Telnyx client identifies incoming calls using SDK telnyxIDs and connects without declaring availability',async()=>{
  let instance, incoming, state;
  class TelnyxRTC {
    constructor(options){this.options=options;this.events={};instance=this;}
    on(name,fn){this.events[name]=fn;}
    connect(){this.events['telnyx.ready']();}
    disconnect(){}
  }
  const phone=await createBrowserClient({provider:'telnyx',identity:'gms_agent',token:'test-token'}, {onIncoming:call=>{incoming=call;},onState:value=>{state=value;},onError:()=>{},audio:null},async()=>({TelnyxRTC}));
  await phone.connect();assert.equal(state,'connected');assert.equal(instance.options.login_token,'test-token');
  instance.events['telnyx.notification']({type:'callUpdate',call:{id:'browser-leg',state:'ringing',direction:'inbound',telnyxIDs:{telnyxCallControlId:'verified-leg'},answer:()=>{},hangup:()=>{}}});
  assert.equal(incoming.providerCallId,'verified-leg');
});
