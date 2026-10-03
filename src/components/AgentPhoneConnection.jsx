import React, {useEffect, useRef, useState} from 'react';
import {api} from '@/lib/apiClient';
import {clearActivePhoneConnection, createBrowserClient, setActivePhoneConnection} from '@/lib/telephony/browserClient';
import {Button} from '@/components/ui/button';
export default function AgentPhoneConnection({user}) {
  const client=useRef(null), audio=useRef(null), generation=useRef(0);
  const [status,setStatus]=useState('offline'), [incoming,setIncoming]=useState(null), [error,setError]=useState(null);
  useEffect(()=>()=>{generation.current++;clearActivePhoneConnection(client.current);client.current?.disconnect();client.current=null;},[user]);
  const connect=async()=>{
    const current=++generation.current; setError(null);setStatus('connecting');
    try {
      const session=await api.telephonyAction(user,'browser_session');
      const connection=await createBrowserClient(session,{audio:audio.current,onIncoming:setIncoming,onState:setStatus,onError:()=>{setError('Calling connection lost. Reconnect to receive calls.');setStatus('offline');}});
      if(current!==generation.current){connection.disconnect();return;}
      client.current=connection;await connection.connect();setActivePhoneConnection(connection);
      await api.telephonyAction(user,'set_availability',{status:'available'});
    } catch(e) {client.current?.disconnect();client.current=null;setStatus('offline');setError(e.message);}
  };
  const disconnect=async()=>{generation.current++;clearActivePhoneConnection(client.current);client.current?.disconnect();client.current=null;setIncoming(null);setStatus('offline');await api.telephonyAction(user,'set_availability',{status:'offline'});};
  const answer=async()=>{try{await incoming.accept();setIncoming(null);setStatus('busy');}catch(e){setError(e.message);}};
  return <div className="space-y-2"><audio ref={audio} autoPlay /><div className="flex flex-wrap items-center gap-2"><span className="text-sm capitalize">Calling: {status.replace(/_/g,' ')}</span><Button size="sm" variant="outline" disabled={status==='connecting'} onClick={()=>{(client.current?disconnect():connect()).catch(e=>setError(e.message));}}>{client.current?'Go offline':'Connect calling'}</Button>{incoming && <><Button size="sm" onClick={answer}>Answer incoming call</Button><Button size="sm" variant="outline" onClick={()=>{Promise.resolve(incoming.reject()).catch(e=>setError(e.message));setIncoming(null);}}>Decline</Button></>}</div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div>;
}
