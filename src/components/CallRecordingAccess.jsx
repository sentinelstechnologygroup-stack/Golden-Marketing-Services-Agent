import React, {useState} from 'react';
import {firebaseClient} from '@/api/firebaseClient';
import {Button} from '@/components/ui/button';
export default function CallRecordingAccess({callId}) {
 const [recordings,setRecordings]=useState(null),[error,setError]=useState(null),[busy,setBusy]=useState(false),[audioUrl,setAudioUrl]=useState(null);
 const load=async()=>{setBusy(true);setError(null);try{const result=await firebaseClient.functions.invoke('getGmsCallEvidence',{callId});setRecordings(result.recordings || []);}catch(e){setError(e.message);}finally{setBusy(false);}};
 const access=async(recordingId,play)=>{setBusy(true);setError(null);try{const result=await firebaseClient.functions.invoke('getGmsCallRecordingDownload',{callId,recordingId});if(play)setAudioUrl(result.url);else window.open(result.url,'_blank','noopener,noreferrer');}catch(e){setError(e.message);}finally{setBusy(false);}};
 return <div className="space-y-2"><Button size="sm" variant="outline" disabled={busy} onClick={load}>View recordings</Button>{recordings?.length===0 && <p className="text-xs">No archived recording is available yet. This call may have been unrecorded.</p>}{recordings?.map(r=><div key={r.id} className="flex gap-2"><Button size="sm" disabled={busy} onClick={()=>access(r.id,true)}>Play recording</Button><Button size="sm" variant="outline" disabled={busy} onClick={()=>access(r.id,false)}>Download</Button></div>)}{audioUrl && <audio controls autoPlay src={audioUrl} className="w-full" onError={()=>setError('Playback failed or the private link expired. Select Play recording to try again.')} />}{error && <p role="alert" className="text-destructive text-xs">{error}</p>}</div>;
}
