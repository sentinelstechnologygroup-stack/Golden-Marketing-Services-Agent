import React, {useState} from 'react';
import {firebaseClient} from '@/api/firebaseClient';
import {Button} from '@/components/ui/button';
export default function CallRecordingAccess({callId}) {
  const [recordings,setRecordings]=useState(null),[error,setError]=useState(null),[busy,setBusy]=useState(false);
  const load=async()=>{setBusy(true);setError(null);try{const result=await firebaseClient.functions.invoke('getGmsCallEvidence',{callId});setRecordings(result.recordings || []);}catch(e){setError(e.message);}finally{setBusy(false);}};
  const download=async recordingId=>{setBusy(true);setError(null);try{const result=await firebaseClient.functions.invoke('getGmsCallRecordingDownload',{callId,recordingId});window.open(result.url,'_blank','noopener,noreferrer');}catch(e){setError(e.message);}finally{setBusy(false);}};
  return <div className="space-y-2"><Button size="sm" variant="outline" disabled={busy} onClick={load}>View recordings</Button>{recordings?.length===0 && <p className="text-xs">No archived recording is available yet. This call may have been unrecorded.</p>}{recordings?.map(r=><Button key={r.id} size="sm" disabled={busy} onClick={()=>download(r.id)}>Download private recording</Button>)}{error && <p role="alert" className="text-destructive text-xs">{error}</p>}</div>;
}
