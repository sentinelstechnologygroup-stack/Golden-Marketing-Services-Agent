import LeadDetail from '@/pages/LeadDetail';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import React, { useEffect, useState } from 'react';
import { setRingback } from '@/lib/telephony/ringback';
import { useSearchParams } from 'react-router-dom';
import AgentPhoneConnection from '@/components/AgentPhoneConnection';
import { placeBrowserCall, expectOutboundSetup, clearOutboundSetup, hasActivePhoneCall, canPlaceCall } from '@/lib/telephony/browserClient';
import { EmptyDataTable } from '@/components/CollectionStructure';
import { api, ApiError } from '@/lib/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { AuthError, ErrorState, TenantBadge } from '@/components/ContractState';
import { Phone, Clock, AlertCircle, Headphones, PhoneCall, PhoneOff, Pause, Play, ArrowRightLeft } from 'lucide-react';

const DISPOSITIONS = ['attempted', 'no_answer', 'voicemail_left', 'connected', 'qualified', 'unqualified', 'duplicate', 'wrong_number', 'do_not_call', 'warm_transfer_completed', 'appointment_booked', 'follow_up_required', 'closed', 'lost'];

function ageLabel(min) {
  if (min < 60) return `${min}m`;
  if (min < 1440) return `${Math.floor(min / 60)}h`;
  return `${Math.floor(min / 1440)}d`;
}

export default function AgentWorkspace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();
  const [selectedLeadId, setSelectedLeadId] = useState(searchParams.get('leadId'));
  useEffect(() => { if (searchParams.get('leadId')) setSelectedLeadId(searchParams.get('leadId')); }, [searchParams]);

  const load = async (showSpinner = true) => {
    if(showSpinner) setLoading(true); setError(null);
    try {
      const ws = await api.getAgentWorkspace(user);
      setData(ws);

    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);

  if (loading) return <Spinner />;
  if (error) return error instanceof ApiError && (error.status === 401 || error.status === 403)
    ? <AuthError error={error} onRetry={load} /> : <ErrorState error={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-semibold tracking-tight">Agent Workspace</h1>
          <p className="text-muted-foreground text-sm mt-1">Unified lead response across all assigned brands</p>
        </div>
        <div className="flex items-center gap-3">
          <TenantBadge tenant={data.tenant} />
        </div>
      </div>



      <AgentPhoneConnection user={user} />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="New Leads" value={data.new_leads.count} icon={AlertCircle} accent="bg-blue-50 text-blue-600" />
        <StatCard label="Callbacks Due" value={data.callback_queue.count} icon={Clock} accent="bg-amber-50 text-amber-600" />
        <StatCard label="Follow-ups" value={data.follow_up_queue.count} icon={Phone} accent="bg-purple-50 text-purple-600" />
        <StatCard label="Assigned Brands" value={data.assigned_brands.length} icon={Headphones} accent="bg-emerald-50 text-emerald-600" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Queue list */}
        <Card className="h-full">
          <CardHeader><CardTitle className="text-base">New Leads</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.new_leads.count === 0 ? (
              <EmptyDataTable
                title="Lead queue"
                columns={['Priority', 'Prospect', 'Contact', 'Received']}
                message="No new leads are waiting. Assigned leads will appear here automatically."
                rows={2}
              />
            ) :
              data.new_leads.items.map(lead => (
                <button key={lead.id} onClick={() => setSelectedLeadId(lead.id)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${selectedLeadId === lead.id ? 'border-primary bg-accent/50' : 'border-border hover:bg-accent/30'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{lead.first_name} {lead.last_name || ''}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{ageLabel(Math.round((Date.now() - new Date(lead.created_date)) / 60000))}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">P{lead.priority || 5}</Badge>
                    <span className="text-xs text-muted-foreground truncate">{lead.phone || lead.email || '—'}</span>
                  </div>
                </button>
              ))}
          </CardContent>
        </Card>

        {data.reconnect_leads?.count > 0 && <Card className="h-full"><CardHeader><CardTitle className="text-base">Previously contacted · call again</CardTitle></CardHeader><CardContent className="space-y-2">{data.reconnect_leads.items.map(lead => <Button key={lead.id} variant="outline" className="w-full h-auto min-h-20 justify-start whitespace-normal text-left p-4" onClick={() => setSelectedLeadId(lead.id)}>{lead.first_name} {lead.last_name || ''} · {String(lead.lead_status || 'Follow up').replace(/_/g,' ')}</Button>)}</CardContent></Card>}

      </div>
      <Dialog open={Boolean(selectedLeadId)} onOpenChange={open => {if (!open) {if (hasActivePhoneCall()) {toast({title:'End the active call before closing the lead.'});return;}setSelectedLeadId(null);window.history.replaceState(null,'', '/workspace');}}}><DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto"><DialogTitle>Lead record</DialogTitle>{selectedLeadId && <LeadDetail leadId={selectedLeadId} embedded onSaved={() => load(false)} />}</DialogContent></Dialog>
    </div>
  );
}

export function LeadContextPanel({ leadId, onSaved, callOnly = false, initialContext }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [ctx, setCtx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [disposition, setDisposition] = useState('attempted');
  const [notes, setNotes] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [saving, setSaving] = useState(false);
  const [call, setCall] = useState(null);
  const [callLoading, setCallLoading] = useState(false);
  const [telephony, setTelephony] = useState(null);
  const [qualAnswers, setQualAnswers] = useState({});
  const [recordingConsent, setRecordingConsent] = useState(false);
  const [transferStatus, setTransferStatus] = useState(null);
  const [controlError, setControlError] = useState(null);
  const [controlBusy, setControlBusy] = useState(false);
  const control = async (action) => {
    setControlBusy(true); setControlError(null);
    try { return await action(); } catch (error) { setControlError(error.message); return null; } finally { setControlBusy(false); }
  };
  const transfer = async (action) => {
    const result = await control(() => api.telephonyAction(user, action, {callId:call.callId}));
    if (result) setTransferStatus(result.status);
  };

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const c = initialContext || await api.getLead(user, leadId);
      setCtx(c);
      setQualAnswers(c.lead.qualification_data || {});
      setDisposition(c.lead.disposition || 'attempted');
    } catch (e) { setError(e); } finally { setLoading(false); }
  };
  useEffect(() => {
    load();
    api.getTelephonyStatus(user).then(setTelephony).catch(() => setTelephony({ mode: 'unavailable', healthy: false, warning: 'Telephony status could not be verified. Calls are disabled until the CRM backend is connected.' }));
  }, [leadId]);

  useEffect(() => {
    if (!call?.callId) return;
    let active = true;
    const timer = setInterval(async () => {
      try {
        const status = await api.telephonyAction(user, 'call_status', {callId:call.callId});
        if (active) {setCall(value => ({...value,...status})); if(status.transferStatus) setTransferStatus(status.transferStatus);}
      } catch { /* Retain last confirmed state; controls report operation errors. */ }
    }, 3000);
    return () => {active=false;clearInterval(timer);};
  }, [call?.callId, user]);

  useEffect(() => { setRingback(call?.status === 'ringing'); return () => setRingback(false); }, [call?.status]);

  const startCall = async () => {
    if (!canPlaceCall()) {toast({title:'Enable outbound calls and set Available in the workspace control panel.',variant:'destructive'});return;}
    if (!ctx?.lead?.phone) return;
    setCallLoading(true);
    try {
      await api.telephonyAction(user, 'claim_lead', {leadId});
      expectOutboundSetup();
      const result = await api.postCall(user, { lead_id: leadId, to: ctx.lead.phone, recording_consent: recordingConsent });
      if (result.dial) {
        const browserCall = placeBrowserCall({...result.dial, onUpdate: update => {
          setCall(value => value ? {...value, browserState:update.state} : value);
          if (update.providerCallId) api.telephonyAction(user, 'bind_call', {callId:result.callId, ...update}).catch(() => {});
        }});
        setCall({...result, browserCallId:browserCall.id});
      } else setCall(result);
      toast({
        title: result.mode === 'mock' ? 'Test call started' : 'Call started',
        description: result.mode === 'mock' ? 'Mock mode — no real call was placed.' : 'The phone service accepted the call request.'
      });
    } catch (e) {
      clearOutboundSetup();
      toast({ title: 'Call could not start', description: e.message, variant: 'destructive' });
    } finally { setCallLoading(false); }
  };

  const endCall = async () => {
    if (!call?.callId) return;
    const result = await api.endCall(user, call.callId);
    setCall({ ...call, ...result, status: result.status || 'ending' });
  };

  const toggleHold = async () => {
    if (!call?.callId) return;
    const result = call.status === 'on_hold'
      ? await api.resumeCall(user, call.callId)
      : await api.holdCall(user, call.callId);
    setCall({ ...call, ...result });
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.postDisposition(user, leadId, { disposition, notes, next_action: nextAction, qualification_data: qualAnswers, provider_mode: call?.mode || telephony?.mode || 'mock' });
      toast({ title: 'Disposition saved' });
      setNotes(''); setNextAction('');
      onSaved?.(); load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (loading) return <Spinner />;
  if (error) return error instanceof ApiError && (error.status === 401 || error.status === 403)
    ? <Card><CardContent className="py-8"><AuthError error={error} onRetry={load} /></CardContent></Card>
    : <Card><CardContent className="py-8"><ErrorState error={error} onRetry={load} /></CardContent></Card>;
  if (!ctx) return null;

  const { lead, brand, campaign, script, form, calls, duplicates, lead_age_minutes } = ctx;
  const callEnded = (['completed', 'failed', 'canceled', 'cancelled','transferred'].includes(call?.status) || transferStatus==='completed');
  const recordingPolicy = telephony?.recordingPolicy || 'do_not_record';

  return (<Card className={telephony?.mode === 'production' ? 'border-emerald-300' : telephony?.mode === 'unavailable' ? 'border-rose-300 bg-rose-50' : 'border-amber-300'}>
        <CardContent className="space-y-2 p-2">

          {!call && telephony?.mode === 'production' && recordingPolicy === 'record_on_consent' && (
            <label className="flex items-start gap-2 rounded-md border border-border p-3 text-sm">
              <input type="checkbox" className="mt-1" checked={recordingConsent} onChange={(event) => setRecordingConsent(event.target.checked)} />
              <span><span className="font-medium">Recording consent confirmed</span><span className="block text-xs text-muted-foreground">Select only after the approved disclosure is read and the prospect affirmatively agrees.</span></span>
            </label>
          )}
          {!call && telephony?.mode === 'production' && recordingPolicy === 'record_all' && <p className="text-xs text-amber-700">This Brand is configured to record calls. Read the approved recording disclosure before connecting.</p>}
          {!call && telephony?.mode === 'production' && recordingPolicy === 'do_not_record' && <p className="text-xs text-muted-foreground">Recording is disabled for this Brand.</p>}
          {call && !callEnded && !call.conferenceReady && <p role="status" className="text-xs">Waiting for the contact to answer and join the call. Hold and handoff will become available after connection.</p>}{call && !callEnded ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{({dialing_agent:'Connecting your browser',ringing:'Dialing contact',in_progress:'Connected',completed:'Call ended'})[call.status] || call.status || 'Connecting'}</Badge>
              <Button size="sm" variant="outline" disabled={controlBusy || callEnded || !call.conferenceReady || !['in_progress','on_hold'].includes(call.status)} onClick={() => control(toggleHold)}>
                {call.status === 'on_hold' ? <Play className="h-3.5 w-3.5 mr-1" /> : <Pause className="h-3.5 w-3.5 mr-1" />}
                {call.status === 'on_hold' ? 'Resume' : 'Hold'}
              </Button>
              <Button size="sm" variant="destructive" disabled={controlBusy || callEnded} onClick={() => control(endCall)}><PhoneOff className="h-3.5 w-3.5 mr-1" />End call</Button>
              <Button size="sm" variant="outline" disabled={controlBusy || callEnded || !call.conferenceReady || !['in_progress','on_hold'].includes(call.status) || !telephony?.warmTransferEnabled || ['starting','consulting','completed','completion_requested'].includes(transferStatus)} onClick={() => transfer('start_consultation')}><ArrowRightLeft className="h-3.5 w-3.5 mr-1" />Consult customer</Button>
              {transferStatus === 'consulting' && <><Button size="sm" disabled={controlBusy} onClick={() => transfer('complete_transfer')}>Complete handoff</Button><Button size="sm" variant="outline" disabled={controlBusy} onClick={() => transfer('skip_consultation')}>Try next recipient</Button><Button size="sm" variant="outline" disabled={controlBusy} onClick={() => transfer('cancel_transfer')}>Cancel handoff</Button></>}
              {callEnded && <Button size="sm" onClick={() => {setCall(null);setControlError(null);setTransferStatus(null);}}>New call</Button>}
              {transferStatus==='exhausted' && <p className="text-xs">No available recipient answered. The lead is back with you; arrange a callback.</p>}{call?.handoffRecipientName && <span className="text-xs">Recipient: {call.handoffRecipientName}</span>}{transferStatus && <Badge variant="outline">{transferStatus.replace(/_/g, ' ')}</Badge>}
            </div>
          ) : (
            <Button onClick={startCall} disabled={callLoading || !lead.phone || telephony?.mode !== 'production'}>
              <PhoneCall className="h-4 w-4 mr-2" />{callLoading ? 'Starting…' : 'Call ' + lead.first_name}
            </Button>
          )}
          {controlError && <p role="alert" className="text-sm text-destructive">{controlError}</p>}
          <p className="text-xs text-muted-foreground">{controlError ? '' : telephony?.mode === 'unavailable' ? telephony.warning : ''}</p>
        </CardContent>
      </Card>);

}

function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <Card><CardContent className="p-4 flex items-center justify-between">
      <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-heading font-semibold mt-1">{value}</p></div>
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${accent}`}><Icon className="h-5 w-5" /></div>
    </CardContent></Card>
  );
}

function Spinner() { return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>; }


