import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { normalizeEntityRow, normalizeEntityWrite } from './firebaseEntityContract';

const env = (name) => import.meta.env?.[name] || '';
// Public Firebase web configuration for the existing production backend.
// Vercel variables still override these values when configured.
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyA9qG9fo-PtTjSCNU8nH6H3JFfOB8uoSWc',
  authDomain: 'gms-prod-1089114348316.firebaseapp.com',
  projectId: 'gms-prod-1089114348316',
  storageBucket: 'gms-prod-1089114348316.firebasestorage.app',
  messagingSenderId: '852174491354',
  appId: '1:852174491354:web:4d7468295ba977987b5fe3',
};
const firebaseConfig = {
  apiKey: env('VITE_FIREBASE_AGENT_CRM_API_KEY') || env('VITE_FIREBASE_CUSTOMER_PORTAL_API_KEY') || DEFAULT_FIREBASE_CONFIG.apiKey,
  authDomain: env('VITE_FIREBASE_AGENT_CRM_AUTH_DOMAIN') || env('VITE_FIREBASE_CUSTOMER_PORTAL_AUTH_DOMAIN') || DEFAULT_FIREBASE_CONFIG.authDomain,
  projectId: env('VITE_FIREBASE_AGENT_CRM_PROJECT_ID') || DEFAULT_FIREBASE_CONFIG.projectId,
  storageBucket: env('VITE_FIREBASE_AGENT_CRM_STORAGE_BUCKET') || env('VITE_FIREBASE_CUSTOMER_PORTAL_STORAGE_BUCKET') || DEFAULT_FIREBASE_CONFIG.storageBucket,
  messagingSenderId: env('VITE_FIREBASE_AGENT_CRM_MESSAGING_SENDER_ID') || env('VITE_FIREBASE_CUSTOMER_PORTAL_MESSAGING_SENDER_ID') || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
  appId: env('VITE_FIREBASE_AGENT_CRM_APP_ID') || env('VITE_FIREBASE_CUSTOMER_PORTAL_APP_ID') || DEFAULT_FIREBASE_CONFIG.appId,
};
const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
// Configure only after registering the GMS production domains in App Check.
// A missing key leaves the pre-existing authentication behavior unchanged.
const appCheckSiteKey = env('VITE_FIREBASE_APPCHECK_SITE_KEY');
const usingEmulators = import.meta.env.DEV && env('VITE_FIREBASE_USE_EMULATORS') === 'true';
export const firebaseAppCheck = firebaseApp && env('VITE_FIREBASE_APPCHECK_ENABLED') === 'true' && appCheckSiteKey && !usingEmulators
  ? initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  })
  : null;
const auth = getAuth(firebaseApp);
const functions = getFunctions(firebaseApp, 'us-central1');
let profile = null;

const ENTITY_COLLECTIONS = {
  Organization: 'organizations', Brand: 'brands', Campaign: 'campaigns', LeadSource: 'leadSources',
  Lead: 'leads', FollowUpTask: 'followUpTasks', CommunicationAlert: 'communicationAlerts',
  CallRecord: 'callRecords', CallTranscript: 'callTranscripts', CallQualityReview: 'callQualityReviews',
  Appointment: 'appointments', BusinessOwner: 'businessOwners', Script: 'scripts',
  QualificationForm: 'qualificationForms', RoutingRule: 'routingRules', PhoneNumber: 'phoneNumbers',
  Report: 'reports', AuditLog: 'auditLogs', User: 'members',
  Notification: 'notifications',
};
const roleMap = { admin: 'super_admin', gms_super_admin: 'super_admin', supervisor: 'supervisor', agent: 'lead_response_agent', ai_admin: 'ai_admin', auditor: 'auditor' };
const agentRoles = new Set(['super_admin', 'supervisor', 'lead_response_agent', 'ai_admin', 'auditor']);
const ACTIVE_TENANT_KEY = 'gms-agent-active-tenant';
const getTenantId = () => profile?.organization_id || null;

function selectAssignment(assignments) {
  const activeAssignments = (assignments || []).filter((item) => item.status === 'active' && item.tenantStatus !== 'disabled');
  const storedTenantId = window.localStorage.getItem(ACTIVE_TENANT_KEY);
  const selected = activeAssignments.find((item) => item.tenantId === storedTenantId) || activeAssignments[0] || null;
  if (selected?.tenantId) {
    window.localStorage.setItem(ACTIVE_TENANT_KEY, selected.tenantId);
  }
  return { activeAssignments, selected };
}

function applyAssignment(raw, claimedRole, assignments, selected) {
  const assignedBrandIds = Array.isArray(selected?.brandIds) && selected.brandIds.length
    ? selected.brandIds
    : selected?.brandId ? [selected.brandId] : [];
  return {
    ...raw,
    id: raw.uid,
    role: claimedRole,
    organization_id: selected?.tenantId || null,
    tenantId: selected?.tenantId || null,
    tenant_name: selected?.tenantName || selected?.tenantId || null,
    assigned_brand_ids: assignedBrandIds,
    agentAssignments: assignments,
    tenantOptions: assignments.map((item) => ({
      tenantId: item.tenantId,
      name: item.tenantName || item.tenantId,
      industry: item.industry || 'general',
      role: item.role,
      status: item.status,
    })),
  };
}

async function getProfile() {
  const raw = (await httpsCallable(functions, 'getMyProfile')()).data || {};
  if (raw.mustChangePassword) {
    profile = { ...raw, id: raw.uid, role: 'password_change_required', agentAssignments: [], tenantOptions: [] };
    return profile;
  }
  const token = await auth.currentUser?.getIdTokenResult();
  const { activeAssignments, selected } = selectAssignment(raw.agentAssignments);
  const assignmentRole = roleMap[selected?.role] || selected?.role;
  const claimedRole = raw.gmsSuperAdmin ? 'super_admin' : roleMap[token?.claims?.role] || token?.claims?.role || assignmentRole;
  if (!agentRoles.has(claimedRole)) {
    throw Object.assign(new Error('This account is not authorized for the Agent CRM.'), { status: 403 });
  }
  if (!selected) {
    throw Object.assign(new Error('This Agent CRM account does not have an active tenant assignment.'), { status: 403 });
  }
  profile = applyAssignment(raw, claimedRole, activeAssignments, selected);
  return profile;
}

async function entityRows(entityName, filter = {}, sort = '', pageSize = 200) {
  const collectionName = ENTITY_COLLECTIONS[entityName];
  if (!collectionName) return [];
  if (collectionName === 'members') return (await httpsCallable(functions, 'getGmsAgentTeam')({ tenantId: getTenantId() })).data.rows || [];
  const result = await httpsCallable(functions, 'getAgentCollection')({ tenantId: getTenantId(), collectionName, limit: pageSize });
  let rows = (result.data?.rows || []).map((row) => normalizeEntityRow(collectionName, row));
  rows = rows.filter((row) => Object.entries(filter || {}).every(([key, expected]) => expected && typeof expected === 'object' && '$in' in expected ? expected.$in.includes(row[key]) : expected == null || row[key] === expected));
  const field = String(sort || '').replace(/^-/, '');
  if (field) rows.sort((a, b) => String(a[field] || '').localeCompare(String(b[field] || '')) * (String(sort).startsWith('-') ? -1 : 1));
  return rows.slice(0, pageSize);
}

function entityApi(entityName) {
  const collectionName = ENTITY_COLLECTIONS[entityName];
  return {
    list: (limit) => entityRows(entityName, {}, '', limit || 200),
    filter: (filter, sort, limit) => entityRows(entityName, filter, sort, limit || 200),
    get: async (id) => (await entityRows(entityName, {}, '', 500)).find((row) => row.id === id) || null,
    create: async (data) => {
      const normalizedData = normalizeEntityWrite(collectionName, data);
      const response = collectionName === 'appointments'
        ? await httpsCallable(functions, 'appointmentWorkflow')({ tenantId: getTenantId(), action: 'create', data: normalizedData })
        : await httpsCallable(functions, 'createAgentRecord')({ tenantId: getTenantId(), collectionName, data: normalizedData });
      return normalizeEntityRow(collectionName, response.data);
    },
    update: async (id, data) => normalizeEntityRow(collectionName, (await httpsCallable(functions, 'updateAgentRecord')({ tenantId: getTenantId(), collectionName, recordId: id, data: normalizeEntityWrite(collectionName, data) })).data),
    delete: async () => { throw new Error('CRM deletion requires an approved server workflow.'); },
  };
}

export const firebaseClient = {
  clients: {
    invoke: async (name, data = {}) => (await httpsCallable(functions, name)(data)).data,
    upload: async (clientId, file) => {
      const documentId = crypto.randomUUID();
      const storagePath = `tenants/${clientId}/documents/${documentId}/${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      await uploadBytes(ref(getStorage(firebaseApp), storagePath), file, { contentType: file.type || 'application/octet-stream' });
      return (await httpsCallable(functions, 'addGmsClientDocument')({ clientId, documentId, storagePath, name: file.name })).data;
    },
    download: async (storagePath) => getDownloadURL(ref(getStorage(firebaseApp), storagePath)),
  },
  app: { getPublicSettings: async () => ({ id: 'firebase-agent-crm', public_settings: { backend: 'firebase' } }) },
  auth: {
    completeInitialPasswordChange: async (newPassword) => {
      await httpsCallable(functions, 'completeInitialPasswordChange')({ newPassword });
      profile = null;
      await signOut(auth);
    },
    loginViaEmailPassword: async (email, password) => { await signInWithEmailAndPassword(auth, email.trim(), password); return getProfile(); },
    me: async () => {
      await auth.authStateReady();
      if (auth.currentUser) return getProfile();
      throw Object.assign(new Error('Authentication required'), { status: 401 });
    },
    switchTenant: async (tenantId) => {
      const assignment = profile?.agentAssignments?.find((item) => item.tenantId === tenantId && item.status === 'active');
      if (!assignment) throw Object.assign(new Error('This tenant is not assigned to your Agent CRM account.'), { status: 403 });
      window.localStorage.setItem(ACTIVE_TENANT_KEY, tenantId);
      profile = applyAssignment(profile, profile.role, profile.agentAssignments, assignment);
      return profile;
    },
    logout: async () => { profile = null; await signOut(auth); },
    redirectToLogin: () => { window.location.assign('/login'); },
    resetPasswordRequest: async (email) => sendPasswordResetEmail(auth, email.trim(), { url: 'https://agentcrm.goldenmarketingservices.com/login', handleCodeInApp: false }),
    resetPassword: async () => { throw new Error('Use the Firebase password-reset link.'); },
    register: async () => { throw new Error('CRM access is invitation-only.'); },
    verifyOtp: async () => { throw new Error('CRM access is invitation-only.'); },
    resendOtp: async () => { throw new Error('CRM access is invitation-only.'); },
    loginWithProvider: async () => { throw new Error('Use the approved CRM sign-in method.'); },
  },
  entities: new Proxy({}, { get: (_target, entityName) => entityApi(entityName) }),
  functions: { invoke: async (name, data) => (await httpsCallable(functions, name)({ ...data, tenantId: getTenantId() })).data },
};

