export const GMS_LIFECYCLE = [
  { key: 'inquiry', label: 'Inquiry' },
  { key: 'verified_prospect', label: 'Verified Prospect' },
  { key: 'qualified_lead', label: 'Qualified Lead' },
  { key: 'contacted_lead', label: 'Contacted Lead' },
  { key: 'qualified_handoff', label: 'Qualified Handoff' },
  { key: 'warm_transfer_appointment', label: 'Warm Transfer / Appointment' },
  { key: 'accepted_handoff', label: 'Accepted Handoff' },
  { key: 'client_outcome', label: 'Client Outcome' },
];

export const lifecycleLabel = (value) =>
  GMS_LIFECYCLE.find((stage) => stage.key === value)?.label || 'Inquiry';

export function deriveLifecycleStage(lead = {}) {
  if (lead.lifecycle_stage) return lead.lifecycle_stage;
  if (lead.closed_outcome || ['closed', 'lost'].includes(lead.lead_status)) return 'client_outcome';
  if (lead.owner_acceptance_status === 'accepted' || lead.lead_status === 'accepted') return 'accepted_handoff';
  if (lead.lead_status === 'warm_transfer' || lead.lead_status === 'appointment_scheduled') return 'warm_transfer_appointment';
  if (lead.handoff_status === 'ready' || (lead.qualification_status === 'qualified' && lead.last_contact_date)) return 'qualified_handoff';
  if (lead.last_contact_date || ['connected', 'contact_attempted'].includes(lead.lead_status)) return 'contacted_lead';
  if (lead.qualification_status === 'qualified' || lead.lead_status === 'qualified') return 'qualified_lead';
  if (lead.verification_status === 'verified') return 'verified_prospect';
  return 'inquiry';
}

export function verificationLabel(lead = {}) {
  if (lead.verification_status === 'verified') return 'Mobile Verified';
  if (lead.verification_status === 'failed') return 'Verification Failed';
  if (lead.verification_status === 'sent') return 'Verification Sent';
  if (lead.verification_status === 'not_required') return 'Verification Not Required';
  return 'Verification Pending';
}

export function nextLifecycleStage(current) {
  const index = GMS_LIFECYCLE.findIndex((stage) => stage.key === current);
  return index >= 0 && index < GMS_LIFECYCLE.length - 1 ? GMS_LIFECYCLE[index + 1] : null;
}
