let activeConnection = null;

export function setActivePhoneConnection(connection) { activeConnection = connection; }
export function clearActivePhoneConnection(connection) { if (!connection || activeConnection === connection) activeConnection = null; }
export function placeBrowserCall(options) {
  if (!activeConnection?.placeCall) throw new Error('Connect calling before placing a call.');
  return activeConnection.placeCall(options);
}

// One provider is instantiated per authenticated agent session. Tokens stay in
// memory; provider account credentials never enter the frontend.
export async function createBrowserClient(session, {onIncoming, onState, onError, audio}) {
  if (session.provider === 'twilio') {
    const {Device} = await import('@twilio/voice-sdk');
    const client = new Device(session.token);
    client.on('error', onError);
    client.on('incoming', call => onIncoming({
      accept: () => call.accept(), reject: () => call.reject(),
      end: () => call.disconnect(), mute: value => call.mute(value),
    }));
    client.on('registered', () => onState('available'));
    client.on('unregistered', () => onState('offline'));
    return {connect: () => client.register(), disconnect: () => client.destroy()};
  }
  if (session.provider === 'telnyx') {
    const {TelnyxRTC} = await import('@telnyx/webrtc');
    const client = new TelnyxRTC({login_token: session.token});
    const updates = new Map();
    client.remoteElement = audio;
    client.on('telnyx.error', onError);
    client.on('telnyx.notification', notification => {
      if (notification.type !== 'callUpdate') return;
      const call = notification.call;
      updates.get(call.id)?.(call);
      if (call.state === 'ringing' && call.direction === 'inbound') onIncoming({
        accept: () => call.answer(), reject: () => call.hangup(),
        end: () => call.hangup(), mute: value => value ? call.muteAudio() : call.unmuteAudio(),
      });
      onState(call.state);
    });
    return {connect: () => new Promise((resolve,reject) => {
      const timer=setTimeout(()=>reject(new Error('Agent calling connection timed out.')),15000);
      client.on('telnyx.ready',()=>{clearTimeout(timer);onState('available');resolve();});
      client.on('telnyx.error',error=>{clearTimeout(timer);reject(error);});
      client.connect();
    }), disconnect: () => client.disconnect(), placeCall: ({to, from, clientState, onUpdate}) => {
      const call = client.newCall({destinationNumber: to, callerNumber: from, clientState, remoteElement: audio});
      const report = value => {
        onUpdate?.({state:value.state,browserCallId:value.id,providerCallId:value.telnyxCallControlId || null,providerSessionId:value.telnyxSessionId || null,providerLegId:value.telnyxLegId || null});
        if (['hangup','destroy','purge'].includes(value.state)) updates.delete(value.id);
      };
      updates.set(call.id, report); report(call);
      return {id: call.id, end: () => call.hangup(), hold: value => value ? call.hold() : call.unhold()};
    }};
  }
  if (session.provider === 'signalwire') {
    const {SignalWire, StaticCredentialProvider} = await import('@signalwire/js');
    const client = new SignalWire(new StaticCredentialProvider({token:session.token}));
    return {
      connect: async () => {
        await client.connect();
        await client.register();
        client.session.incomingCalls$.subscribe(calls => {
          const call=calls.find(value=>value.status==='ringing');
          if (!call) {onIncoming(null);return;}
          onIncoming({
            accept: () => {
              call.remoteStream$.subscribe(stream=>{if(stream) audio.srcObject=stream;});
              call.status$.subscribe(onState);
              return call.answer({audio:true,video:false});
            },
            reject: () => call.reject(),
            end: () => call.hangup(),
          });
        });
        onState('available');
      },
      disconnect: () => client.disconnect(),
    };
  }
  throw new Error('Calling is not configured.');
}
