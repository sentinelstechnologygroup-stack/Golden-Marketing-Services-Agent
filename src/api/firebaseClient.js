import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { normalizeEntityRow, normalizeEntityWrite } from './firebaseEntityContract';
import { scopedId, splitId, scopeValue, requestContext } from './workspaceScope.mjs';

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
const getTenantId = () => profile?.phone_tenant_id || null;

function selectAssignment(assignments) {
  const activeAssignments = (assignments || []).filter(item => item.status === 'active' && !['disabled','archived'].includes(item.tenantStatus));
  const selected = activeAssignments.find(item => item.phoneEnabled) || activeAssignments[0] || null;
  return {activeAssignments, selected};
}

function applyAssignment(raw, claimedRole, assignments, selected) {
  const assignedBrandIds = assignments.flatMap(a => (a.brandIds?.length ? a.brandIds : a.brandId ? [a.brandId] : []).map(id => scopedId(a.tenantId,id)));
  return {
    ...raw,
    id: raw.uid,
    role: claimedRole,
    organization_id: null,
    tenantId: null,
    tenant_name: raw.gmsSuperAdmin ? 'All clients' : 'All assigned clients',
    phone_tenant_id: selected?.phoneEnabled ? selected.tenantId : null,
    phoneAssignments: assignments.filter(a => a.phoneEnabled),
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
  const { activeAssignments, selected } = selectAssignment(raw.agentAssignments);
  const assignmentRole = roleMap[selected?.role] || selected?.role;
  const claimedRole = raw.gmsSuperAdmin ? 'super_admin' : roleMap[raw.role] || raw.role || assignmentRole;
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
  const assignments = profile?.agentAssignments || [];
  const permitted = assignments.filter(a => profile?.gmsSuperAdmin || !['invoices','documents','organizations','auditLogs'].includes(collectionName) || ['admin','client_admin','client_supervisor'].includes(a.role));
  const groups = await Promise.all(permitted.map(async a => {
    const result = collectionName === 'members'
      ? await httpsCallable(functions,'getGmsAgentTeam')({tenantId:a.tenantId})
      : await httpsCallable(functions,'getAgentCollection')({tenantId:a.tenantId,collectionName,limit:pageSize});
    return (result.data?.rows || []).map(row => scopeValue(normalizeEntityRow(collectionName,{...row,tenantId:a.tenantId,client_name:a.tenantName}),a.tenantId));
  }));
  let rows = groups.flat().filter(row => Object.entries(filter || {}).every(([key, expected]) => expected && typeof expected === 'object' && '$in' in expected ? expected.$in.includes(row[key]) : expected == null || row[key] === expected));
  const field = String(sort || '').replace(/^-/, '');
  if (field) rows.sort((a,b)=>String(a[field] || '').localeCompare(String(b[field] || ''))*(String(sort).startsWith('-')?-1:1));
  return rows.slice(0,pageSize);
}
async function invokeScoped(name, value = {}) {
  if(['getGmsStaff','updateGmsStaff','sendGmsSetupEmail','getAiLeadControl','setAiLeadPause','getGmsCallCenterReport','revokeAllSessions'].includes(name))return (await httpsCallable(functions,name)(value)).data;
  const fallback = ['communications','inboundCommunications','getAgentCollection'].includes(name) ? getTenantId() : profile?.agentAssignments?.length === 1 ? profile.agentAssignments[0].tenantId : null;
  const {tenantId,data} = requestContext(value,fallback);
  const result = (await httpsCallable(functions,name)({...data,tenantId})).data;
  return scopeValue(result,tenantId);
}

function entityApi(entityName) {
  const collectionName = ENTITY_COLLECTIONS[entityName];
  return {
    list: (limit) => entityRows(entityName, {}, '', limit || 200),
    filter: (filter, sort, limit) => entityRows(entityName, filter, sort, limit || 200),
    get: async id => { const scope=splitId(id);const result=await invokeScoped('getAgentCollection',{...(scope?{tenantId:scope.tenantId}:{}),collectionName,recordId:id,limit:500});return (result.rows || []).map(row=>normalizeEntityRow(collectionName,row)).find(row=>row.id===id || splitId(row.id)?.id===id) || null; },
    create: async data => {
      const normalizedData=normalizeEntityWrite(collectionName,data);
      const response=await invokeScoped(collectionName==='appointments'?'appointmentWorkflow':'createAgentRecord',{
        ...(collectionName==='appointments'?{action:'create'}:{collectionName}),data:normalizedData,
        ...(data.tenantId || data.organization_id ? {tenantId:data.tenantId || data.organization_id}: {})
      });
      return normalizeEntityRow(collectionName,response);
    },
    update: async (id,data) => normalizeEntityRow(collectionName,await invokeScoped('updateAgentRecord',{collectionName,recordId:id,data:normalizeEntityWrite(collectionName,data)})),
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
  functions: { invoke: invokeScoped },
};

