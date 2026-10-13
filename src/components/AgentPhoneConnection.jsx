import React, {useEffect, useRef, useState} from 'react';
import {api} from '@/lib/apiClient';
import {clearActivePhoneConnection, createBrowserClient, setActivePhoneConnection} from '@/lib/telephony/browserClient';
import {Button} from '@/components/ui/button';
export default function AgentPhoneConnection({user}) {
  const client=useRef(null), audio=useRef(null), generation=useRef(0), heartbeat=useRef(null), currentUser=useRef(user);
  currentUser.current=user;
  const [status,setStatus]=useState('offline'), [incoming,setIncoming]=useState(null), [error,setError]=useState(null);
  const cleanup=()=>{generation.current++;clearInterval(heartbeat.current);heartbeat.current=null;clearActivePhoneConnection(client.current);client.current?.disconnect();client.current=null;};
  useEffect(()=>()=>cleanup(),[user?.id]);
  const receive=async call=>{
    try {
      if(!call.providerCallId) throw new Error('Waiting for verified incoming call identity.');
      const context=await api.getIncomingCallContext(currentUser.current,call.providerCallId);
      setIncoming({...call,context});
    } catch(e) {await Promise.resolve(call.reject()).catch(()=>{});setError(e.message);}
  };
  const connect=async()=>{
    cleanup();const current=++generation.current;setError(null);setStatus('connecting');
    try {
      const session=await api.telephonyAction(currentUser.current,'browser_session');
      const connection=await createBrowserClient(session,{audio:audio.current,onIncoming:receive,onState:value=>setStatus(['hangup','destroy','purge'].includes(value)?'connected':value),onError:()=>{cleanup();setError('Calling connection lost. Reconnect to receive calls.');setStatus('offline');}});
      if(current!==generation.current){connection.disconnect();return;}
      client.current=connection;await connection.connect();
      if(current!==generation.current){connection.disconnect();return;}
      setActivePhoneConnection(connection);setStatus('connected');
    } catch(e) {cleanup();setStatus('offline');setError(e.message);}
  };
  const available=async()=>{
    await api.telephonyAction(currentUser.current,'set_availability',{status:'available'});setStatus('available');
    clearInterval(heartbeat.current);
    heartbeat.current=setInterval(()=>{api.telephonyAction(currentUser.current,'set_availability',{status:'available'}).catch(e=>{cleanup();setIncoming(null);setStatus('offline');setError(e.message);});},30000);
  };
  const disconnect=async()=>{cleanup();setIncoming(null);setStatus('offline');await api.telephonyAction(currentUser.current,'set_availability',{status:'offline'});};
  const answer=async()=>{try{await api.getIncomingCallContext(currentUser.current,incoming.providerCallId);await incoming.accept();clearInterval(heartbeat.current);await api.telephonyAction(currentUser.current,'set_availability',{status:'after_call_work'});setIncoming(null);setStatus('busy');}catch(e){setError(e.message);}};
  return <div className="space-y-2"><audio ref={audio} autoPlay /><div className="flex flex-wrap items-center gap-2"><span className="text-sm capitalize">Calling: {status.replace(/_/g,' ')}</span><Button size="sm" variant="outline" disabled={status==='connecting'} onClick={()=>{(client.current?disconnect():connect()).catch(e=>setError(e.message));}}>{client.current?'Go offline':'Connect calling'}</Button>{client.current && status==='connected' && <Button size="sm" onClick={()=>available().catch(e=>setError(e.message))}>Make me available</Button>}{incoming && <><span className="text-sm">{incoming.context.clientName} · {incoming.context.caller}</span><Button size="sm" onClick={answer}>Answer incoming call</Button><Button size="sm" variant="outline" onClick={()=>{Promise.resolve(incoming.reject()).catch(e=>setError(e.message));setIncoming(null);}}>Decline</Button></>}</div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div>;
}
