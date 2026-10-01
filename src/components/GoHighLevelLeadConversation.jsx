import { useState } from 'react';
import { firebaseClient } from '@/api/firebaseClient';

export default function GoHighLevelLeadConversation({ leadId }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true); setError(''); setItems(null);
    try {
      const response = await firebaseClient.functions.invoke('readGoHighLevelResource', { resource: 'conversations', leadId });
      setItems(response.items);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <section className="space-y-3 rounded-xl border bg-white p-4">
    <h2 className="font-heading text-xl">GoHighLevel conversation</h2>
    <p className="text-sm text-muted-foreground">Read-only CRM activity for this lead. Agents can access only their assigned brand and lead; a verified contact link is required.</p>
    <button type="button" disabled={busy} onClick={load} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">{busy ? 'Loading…' : 'Load CRM conversation'}</button>
    {error && <p role="status" className="text-sm">{error}</p>}
    {items?.map(item => <article key={item.id} className="rounded-lg border p-3 text-sm"><p className="font-semibold">{item.contactName || item.fullName || 'Contact conversation'}</p><p>{item.lastMessageBody || 'No message preview supplied.'}</p><p className="text-xs text-muted-foreground">{item.lastMessageType || 'Conversation'} · Unread: {item.unreadCount ?? 0}</p></article>)}
    {items?.length === 0 && <p className="text-sm">No conversation returned for this contact.</p>}
  </section>;
}
