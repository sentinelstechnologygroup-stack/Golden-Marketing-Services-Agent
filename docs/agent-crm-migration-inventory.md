# Current GMS ownership — 2026-10-03

The live GMS CRM uses dedicated project gms-prod-1089114348316. See gms-ownership-isolation.md for the current preservation checklist. The original migration inventory below describes the historical starting point.

# Agent CRM Migration Inventory

## Scope and status

This inventory covers only the Link Marketing Solutions Agent CRM. It is a preservation checklist for replacing the legacy legacy provider service layer. The existing UI is not evidence that a workflow is connected or production-ready.

The repository currently contains legacy provider SDK and Vite-plugin dependencies, a legacy provider client, legacy provider-backed authentication, entity operations throughout the CRM, and legacy provider-hosted communications and Twilio webhook functions. The package manifest has no Firebase SDK, and this repository has no Firebase project configuration, Firestore rules, indexes, or Firebase Functions setup. The CRM therefore cannot safely complete its Firebase migration until it can use the shared backend contract and environment configuration.

## Existing CRM routes to preserve

| Route | Existing screen/workflow |
| --- | --- |
| `/` | Home dashboard |
| `/workspace` | Agent workspace and lead response |
| `/supervisor` | Supervisor workspace |
| `/leads` | Lead inbox |
| `/leads/:id` | Lead detail, call history, qualification, disposition, follow-up, appointment, duplicate review |
| `/brands` | Brand administration |
| `/scripts` | Script management and approval/version history |
| `/qualification-forms` | Qualification form management |
| `/routing-rules` | Routing rules and rotation |
| `/appointments` | Appointment management |
| `/phone-numbers` | Phone-number administration |
| `/business-owners` | Business owner/realtor administration |
| `/audit-log` | Audit history |
| `/settings` | Communications/telephony status |
| `/campaigns` | Campaign management |
| `/lead-sources` | Lead-source management |
| `/login`, `/forgot-password`, `/reset-password`, `/register` | Legacy authentication screens; replace with invitation-based identity and password setup, not open registration |

## Legacy data and service surface

Preserve the fields, relationships, and behavior represented by these legacy entities until mapped to the shared contract: User, Organization, Brand, Campaign, LeadSource, Lead, FollowUpTask, CommunicationAlert, CallRecord, CallTranscript, CallQualityReview, Appointment, BusinessOwner, Script, QualificationForm, RoutingRule, PhoneNumber, and AuditLog.

The CRM calls legacy provider directly from both `src/lib/apiClient.js` and individual screens/components. The central client currently covers agent and supervisor workspaces, lead inbox/detail/disposition, brands, scripts, qualification forms, routing, duplicate detection/merge, follow-ups, callbacks, appointments, notifications, telephony actions, campaigns, lead sources, phone numbers, and admin summaries. Direct page-level calls also exist, so replacing only the central client would not remove the dependency.

Legacy server-side functionality to preserve or explicitly retire with approval:

- Communications actions: health check, call creation, end, hold, resume, and warm transfer.
- Twilio webhook handling for call/recording updates.
- Entity-level read/write authorization and organization/brand relationships.
- The lead disposition flow that records a call and updates lead status/attempt counts.
- Routing rotation, appointment status updates, duplicate marking, notifications, and audit visibility.

## legacy provider-to-shared-backend parity checklist

For each item, record the canonical contract route/collection, authorization rules, implementation link, and test evidence before marking it replaced.

| Capability | Required preservation/equivalent | Status |
| --- | --- | --- |
| Identity and session | Invitation acceptance, password setup/reset, verified identity, disabled-user handling, revocation, and role/membership loading | Blocked on shared auth contract/configuration |
| Tenant and brand scope | Organization membership and assigned-brand scope enforced by verified server identity; deny cross-tenant access | Blocked on shared authorization contract and rules |
| Agent workspace | New-lead, callback, and follow-up queues; assigned brands/campaigns; lead age and status | legacy provider-backed; not migrated |
| Lead inbox/detail | Search/filter, lead context, scripts/forms, calls/tasks/appointments, duplicate warnings | legacy provider-backed; not migrated |
| Dispositions and qualification | Call record, disposition, qualification data, attempt count, next action, valid state transition, audit event | legacy provider-backed; not migrated |
| Routing | Rule selection, round-robin/sequential behavior, ordered GCR primary/approved backup handling, timeout/acceptance audit | legacy provider-backed; server-side contract required |
| Follow-ups/callbacks | Create/update/complete, due-date ordering, notifications, ownership and audit | legacy provider-backed; not migrated |
| Appointments | Create, confirm, reschedule, cancel, attendance, timezone, and lead-state consistency | legacy provider-backed; atomic server behavior required |
| Telephony | Status, create/end/hold/resume/transfer; explicit mock-vs-live state; no false success | legacy provider function-backed; secure server replacement required |
| Admin/configuration | Brands, campaigns, scripts, qualification forms, routing rules, phone numbers, business owners, lead sources | legacy provider-backed; not migrated |
| Audit and QA | Read authorization, append-only operational events, call-quality review, evidence links | Partial legacy entity coverage; shared event contract required |
| Direct navigation | SPA fallback and refresh work for every listed route | Preview rewrite added; production deployment still needs release |
| Preview identity | Clearly labeled, non-production access that cannot authorize production data/actions | Preview bypass exists; retain only in Preview/development |
| legacy provider removal | No legacy provider package/plugin/client/import/env var/function runtime or legacy provider network request remains | Not started; remove only after parity and migration evidence |

## Contract conflict to resolve before implementation

`docs/api-and-webhooks.md` describes a REST API but also describes client-supplied organization, brand, role, and user headers. Those headers are not an authorization source and conflict with the pilot security requirement that the server derive tenant and role scope from a verified token and membership. The shared Backend/Core workstream must publish the authoritative Firebase/API contract, including identity/profile loading, invitation lifecycle, authorization, data operations, privileged mutations, and error envelopes. The CRM must not ship browser-side Firestore writes or trust browser-supplied tenant/role headers as a substitute.

## CRM implementation sequence

### Internal connection correction and resource expansion (September 30, 2026)

GMS internal is a platform workspace, not a customer. Preserve its provider location
and audit history but exclude internal workspaces from customer onboarding lists.
Expose its CRM connection in Admin Settings, independently of telephony readiness.
The new Work > GMS CRM page reads live conversations, calendars, opportunities,
pipelines (including stages), workflows, forms and campaigns through the existing
server-owned location mapping. Settings retains the independent internal connection.
No provider interface is embedded or linked. Existing qualification, billing,
chart, table and demo behavior remains unchanged. Credentials remain server-only.
Automatic contact linking, signed webhook registration/processing, CRM write actions
and Customer Portal synchronization are NOT completed by this read-only expansion.
Do not represent the seven resource views as feature parity with the whole CRM.

### GoHighLevel bounded connector (September 30, 2026)

Preserve onboarding fields and existing Firebase operational screens. Add a saved-client
connection check and read-only conversations/calendars/opportunities panel. Canonical
onboarding location ownership remains `ghlLocationTenants`; credentials stay in Secret
Manager. Full-location reads require fresh platform-admin claims or unscoped active
tenant administrator membership. Assigned agents cannot read location-wide CRM data;
Lead Detail includes a read-only conversation control: ordinary agents require
active assignment, matching brand and lead owner, plus a backend-owned provider
contact mapping. Automatic mapping/webhook synchronization remains pending.
No outbound messages, telephony changes, automatic provisioning or fabricated records.

### GMS central onboarding update (September 30, 2026)

User approved replacing scattered onboarding/provisioning with Administration >
Clients. The previous provisionClient dialog now links to one sectioned form.
Tenant config/onboarding is the canonical source; managed operational records are
projections. Existing unmanaged records remain unchanged. Shared documents and
authenticated campaign approvals are visible in the Customer Portal. Customer
identity preparation and gated routing are server-only. Provider verification,
credentials/webhooks and ad publishing remain external prerequisites, not mocked
success states. See docs/client-onboarding.md for the implementation boundaries.

1. Backend/Core publishes and versions the canonical identity, tenant, data, and operation contract, with emulator/staging access.
2. Replace CRM authentication with invitation-based Firebase identity and server-verified CRM profile/membership loading. Keep public self-registration disabled.
3. Replace the centralized API client and every direct screen-level legacy provider call with the approved backend adapter. Preserve the legacy feature surface above.
4. Move routing decisions, lead transitions, appointment consistency, invitations, audit events, and telephony operations to authorized server-side functions/endpoints.
5. Remove legacy provider SDK/plugin/configuration and legacy functions after all parity rows have equivalent behavior and data migration/retention decisions are recorded.
6. Prove role and tenant allow/deny behavior, every priority workflow, direct route refresh, mock/live separation, and legacy provider absence against staging before production release.

## Current blockers requiring the shared backend/account setup

- Canonical Firebase project/environment IDs and client configuration.
- Firebase Auth profile/membership and invitation endpoint contract.
- Canonical collections/API endpoints, field mapping, indexes, and error semantics.
- Default-deny Firestore/Storage rules and authorization test harness.
- Server-side functions/API for privileged CRM writes, audit/state transitions, and telephony.
- Staging credentials/configuration and Twilio test resources, if telephony is in pilot scope.

Do not enter real customer or lead data into Preview while these controls are absent. The current Preview login bypass is for UI review only.


## Three-provider telephony development â€” 2026-10-02

Provider-neutral portal controls and lazy browser adapters added for Twilio,
Telnyx and SignalWire. Backend preserves existing tenant/brand/lead/contact
contracts and adds authenticated agent sessions, transactional lead acceptance,
conference participant controls, consultation/complete/cancel handoff commands,
SMS consent checks and signed deduplicated call callbacks. Provider names are
removed from the agent call controls. Calling remains explicitly disabled until
the server TELEPHONY_ENABLED gate is activated.

Parity is incomplete: account-specific browser-to-conference linkage, inbound
shared call dispatch/requeue, voicemail, message callbacks, token refresh,
transcription and GHL evidence sync need implementation and live verification.
The new backend telephony README records configuration and these activation
blockers. Do not report SDK compilation as live phone-system acceptance.

## Telnyx-only production migration

Client onboarding now uses a Telnyx phone number ID and E.164 number. Phone
records default to Telnyx; other provider SDKs, secrets and backend adapters
are removed from the active calling path. Browser microphone access is allowed
only for the portal origin. Existing historical call records and demo layouts
are preserved. Recording, signed status events, call controls and tenant/campaign
number selection retain their existing gated workflow. Calling and warm transfer
remain disabled pending account provisioning and live media acceptance.

## October 6 server-controlled calling and OAuth increment

Local browser direct dialing is blocked. The backend calls the provisioned
agent SIP identity first and starts the lead leg only after a signed answered
event, using the server-selected client number. Existing incoming-call answer,
decline and phone controls remain. Live provider rejection of direct outbound
SDK calling, audio, hold/resume and recording acceptance remain unverified.

Client configuration adds an authorization action while preserving existing
connection verification and resource views. The backend creates single-use
state tied to the saved client/location and fresh GMS administrator. OAuth
credentials remain in GMS Secret Manager. This frontend increment is not yet
deployed or accepted end to end; production calling remains disabled.
