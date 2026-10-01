import { useState } from 'react';
import { firebaseClient } from '@/api/firebaseClient';

export default function GoHighLevelConnection({ tenantId, locationId, disabled, onVerified }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const invoke = firebaseClient.clients.invoke;
  async function verify() {
    setBusy(true); setMessage(''); setResult(null);
    try {
      await invoke('connectExistingGoHighLevelLocation', { tenantId, locationId });
      const checked = await invoke('verifyGoHighLevelConnection', { tenantId });
      setMessage(`GoHighLevel connected: ${checked.verifiedResources.join(', ')}. Twilio verification remains separate.`);
      await onVerified?.();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  async function read(resource) {
    setBusy(true); setMessage(''); setResult(null);
    try { setResult(await invoke('readGoHighLevelResource', { tenantId, resource, limit: 20 })); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <section className="my-4 space-y-3 rounded-xl border p-4" aria-label="GoHighLevel connection">
    <h2 className="font-heading text-xl">Live GoHighLevel connection</h2>
    <p className="text-sm">Reads the saved client's sub-account through the secured GMS backend. No calls or messages are sent.</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={disabled || busy || !locationId} onClick={verify} className="rounded-lg bg-[#001922] px-4 py-2 text-white disabled:opacity-50">{busy ? 'Working…' : 'Verify saved connection'}</button>
      {['conversations', 'calendars', 'opportunities'].map(resource => <button key={resource} type="button" disabled={disabled || busy || !locationId} onClick={() => read(resource)} className="rounded-lg border px-3 py-2 capitalize disabled:opacity-50">View {resource}</button>)}
    </div>
    {disabled && <p className="text-xs">Save the draft before checking the connection.</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
    {result && <div className="overflow-x-auto"><p className="mb-2 text-xs">Source: GoHighLevel · {result.resource} · fetched {new Date(result.fetchedAt).toLocaleString()}</p>
      <table className="w-full text-left text-sm"><thead><tr><th className="p-2">Name / contact</th><th className="p-2">Status / details</th><th className="p-2">Provider ID</th></tr></thead><tbody>{result.items.map(item => <tr key={item.id} className="border-t"><td className="p-2">{item.name || item.contactName || item.fullName || item.contactId || 'Not supplied'}</td><td className="p-2">{item.status || item.lastMessageBody || item.description || (item.isActive === undefined ? 'Not supplied' : item.isActive ? 'Active' : 'Inactive')}</td><td className="p-2">{item.id}</td></tr>)}</tbody></table>
      {result.excludedExampleCount > 0 && <p role="status" className="p-3 text-sm">GoHighLevel returned {result.excludedExampleCount} clearly labelled example records. They are excluded from production results, not deleted from the provider.</p>}
      {!result.items.length && <p className="p-3 text-sm">No production {result.resource} in this response.</p>}
    </div>}
  </section>;
}
