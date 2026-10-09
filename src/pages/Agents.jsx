import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { firebaseClient } from '@/api/firebaseClient';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const PERMISSION_LABELS = { 'lead.work':'Work assigned leads', 'call.place':'Place permitted calls', 'qualification.save':'Save qualification answers', 'callback.manage':'Manage callbacks', 'appointment.manage':'Book appointments', 'queue.manage':'Oversee the lead queue', 'lead.assign':'Assign leads', 'quality.review':'Review call quality', 'report.view':'View operational reports', 'ai.workflow.configure':'Configure assigned AI workflows', 'ai.results.review':'Review AI results', 'staff.manage':'Manage staff access', 'client.manage':'Manage clients', 'system.manage':'Manage system configuration', 'ai.global.manage':'Manage global AI controls' };

export default function Agents() {
  const { user } = useAuth();
  const allowed = ['super_admin', 'gms_super_admin'].includes(user?.role);
  const [data, setData] = useState({ rows: [], presets: {} });
  const [brands, setBrands] = useState([]);
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', role: 'agent', brandIds: [] });
  const [notice, setNotice] = useState('');
  const [setup, setSetup] = useState(null), [copied, setCopied] = useState(false);
  const load = async () => {
    setError('');
    try {
      const [staff, brandRows] = await Promise.all([firebaseClient.functions.invoke('getGmsStaff'), firebaseClient.entities.Brand.list()]);
      setData(staff); setBrands(brandRows);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (allowed) load(); }, [allowed, user?.organization_id]);
  if (!allowed) return <Navigate to="/workspace" replace />;
  const perform = async action => {
    setBusy(true); setError('');
    try { await action(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const create = event => {
    event.preventDefault();
    perform(async () => {
      const result = await firebaseClient.functions.invoke('createGmsStaff', form);
      setSetup(null); setCopied(false); setOpen(false);
      setForm({ name: '', email: '', role: 'agent', brandIds: [] });
      await load();
      try {
        await firebaseClient.auth.resetPasswordRequest(result.email);
        setNotice(`Password setup email requested for ${result.email}. Check the inbox and spam folder.`);
      } catch (e) {
        setSetup(result);
        setError(`The account was created, but its setup email could not be sent: ${e.message}. Use Send setup email to retry, or share the private link below.`);
      }
    });
  };
  const copy = async () => { try { await navigator.clipboard.writeText(setup.setupLink); setCopied(true); } catch { setError('Copy the setup link from the field below.'); } };
  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="font-heading text-3xl">Agents &amp; roles</h1><p className="mt-2 text-sm text-muted-foreground">Staff logins, predefined authorities and phone setup.</p></div><Button disabled={loading || busy} onClick={() => { setSetup(null); setOpen(true); }}>Add staff member</Button></header>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{Object.entries(data.presets).map(([role, preset]) => <section key={role} className="rounded-xl border bg-white p-4"><h2 className="font-semibold">{preset.label}</h2><ul className="mt-3 space-y-1 text-xs text-muted-foreground">{preset.permissions.map(permission => <li key={permission}>{PERMISSION_LABELS[permission] || permission}</li>)}</ul></section>)}</div>
    <p className="rounded-xl border bg-white p-4 text-sm">New staff are assigned to the active client: <strong>{user?.tenant_name || user?.organization_id}</strong>. Select their permitted brands below. Super admins have system-wide administration. Phone setup does not enable recording, transfers, SMS or unrestricted production calling. Existing accounts are listed for review; no legacy account is automatically changed.</p>
    {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {setup && <section className="rounded-xl border border-emerald-200 bg-white p-5"><h2 className="font-semibold">Private account setup link</h2><p className="my-2 text-sm">Email delivery needs attention. This private link lets the staff member choose their own password; it is shown only during this page session.</p><Input aria-label="Private account setup link" readOnly value={setup.setupLink} /><Button className="mt-3" onClick={copy}>{copied ? 'Copied' : 'Copy setup link'}</Button><Button className="ml-2" variant="outline" onClick={() => setSetup(null)}>Hide link</Button></section>}
    {loading ? <p role="status">Loading staff…</p> : <section className="space-y-3">{data.rows.length ? data.rows.map(row => <article key={row.uid} className="rounded-xl border bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold">{row.name || row.email}</h2><p className="text-sm text-muted-foreground">{row.email} · {data.presets[row.role]?.label || row.role} · {row.status}</p></div>{row.uid.startsWith('gmsstaff_') && <Button variant="outline" disabled={busy} onClick={() => perform(async () => { setNotice(''); await firebaseClient.auth.resetPasswordRequest(row.email); setSetup(null); setNotice(`Password setup email requested for ${row.email}. Check the inbox and spam folder.`); })}>Send setup email</Button>}</div>{row.assignments.map(assignment => <div key={assignment.tenantId} className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-sm"><span>{assignment.tenantName} · {assignment.status} · {assignment.phoneReady ? 'Phone configured' : 'Phone not configured'}</span>{assignment.tenantId === user?.organization_id && !assignment.phoneReady && ['agent','supervisor','gms_super_admin'].includes(assignment.role) && <Button size="sm" variant="outline" disabled={busy} onClick={() => perform(async () => { await firebaseClient.functions.invoke('provisionGmsStaffPhone', { uid: row.uid }); await load(); })}>Set up agent phone</Button>}</div>)}</article>) : <p>No staff accounts found.</p>}</section>}
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Add staff member</DialogTitle><DialogDescription>Create an invitation-only staff login with a fixed role. A password setup email will be sent after the account is created. The staff member chooses their own password.</DialogDescription></DialogHeader><form onSubmit={create} className="space-y-4"><div><Label htmlFor="staff-name">Full name</Label><Input id="staff-name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div><Label htmlFor="staff-email">Work email</Label><Input id="staff-email" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div><div><Label htmlFor="staff-role">Job role</Label><select id="staff-role" className="mt-1 w-full rounded-lg border p-2" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>{Object.entries(data.presets).map(([role, preset]) => <option value={role} key={role}>{preset.label}</option>)}</select></div><fieldset className="rounded-lg border p-3"><legend className="px-1 text-sm font-semibold">Permitted brands for {user?.tenant_name || 'active client'}</legend>{brands.map(brand => <label className="flex items-center gap-2 py-1 text-sm" key={brand.id}><input type="checkbox" checked={form.brandIds.includes(brand.id)} onChange={e => setForm({ ...form, brandIds: e.target.checked ? [...form.brandIds, brand.id] : form.brandIds.filter(id => id !== brand.id) })} /><span>{brand.display_name || brand.name}<span className="ml-2 text-xs text-muted-foreground">{brand.id}</span></span></label>)}</fieldset>{form.role === 'gms_super_admin' && <p className="text-sm font-semibold text-amber-800">This role grants system-wide staff and client administration.</p>}{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<Button type="submit" disabled={busy || !form.brandIds.length}>{busy ? 'Creating…' : 'Create staff login'}</Button></form></DialogContent></Dialog>
  </div>;
}
