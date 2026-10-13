import React, {useEffect, useRef, useState} from 'react';
import {api} from '@/lib/apiClient';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
export default function CommunicationsQueue({user}) {
  const [kind,setKind]=useState('voicemail'), [result,setResult]=useState(null), [error,setError]=useState(null), [busy,setBusy]=useState(false), [media,setMedia]=useState(null);
  const mediaUrl=useRef(null), generation=useRef(0);
  const discardMedia=()=>{if(mediaUrl.current) URL.revokeObjectURL(mediaUrl.current);mediaUrl.current=null;setMedia(null);};
  const load=async(cursor)=>{
    const current=++generation.current;setBusy(true);setError(null);discardMedia();setResult(null);
    try {const next=await api.getCommunicationsQueue(user,{kind,...(cursor?{cursor}:{})});if(current===generation.current)setResult(next);}
    catch(e){if(current===generation.current)setError(e);}
    finally{if(current===generation.current)setBusy(false);}
  };
  useEffect(()=>{load();const timer=setInterval(()=>load(),30000);return()=>{generation.current++;clearInterval(timer);if(mediaUrl.current)URL.revokeObjectURL(mediaUrl.current);};},[kind,user?.id]);
  const transition=async(row,state)=>{
    try {await api.updateCommunicationsQueue(user,{tenantId:row.tenantId,recordId:row.id,kind,state,operationId:crypto.randomUUID()});await load();}
    catch(e){setError(e);}
  };
  const play=async row=>{
    const current=generation.current;
    try {discardMedia();const audio=await api.getCommunicationMedia(user,{tenantId:row.tenantId,recordId:row.id,kind});
      if(current!==generation.current)return;
      const bytes=Uint8Array.from(atob(audio.contentBase64),char=>char.charCodeAt(0));
      mediaUrl.current=URL.createObjectURL(new Blob([bytes],{type:audio.contentType}));setMedia(mediaUrl.current);
    }catch(e){discardMedia();setError(e);}
  };
  return <Card><CardHeader><CardTitle>Calls, voicemail and callbacks</CardTitle></CardHeader><CardContent className="space-y-3">
    <div className="flex flex-wrap gap-2">{['voicemail','callbacks','calls'].map(value=><Button key={value} variant={kind===value?'default':'outline'} onClick={()=>setKind(value)}>{value}</Button>)}<Button variant="outline" disabled={busy} onClick={()=>load()}>Refresh</Button></div>
    {busy && <p role="status">Loading authorized queue…</p>}{error && <p role="alert">{error.status===403?'Your permissions do not allow this queue.':error.status===401?'Sign in to access this queue.':error.message}</p>}
    {result?.count===0 && !busy && !error && <p>No {kind} are waiting.</p>}
    {result?.items.map(row=><div key={`${row.tenantId}/${row.id}`} className="rounded border p-3 space-y-2"><p className="font-medium">{row.clientName} · {row.caller || 'Caller unavailable'}</p><p className="text-sm">Line {row.lineId || 'unassigned'} · {row.status} · {row.followUpState}</p><div className="flex gap-2 flex-wrap">{row.hasMedia && <Button size="sm" onClick={()=>play(row)}>Play recording</Button>}{kind==='voicemail' && <Button size="sm" variant="outline" onClick={()=>transition(row,'heard')}>Mark heard</Button>}<Button size="sm" variant="outline" onClick={()=>transition(row,'callback_pending')}>Callback pending</Button><Button size="sm" variant="outline" onClick={()=>transition(row,'closed')}>Close</Button></div></div>)}
    {media && <audio controls src={media} />}{result?.cursor && <Button variant="outline" onClick={()=>load(result.cursor)}>Next page</Button>}
  </CardContent></Card>;
}
