import assert from 'node:assert/strict';
import { normalizeEntityRow, normalizeEntityWrite } from '../src/api/firebaseEntityContract.js';

const brand = normalizeEntityRow('brands', {
  id: 'brand-golden-cross-realty',
  tenantId: 'tenant-golden-cross-beta',
  brandId: 'brand-golden-cross-realty',
  name: 'Golden Cross Realty',
  createdAt: { _seconds: 1789948800 },
});
assert.equal(brand.organization_id, 'tenant-golden-cross-beta');
assert.equal(brand.brand_id, 'brand-golden-cross-realty');
assert.equal(brand.display_name, 'Golden Cross Realty');
assert.match(brand.created_date, /^2026-/);

const lead = normalizeEntityRow('leads', {
  tenantId: 'tenant-golden-cross-beta',
  brandId: 'brand-golden-cross-realty',
  campaignId: 'campaign-pilot',
  sourceId: 'source-website',
  assignedTo: 'agent-a',
  qualificationStatus: 'pending',
  firstName: 'Golden',
  lastName: 'Lead',
  status: 'new',
});
assert.equal(lead.organization_id, 'tenant-golden-cross-beta');
assert.equal(lead.brand_id, 'brand-golden-cross-realty');
assert.equal(lead.campaign_id, 'campaign-pilot');
assert.equal(lead.source_id, 'source-website');
assert.equal(lead.assigned_to, 'agent-a');
assert.equal(lead.qualification_status, 'pending');
assert.equal(lead.first_name, 'Golden');
assert.equal(lead.lead_status, 'new');

const brandWrite = normalizeEntityWrite('brands', {
  organization_id: 'tenant-golden-cross-beta',
  brand_id: 'brand-golden-cross-realty',
  display_name: 'Golden Cross Realty',
});
assert.equal(brandWrite.tenantId, 'tenant-golden-cross-beta');
assert.equal(brandWrite.brandId, 'brand-golden-cross-realty');
assert.equal(brandWrite.name, 'Golden Cross Realty');

const appointmentWrite = normalizeEntityWrite('appointments', {
  lead_id: 'lead-a',
  brand_id: 'brand-golden-cross-realty',
  scheduled_start: '2026-09-22T15:00:00.000Z',
  scheduled_end: '2026-09-22T15:30:00.000Z',
  calendar_provider: 'internal',
});
assert.equal(appointmentWrite.leadId, 'lead-a');
assert.equal(appointmentWrite.brandId, 'brand-golden-cross-realty');
assert.equal(appointmentWrite.scheduledStart, '2026-09-22T15:00:00.000Z');
assert.equal(appointmentWrite.calendarProvider, 'internal');

const qualification = normalizeEntityRow('qualificationForms', {
  status: 'draft', qualificationThreshold: 70,
  fields: [{id: 'question-1', label: 'Confirm the inquiry', type: 'text', required: true}],
});
assert.equal(qualification.questions[0].label, 'Confirm the inquiry');
assert.equal(qualification.questions[0].field_type, 'text');
assert.equal(qualification.questions[0].score_weight, 0);
assert.equal(qualification.qualification_threshold, 70);
assert.equal(normalizeEntityRow('scripts', {version: 13, body: 'Phone script'}).version_number, 13);
console.log('Agent Firebase entity contract aliases: PASS');
