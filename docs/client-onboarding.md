# Central client onboarding

Administration > Clients replaces the activate-on-create provisioning dialog.
Business sequence: create GHL sub-account, set up Telnyx number, complete one
sectioned GMS onboarding form. No provider credentials are accepted by this form.

Canonical source: tenants/{tenantId}/config/onboarding. Saving uses an optimistic
revision and a transaction. Managed brand, campaign, script, qualification,
source, phone and routing records are projections, not independent onboarding
inputs. Existing unmanaged campaigns are preserved and identifier collisions
are rejected. Customer identity must exist before membership is activated.

Client cabinet uses existing tenant documents and private Storage. Customer
Portal /onboarding provides review and records authenticated customer decisions
against campaign hashes, with immutable audit history. GMS staff cannot approve
for customers. Any edit pauses managed intake. Live integration checks are not
represented by user-editable checkboxes.

Remaining external prerequisites: location-scoped GHL credential in backend
secret storage, real provider verification/webhooks, Telnyx number verification,
customer identity invitation delivery and ad-platform publishing connector.
These are not simulated by this feature. No ads are published by saving a draft.
