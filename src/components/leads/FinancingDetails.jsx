import React, { useState, useEffect } from 'react';
import { firebaseClient } from '@/api/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { financingDetails } from '@/lib/financingDetails';
export default function FinancingDetails({ lead, onSaved }) {
  const [answers, setAnswers] = useState(lead.financingProfile || {});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const savedEmail = lead.communicationPreferences?.weeklyListingEmails;
  const emailSuppressed = Boolean(lead.doNotContact || lead.optOut || lead.emailOptOut || ['unsubscribed', 'suppressed'].includes(savedEmail?.status));
  const [weeklyEmail, setWeeklyEmail] = useState(() => emailSuppressed ? false : savedEmail?.requested ?? true);
  useEffect(() => { setWeeklyEmail(emailSuppressed ? false : savedEmail?.requested ?? true); }, [lead.id, savedEmail?.revision, savedEmail?.requested, emailSuppressed]);
  const update = (key, value) => setAnswers(current => ({ ...current, [key]: value }));
  const choice = (key, label) => <label className="block space-y-2 text-sm">{label}<select aria-label={label} value={answers[key] || ''} onChange={event => update(key, event.target.value)} className="block w-full rounded border p-2"><option value="">Not asked / unanswered</option><option value="yes">Yes</option><option value="no">No</option></select></label>;
  async function save() {
    setBusy(true); setError('');
    try {
      await firebaseClient.entities.Lead.update(lead.id, { financingProfile: { ...financingDetails(answers), recordedAt: new Date().toISOString() } });
      onSaved?.();
    } catch (failure) { setError(failure.message || 'Could not save financing information.'); }
    finally { setBusy(false); }
  }
  async function saveEmailPreference() {
    setBusy(true); setError('');
    try {
      await firebaseClient.entities.Lead.update(lead.id, { communicationPreferences: { weeklyListingEmails: { presented: true, requested: !emailSuppressed && weeklyEmail, expectedRevision: savedEmail?.revision || 0 } } });
      onSaved?.();
    } catch (failure) { setError(failure.message || 'Could not save email preference.'); }
    finally { setBusy(false); }
  }
  return <Card><CardHeader><CardTitle className="text-base">Optional financing information</CardTitle></CardHeader><CardContent className="space-y-4">
    <p className="text-sm text-muted-foreground">For buyers and investment-property purchasers. These answers do not affect qualification. Skip for seller-only inquiries.</p>
    {choice('loanPrequalified', 'Have you been pre-qualified for a loan amount?')}
    {answers.loanPrequalified === 'yes' && <label className="block space-y-2 text-sm">Pre-qualified amount (optional)<Input aria-label="Pre-qualified amount" value={answers.prequalifiedAmount || ''} maxLength={80} onChange={event => update('prequalifiedAmount', event.target.value)} /></label>}
    {answers.loanPrequalified === 'no' && choice('workingWithLender', 'Are you working with a lender or mortgage broker?')}
    {answers.loanPrequalified === 'no' && answers.workingWithLender === 'no' && choice('wantsLenderReferral', 'Would you like a referral to a lender or mortgage broker?')}
    {answers.loanPrequalified === 'no' && answers.workingWithLender === 'no' && answers.wantsLenderReferral === 'yes' && <p className="text-sm">Flag for an approved preferred-partner referral at Realtor handoff. No referral has been sent.</p>}
    <div className="rounded border p-3 text-sm space-y-3">
      <p className="font-medium">Step 3 — Weekly listing-email preference</p>
      <p>Confirm this choice with the prospect. The same preference is shared with the website form.</p>
      <label className="flex items-start gap-2"><input type="checkbox" checked={emailSuppressed ? false : weeklyEmail} disabled={emailSuppressed || busy} onChange={event => setWeeklyEmail(event.target.checked)} className="mt-1" />Send me a weekly email with newly listed homes that match my search preferences. I can unsubscribe at any time.</label>
      {emailSuppressed && <p>An existing unsubscribe remains in effect.</p>}
      <p className="text-muted-foreground">Requested emails need manual Realtor setup and a verified unsubscribe option before delivery starts. Email preference does not authorize SMS.</p>
      <Button type="button" disabled={busy} onClick={saveEmailPreference}>Save weekly email preference</Button>
    </div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <Button type="button" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save optional financing information'}</Button>
  </CardContent></Card>;
}
