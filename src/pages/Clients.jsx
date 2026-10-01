import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, ArrowLeft, CheckCircle2, Circle, Upload, FolderOpen } from 'lucide-react';
import { firebaseClient } from '@/api/firebaseClient';
import { clientIndustries, industrySelection } from '@/lib/client-industries';
import GoHighLevelConnection from '@/components/GoHighLevelConnection';

const blank = () => ({ name: '', legalName: '', adminEmail: '', phone: '', domain: '', address: '', industry: '', timezone: 'America/Chicago', brandName: '', locationId: '', phoneNumber: '', phoneSid: '', billingNotes: '', notes: '', campaigns: [] });
const campaign = () => ({ id: `campaign-${crypto.randomUUID().slice(0, 8)}`, name: '', type: '', source: '', calendarId: '', pipelineId: '', agentUids: [], script: '', qualification: '', consent: '', adCopy: '', documentIds: [] });
const sections = ['Client profile', 'Connections', 'Campaigns & routing', 'Files & approvals', 'Readiness'];
const inputClass = 'mt-1 w-full rounded-lg border border-[#001922]/20 bg-white px-3 py-2 text-sm font-normal text-[#001922] focus:outline-none focus:ring-2 focus:ring-[#14857F]';
function Field({ label, value, onChange, multiline = false, ...props }) {
  const Component = multiline ? 'textarea' : 'input';
  return <label className="block text-sm font-semibold">{label}<Component className={inputClass} value={value || ''} onChange={e => onChange(e.target.value)} {...(multiline ? { rows: 4 } : {})} {...props} /></label>;
}
function IndustryField({ value, onChange }) {
  const selected = industrySelection(value);
  return <div>
    <label className="block text-sm font-semibold">Industry
      <select className={inputClass} value={selected} onChange={e => onChange(e.target.value)}>
        <option value="">Select an industry</option>
        {clientIndustries.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        <option value="other">Other</option>
      </select>
    </label>
    {selected === 'other' && <div className="mt-3"><Field label="Other industry" maxLength={100} value={value === 'other' ? '' : value} onChange={text => onChange(text || 'other')} /><p className="mt-1 text-xs text-[#647274]">Enter the industry name. It will be saved with this client's profile.</p></div>}
  </div>;
}
export default function Clients() {
  const [params, setParams] = useSearchParams();
  const [clients, setClients] = useState([]);
  const [agents, setAgents] = useState([]);
  const [record, setRecord] = useState(null);
  const [form, setForm] = useState(blank);
  const [clientId, setClientId] = useState('');
  const [creating, setCreating] = useState(false);
  const [section, setSection] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState(false);
  const [setupLink, setSetupLink] = useState('');
  const invoke = firebaseClient.clients.invoke;
  const list = async () => { const res = await invoke('listGmsClients'); setClients(res.clients || []); setAgents(res.agents || []); };
  useEffect(() => { list().catch(e => setMessage(e.message)); }, []);
  const edit = async id => {
    setBusy(true); setMessage(''); setSetupLink('');
    try {
      const res = await invoke('getGmsClient', { clientId: id });
      setRecord(res); setForm({ ...blank(), ...res.data }); setClientId(id); setCreating(false); setEditing(true); setDirty(false); setSection(0);
    } catch (e) { setMessage(e.message); } finally { setBusy(false); }
  };
  const start = () => { setRecord(null); setForm(blank()); setClientId(''); setCreating(true); setEditing(true); setDirty(false); setSection(0); setMessage(''); setSetupLink(''); };
  useEffect(() => { if (params.get('new') === '1') { start(); setParams({}, { replace: true }); } }, [params, setParams]);
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const update = (key, value) => { setForm(f => ({ ...f, [key]: value })); setDirty(true); };
  const updateCampaign = (index, key, value) => { setForm(f => ({ ...f, campaigns: f.campaigns.map((c, i) => i === index ? { ...c, [key]: value } : c) })); setDirty(true); };
  const save = async event => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const res = await invoke('saveGmsClient', { clientId, create: creating, revision: record?.revision || 0, data: form });
      setRecord(res); setForm({ ...blank(), ...res.data }); setCreating(false); setDirty(false);
      setMessage('Draft saved. Customer files and operational configuration share this client record. Intake stays paused until verified launch readiness.');
      await list();
    } catch (e) { setMessage(e.message); } finally { setBusy(false); }
  };
  const upload = async event => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { setMessage('Please choose a file smaller than 25 MB.'); return; }
    setBusy(true); setMessage('');
    try { await firebaseClient.clients.upload(clientId, file); const res = await invoke('getGmsClient', { clientId }); setRecord(res); setMessage('File saved to this client cabinet and available in their Customer Portal. Attach it to a campaign below.'); }
    catch (e) { setMessage(e.message); } finally { setBusy(false); }
  };
  const download = async doc => { try { const url = await firebaseClient.clients.download(doc.storagePath); window.open(url, '_blank', 'noopener,noreferrer'); } catch (e) { setMessage(e.message); } };
  const prepareLogin = async () => {
    setBusy(true); setMessage(''); setSetupLink('');
    try { const res = await invoke('prepareGmsClientLogin', { clientId }); setSetupLink(res.setupLink); setRecord(await invoke('getGmsClient',{clientId})); setMessage('Customer identity prepared. No email was sent. Share the password-setup link privately with the customer.'); }
    catch (e) { setMessage(e.message); } finally { setBusy(false); }
  };
  const enableRouting = async () => {
    if (!window.confirm('Enable verified campaign intake? This does not publish ads.')) return;
    setBusy(true); setMessage('');
    try { const res = await invoke('enableGmsClientRouting',{clientId,revision:record.revision}); setRecord(res); setMessage('Verified campaign intake enabled. No ads were published.'); await list(); }
    catch (e) { setMessage(e.message); } finally { setBusy(false); }
  };
  return <div className="space-y-5 text-[#001922]">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="link-eyebrow">GMS Super Admin · Administration</p><h1 className="mt-2 font-heading text-3xl">{editing ? (creating ? 'Add client' : form.name) : 'Clients'}</h1><p className="mt-2 text-sm text-[#647274]">One client record, one onboarding form, one shared filing cabinet.</p></div>{editing ? <button type="button" disabled={busy} onClick={() => { if (!dirty || window.confirm('Discard unsaved changes?')) { setEditing(false); setDirty(false); } }} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2"><ArrowLeft size={16} />Client list</button> : <button type="button" onClick={start} className="inline-flex items-center gap-2 rounded-lg bg-[#001922] px-4 py-3 text-white"><Plus size={16} />Add client</button>}</header>
    <ol className="grid gap-3 rounded-xl border bg-white p-4 text-sm md:grid-cols-3"><li><b>1.</b> Set up GoHighLevel sub-account</li><li><b>2.</b> Set up Twilio phone number</li><li><b>3.</b> Complete this GMS onboarding form</li></ol>
    {message && <p role="status" className="rounded-lg border border-[#C9A24B] bg-white p-4 text-sm">{message}</p>}
    {setupLink && editing && <div className="rounded-lg border bg-white p-4 text-sm"><p>Private password-setup link for this customer. Do not share publicly.</p><button type="button" onClick={() => navigator.clipboard.writeText(setupLink).then(() => setMessage('Private setup link copied.'))} className="mt-2 rounded-lg border px-3 py-2">Copy setup link</button></div>}
    {!editing ? <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm"><caption className="p-4 text-left">Client organizations — separate from individual Client Contacts</caption><thead className="border-y bg-[#FBFAF7]"><tr>{['Client', 'Industry', 'Onboarding', 'Action'].map(h => <th key={h} scope="col" className="p-4">{h}</th>)}</tr></thead><tbody>{clients.map(c => <tr key={c.tenantId} className="border-b"><td className="p-4"><b>{c.name}</b><p className="text-xs text-[#647274]">{c.tenantId}</p></td><td className="p-4">{c.industry || 'Not entered'}</td><td className="p-4">{c.lifecycle.replaceAll('_', ' ')}</td><td className="p-4"><button disabled={busy} onClick={() => edit(c.tenantId)} className="font-semibold text-[#0D6E68]">Open client</button></td></tr>)}</tbody></table>{!clients.length && <p className="p-8 text-center text-sm">{busy ? 'Loading clients…' : 'No clients loaded. Add a client or check the message above.'}</p>}</div> :
    <form onSubmit={save} className="rounded-xl border bg-white p-4 sm:p-6">
      {section === 1 && <GoHighLevelConnection key={clientId} tenantId={clientId} locationId={form.locationId} disabled={busy || dirty || creating} onVerified={async () => setRecord(await invoke('getGmsClient', { clientId }))} />}
      <nav aria-label="Onboarding sections" className="mb-6 flex flex-wrap gap-2">{sections.map((title, index) => <button key={title} type="button" aria-current={section === index ? 'step' : undefined} onClick={() => setSection(index)} className={`rounded-lg border px-3 py-2 text-sm ${section === index ? 'bg-[#001922] text-white' : 'bg-[#FBFAF7]'}`}>{title}</button>)}</nav>
      {section === 0 && <div className="grid gap-4 sm:grid-cols-2"><Field label="Client identifier (permanent)" value={clientId} disabled={!creating} required onChange={value => { setClientId(value); setDirty(true); }} />{[['name','Client organization'],['legalName','Legal name'],['brandName','Brand name'],['industry','Industry'],['adminEmail','Customer administrator email'],['phone','Contact phone'],['domain','Client website'],['address','Business address'],['timezone','Time zone']].map(([key,label]) => key === 'industry' ? <IndustryField key={key} value={form.industry} onChange={value => update('industry',value)} /> : <Field key={key} label={label} type={key === 'adminEmail' ? 'email' : 'text'} value={form[key]} onChange={value => update(key,value)} />)}<Field label="Billing / agreement notes" multiline value={form.billingNotes} onChange={value => update('billingNotes',value)} /><Field label="Onboarding notes" multiline value={form.notes} onChange={value => update('notes',value)} /><p className="text-xs sm:col-span-2">Use a customer's own administrator email, not the GMS Super Admin address. An existing Firebase identity is linked on save; missing identities remain clearly pending, not falsely invited.</p></div>}
      {section === 1 && <div className="space-y-4"><p className="text-sm">Set up the external accounts first, then enter their identifiers here. Keep all tokens and secrets in backend secret storage, never in this form.</p><Field label="GoHighLevel location ID" value={form.locationId} onChange={value => update('locationId',value)} /><Field label="Twilio phone number (international format)" value={form.phoneNumber} onChange={value => update('phoneNumber',value)} /><Field label="Twilio phone number SID" value={form.phoneSid} onChange={value => update('phoneSid',value)} /><p className="rounded-lg bg-[#F7F1E6] p-4 text-sm">Identifiers are configuration, not proof of a working API. Connection checks stay pending until the backend connector verifies the correct tenant, location and number.</p></div>}
      {section === 2 && <div className="space-y-5">{form.campaigns.map((c,index) => <fieldset key={c.id} className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2"><legend className="px-2 font-semibold">Campaign {index+1} · {c.name || 'New campaign'}</legend>{[['name','Campaign name'],['type','Campaign type / service'],['source','Lead source / ad platform'],['calendarId','GoHighLevel calendar ID'],['pipelineId','GoHighLevel pipeline ID']].map(([key,label]) => <Field key={key} label={label} value={c[key]} onChange={value => updateCampaign(index,key,value)} />)}<fieldset className="rounded-lg border p-3"><legend className="px-1 text-sm font-semibold">Assigned phone agents</legend>{agents.map(agent => <label key={agent.uid} className="mb-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={c.agentUids.includes(agent.uid)} onChange={e => updateCampaign(index,'agentUids',e.target.checked ? [...c.agentUids,agent.uid] : c.agentUids.filter(uid => uid !== agent.uid))} />{agent.name}</label>)}{!agents.length && <p className="text-sm">No active GMS agents available yet. Agent identities must be provisioned before routing.</p>}</fieldset><p className="text-xs sm:col-span-2">Select existing active GMS agents; saving assigns them to this client and campaign. Each campaign has its own script and qualification questions.</p>{[['script','Agent script'],['qualification','Qualification questions (one per line)'],['consent','Consent / compliance instructions'],['adCopy','Ad copy for customer approval']].map(([key,label]) => <Field key={key} label={label} multiline value={c[key]} onChange={value => updateCampaign(index,key,value)} />)}<p className="text-xs">Campaign ID: {c.id}</p><button type="button" onClick={() => update('campaigns',form.campaigns.filter((_,i) => i !== index))} className="text-right text-sm text-red-700">Remove from onboarding (pauses managed route)</button></fieldset>)}<button disabled={form.campaigns.length >= 12} type="button" onClick={() => update('campaigns',[...form.campaigns,campaign()])} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2"><Plus size={16} />Add campaign</button></div>}
      {section === 3 && <div className="space-y-5"><div className="flex items-center gap-2"><FolderOpen size={20} /><h2 className="font-heading text-xl">Client filing cabinet</h2></div><p className="text-sm">The same files appear under Documents in this client's portal. Approvals belong to the exact campaign version; editing it requires renewed client approval.</p><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2"><Upload size={16} />Upload file<input type="file" className="sr-only" disabled={creating || busy} accept=".pdf,.png,.jpg,.jpeg,.webp,.mp4,.docx,.xlsx,.txt" onChange={upload} /></label>{creating && <p className="text-xs">Save the draft before uploading files.</p>}{(record?.documents || []).map(doc => <div key={doc.id} className="rounded-lg border p-3"><button type="button" onClick={() => download(doc)} className="font-semibold text-[#0D6E68]">{doc.name}</button>{form.campaigns.map((c,index) => <label key={c.id} className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={c.documentIds.includes(doc.id)} onChange={e => updateCampaign(index,'documentIds',e.target.checked ? [...c.documentIds,doc.id] : c.documentIds.filter(id => id !== doc.id))} />Use for {c.name || `campaign ${index+1}`}</label>)}</div>)}{form.campaigns.map(c => <p key={c.id} className="text-sm">{c.name || c.id}: {record?.approvals?.[c.id]?.status === 'approved' && record?.approvals?.[c.id]?.version === record?.campaignVersions?.[c.id] && !dirty ? 'Customer approved saved version' : 'Awaiting review / changes'}</p>)}<p className="text-xs">Clients review campaigns at customer.goldenmarketingservices.com/onboarding. GMS staff cannot approve on their behalf.</p></div>}
      {section === 4 && <div className="space-y-4"><h2 className="font-heading text-2xl">Launch readiness: {dirty ? 'Save to recalculate' : `${record?.readiness?.percent || 0}%`}</h2>{(record?.readiness?.checks || []).map(check => <p key={check.key} className="flex items-center gap-3 text-sm">{check.ready && !dirty ? <CheckCircle2 size={20} className="text-[#14857F]" /> : <Circle size={20} className="text-[#C9A24B]" />}{check.label}: {check.ready && !dirty ? 'Ready' : 'Pending'}</p>)}<p className="rounded-lg bg-[#F7F1E6] p-4 text-sm">Saving never publishes ads or enables intake. GoHighLevel/Twilio API credentials, verified connections, active customer identity, campaign agents and customer approvals must be ready before launch. Ad publishing remains an external action until an ad-platform connector is configured.</p></div>}
      {section === 4 && <div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={busy || dirty || creating || !form.adminEmail} onClick={prepareLogin} className="rounded-lg border px-4 py-2 disabled:opacity-50">Prepare customer login</button><button type="button" disabled={busy || dirty || !record?.readiness?.ready} onClick={enableRouting} className="rounded-lg bg-[#001922] px-4 py-2 text-white disabled:opacity-50">Enable verified routing</button></div>}
      <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-5"><span className="text-xs text-[#647274]">{dirty ? 'Unsaved changes' : `Saved revision ${record?.revision || 0}`} · {record?.lifecycle === 'routing_enabled' && !dirty ? 'Routing enabled' : 'Intake paused while onboarding'}</span><div className="flex gap-2">{section > 0 && <button type="button" onClick={() => setSection(s => s-1)} className="rounded-lg border px-4 py-2">Back</button>}{section < sections.length-1 && <button type="button" onClick={() => setSection(s => s+1)} className="rounded-lg border px-4 py-2">Next</button>}<button disabled={busy} className="rounded-lg bg-[#001922] px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? 'Working…' : 'Save draft'}</button></div></footer>
    </form>}
  </div>;
}
