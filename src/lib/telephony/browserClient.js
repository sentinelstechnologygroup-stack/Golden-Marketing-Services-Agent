import { prepareRingback } from './ringback';
let activeConnection = null;
let outboundSetupUntil = 0;
export function expectOutboundSetup() { outboundSetupUntil = Date.now() + 30000; prepareRingback(); }
export function clearOutboundSetup() { outboundSetupUntil = 0; }

export function setActivePhoneConnection(connection) { activeConnection = connection; }
export function clearActivePhoneConnection(connection) { if (!connection || activeConnection === connection) activeConnection = null; }
export function placeBrowserCall(options) {
  if (!activeConnection?.placeCall) throw new Error('Connect calling before placing a call.');
  return activeConnection.placeCall(options);
}

// One provider is instantiated per authenticated agent session. Tokens stay in
// memory; provider account credentials never enter the frontend.
export async function createBrowserClient(session, {onIncoming, onState, onError, audio}) {
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
        outboundSetup: isOutboundSetup(call),
        accept: () => call.answer(), reject: () => call.hangup(),
        end: () => call.hangup(), mute: value => value ? call.muteAudio() : call.unmuteAudio(),
      });
      if (['hangup', 'destroy', 'purge'].includes(call.state)) { onIncoming(null); clearOutboundSetup(); onState('available'); }
      else onState(call.state || 'available');
    });
    return {connect: () => new Promise((resolve,reject) => {
      const timer=setTimeout(()=>reject(new Error('Agent calling connection timed out.')),15000);
      client.on('telnyx.ready',()=>{clearTimeout(timer);onState('available');resolve();});
      client.on('telnyx.error',error=>{clearTimeout(timer);reject(error);});
      client.connect();
    }), disconnect: () => client.disconnect(), placeCall: ({to, from, clientState, onUpdate}) => {
      void to; void from; void clientState; void onUpdate;
      throw new Error('Outbound calls must be started by the CRM backend.');
    }};
  }
  throw new Error('Calling is not configured.');
}

function isOutboundSetup(call) {
  try {
    const state = JSON.parse(atob(call.options?.clientState || ''));
    if (state.gmsCallId) return state.legRole === 'agent';
  } catch { /* Some SDK notifications omit client state. */ }
  return Date.now() < outboundSetupUntil;
}
