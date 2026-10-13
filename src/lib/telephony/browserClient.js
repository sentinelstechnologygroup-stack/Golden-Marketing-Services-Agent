let activeConnection = null;

export function setActivePhoneConnection(connection) { activeConnection = connection; }
export function clearActivePhoneConnection(connection) { if (!connection || activeConnection === connection) activeConnection = null; }
export function placeBrowserCall(options) {
  if (!activeConnection?.placeCall) throw new Error('Connect calling before placing a call.');
  return activeConnection.placeCall(options);
}

// One provider is instantiated per authenticated agent session. Tokens stay in
// memory; provider account credentials never enter the frontend.
export async function createBrowserClient(session, {onIncoming, onState, onError, audio}, loadProvider = () => import('@telnyx/webrtc')) {
  if (session.provider === 'telnyx') {
    const {TelnyxRTC} = await loadProvider();
    const client = new TelnyxRTC({login_token: session.token});
    const updates = new Map();
    client.remoteElement = audio;
    client.on('telnyx.error', onError);
    client.on('telnyx.notification', notification => {
      if (notification.type !== 'callUpdate') return;
      const call = notification.call;
      updates.get(call.id)?.(call);
      if (call.state === 'ringing' && call.direction === 'inbound') onIncoming({
        providerCallId: call.telnyxIDs?.telnyxCallControlId || call.options?.telnyxCallControlId || null,
        accept: () => call.answer(), reject: () => call.hangup(),
        end: () => call.hangup(), mute: value => value ? call.muteAudio() : call.unmuteAudio(),
      });
      onState(call.state);
    });
    return {connect: () => new Promise((resolve,reject) => {
      const timer=setTimeout(()=>reject(new Error('Agent calling connection timed out.')),15000);
      client.on('telnyx.ready',()=>{clearTimeout(timer);onState('connected');resolve();});
      client.on('telnyx.error',error=>{clearTimeout(timer);reject(error);});
      client.connect();
    }), disconnect: () => client.disconnect(), placeCall: ({to, from, clientState, onUpdate}) => {
      const call = client.newCall({destinationNumber: to, callerNumber: from, clientState, remoteElement: audio});
      const report = value => {
        onUpdate?.({state:value.state,browserCallId:value.id,providerCallId:value.telnyxIDs?.telnyxCallControlId || value.options?.telnyxCallControlId || null,providerSessionId:value.telnyxIDs?.telnyxSessionId || null,providerLegId:value.telnyxIDs?.telnyxLegId || null});
        if (['hangup','destroy','purge'].includes(value.state)) updates.delete(value.id);
      };
      updates.set(call.id, report); report(call);
      return {id: call.id, end: () => call.hangup(), hold: value => value ? call.hold() : call.unhold()};
    }};
  }
  throw new Error('Calling is not configured.');
}
