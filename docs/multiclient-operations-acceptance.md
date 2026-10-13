# Assignment-driven multi-client operations — implementation contract

Status: **IN PROGRESS — NOT PRODUCTION APPROVED**.

## Non-negotiable permissions
- `super_admin` and `gms_super_admin`: GMS-wide operational access to all production clients, all related calls, voicemail, leads, recordings, callback queues, and configured lines.
- `admin`, `supervisor`, `lead_response_agent`: only explicit server-managed client grants. No selected-client parameter may enlarge that grant.
- Customer/client users: tenant isolation at API, database, storage, signed media, and phone routing boundaries.
- Client access derives from authenticated identity and server-side assignments, never from UI role names or user-supplied `organization_id`, `brand_id`, or selected-client headers.
- Grant fields: `user_id`, `client_id`, `role`, `line_ids`, `capabilities`, `enabled`, `effective_at`, `revoked_at`, audit metadata. Only super-admin may grant/revoke cross-client access.
- All list reads, media access, browser tokens, calls, call actions, and live subscriptions re-evaluate permissions. Changes invalidate/reload active grants.

## Unified queues
- Server endpoint returns a cursor-paginated merged queue over authorized client IDs with source client ID/name, brand, line, campaign, caller, time, read state, follow-up state and actionable voicemail/media metadata.
- List endpoint differentiates empty success (`200 {items:[],count:0}`) from forbidden (`403`) and unavailable (`5xx`); never collapse errors to “No voicemails are waiting.”
- Super-admin defaults to all clients, others to assigned clients; filters can *narrow* the permitted set only.
- Playback/download uses authenticated, short-lived authorized URLs, checked per voicemail; revoke on removal of assignment.
- Queue transitions (heard, callback pending, closed) audited and idempotent.

## Single telephony identity
- Issue one browser-session token per authenticated user with stable agent identity **not bound to the sidebar's selected client**.
- Incoming DID/TaskRouter route resolves tenant from the provisioned dialed number and workflow; include verified `client_id`, `campaign_id`, `line_id` in call context.
- Calls fan out to online eligible agents whose *server-side grants* cover that line/client. Never rely on browser-supplied client identity.
- Outbound request resolves and authorizes tenant from lead/campaign and selects corresponding approved caller ID; reject ambiguous context, disabled numbers, unauthorized grants.
- Supervisor/admin phone access is a separate explicit `can_answer_calls` grant; super-admin remains entitled to phone registration but must deliberately enable availability to take calls.
- Separate demo from production credentials, queues, phone numbers, traffic, recording stores, campaign IDs and billing ledgers. Tests must never trigger chargeable production events.

## Workspaces and administration
- Implement centralized Users & Permissions with assignment edits, client/line/capability multi-select, effective status, and complete audit trail.
- Replace required client-selector workflow with optional filter; show client labels everywhere. No client switch on login, refresh, tab changes, or background queues.
- On permission change, refresh workspace, live subscriptions, phone routing and cache; remove revoked items immediately.

## Production acceptance gates
1. GMS primary context: super-admin sees both Golden Cross Realty test voicemails with correct labels.
2. GMS primary context: super-admin may register the browser phone, then elect Available.
3. Two-client agent: one registration receives DID calls for both authorized clients; correct greetings and call labels.
4. Unauthorized agent: direct list/read/play/download/call/token attempts return 403 without data leakage.
5. Distinguish empty, 401, 403, 5xx, timeout and provider outage visibly.
6. Demonstrate demo/prod segregation and zero production billing/calling side effects.
7. Log test evidence, backend deployment SHA, browser traces, authorization rules and rollback plan. Deploy only after gate approval.

## Current repository limitations
The agent frontend delegates `browser_session`, `set_availability`, and other call controls to the deployed Firebase `communications` function, whose implementation is not in this repository. Frontend changes do not establish server-side enforcement. Locate and modify deployed function, IAM/security rules, recording retrieval and DID routing *before* considering this complete.

## Paired implementation (2026-10-13)

The Agent branch now calls the Customer backend's user-scoped phone session,
verified incoming context, unified communications queues and centralized grants.
`Connect calling` registers the phone while offline; `Make me available` is a
separate choice. Availability heartbeats expire after 60 seconds. Switching an
optional client context does not disconnect the user's phone. Queue reads refresh
and reauthorize rather than treating errors as empty results.

The Customer backend PR must be reviewed and deployed **with calling disabled**
before these frontend APIs are used. The shared Firebase identifiers and tenant
paths are unchanged. Calling credentials migrate explicitly to server-only
`telephonyIdentities/{uid}`; no selected-assignment fallback is used. Operational
grants must include verified line IDs and capabilities. Legacy grants are not
silently upgraded to phone privileges.

Automated emulator tests are implementation evidence, not live acceptance.
Still required: approved deployment SHA; provisioned unique user credentials;
verified Telnyx restrictions and token-revocation behavior; actual two-client DID
ringing, audio, greeting and call labels; playback origins and recording policy;
permission-change/browser cache checks; demo segregation and rollback evidence.
Keep this PR draft and do not merge or enable production calling until these
requirements pass and deployment is explicitly approved.
