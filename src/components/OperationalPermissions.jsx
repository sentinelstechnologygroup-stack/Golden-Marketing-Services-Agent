import React, {useEffect, useState} from 'react';
import {api} from '@/lib/apiClient';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
export default function OperationalPermissions() {
  const [workspace,setWorkspace]=useState(null), [error,setError]=useState(null), [busy,setBusy]=useState(false);
  const [form,setForm]=useState({agentUid:'',tenantId:'',role:'agent',lineIds:[],capabilities:[]});
  const load=async()=>{setError(null);try{setWorkspace(await api.getOperationalPermissions());}catch(e){setError(e.message);}};
  useEffect(()=>{load();},[]);
  const save=async action=>{setBusy(true);setError(null);try{await api.setOperationalGrant({...form,action});await load();}catch(e){setError(e.message);}finally{setBusy(false);}};
  const toggle=(key,value)=>setForm(current=>({...current,[key]:current[key].includes(value)?current[key].filter(item=>item!==value):[...current[key],value]}));
  const lines=workspace?.lines?.filter(row=>row.tenantId===form.tenantId) || [];
  return <Card><CardHeader><CardTitle>Users &amp; Permissions</CardTitle></CardHeader><CardContent className="space-y-4">
    {error && <p role="alert">{error}</p>}<Button variant="outline" onClick={load}>Refresh permissions</Button>
    <label className="block">Agent user ID<Input value={form.agentUid} onChange={e=>setForm({...form,agentUid:e.target.value})} /></label>
    <label className="block">Client<select className="block rounded border p-2 w-full" value={form.tenantId} onChange={e=>setForm({...form,tenantId:e.target.value,lineIds:[]})}><option value="">Choose client</option>{workspace?.clients?.map(client=><option key={client.tenantId} value={client.tenantId}>{client.name}</option>)}</select></label>
    <label className="block">Role<select className="block rounded border p-2" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>{['agent','supervisor','admin','auditor'].map(role=><option key={role}>{role}</option>)}</select></label>
    <fieldset className="space-y-2"><legend>Authorized phone lines</legend>{lines.map(row=><label className="block" key={row.lineId}><input type="checkbox" checked={form.lineIds.includes(row.lineId)} onChange={()=>toggle('lineIds',row.lineId)} /> {row.phoneNumber}</label>)}</fieldset>
    <fieldset className="space-y-2"><legend>Operational privileges</legend>{[['read_communications','Read calls, voicemail and callbacks'],['call','Register phone and place calls'],['can_answer_calls','Receive calls']].map(([value,label])=><label className="block" key={value}><input type="checkbox" checked={form.capabilities.includes(value)} onChange={()=>toggle('capabilities',value)} /> {label}</label>)}</fieldset>
    <div className="flex gap-2"><Button disabled={busy || !form.agentUid || !form.tenantId} onClick={()=>save('set')}>Save assignment</Button><Button variant="outline" disabled={busy || !form.agentUid || !form.tenantId} onClick={()=>save('revoke')}>Revoke assignment</Button></div>
    {workspace?.items.map(user=><div key={user.uid} className="border rounded p-3"><p>{user.displayName || user.email || user.uid}</p>{user.assignments.map(grant=><button key={grant.tenantId} className="block text-left text-sm underline" onClick={()=>setForm({agentUid:user.uid,tenantId:grant.tenantId,role:grant.role,lineIds:grant.lineIds,capabilities:grant.capabilities})}>{grant.tenantId}: {grant.status} · {grant.capabilities.join(', ') || 'No phone privileges'}</button>)}</div>)}
  </CardContent></Card>;
}
