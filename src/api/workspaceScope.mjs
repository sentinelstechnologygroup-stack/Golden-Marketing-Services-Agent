const separator = '~';
const idFields = new Set(['id','leadId','lead_id','callId','call_id','activeCallId','brandId','brand_id','campaignId','campaign_id','sourceId','source_id','scriptSetId','script_set_id','qualificationFormId','qualification_form_id','routingProfileId','routing_profile_id','notificationProfileId','notification_profile_id','default_script_id','defaultScriptId','default_qualification_form_id','defaultQualificationFormId','scriptId','formId','recordId','appointmentId','workflowId','consentPolicyId','consent_policy_id','retentionPolicyId','retention_policy_id']);
const idArrays = new Set(['brandIds','brand_ids','campaignIds','campaign_ids','sourceIds','source_ids','candidateLeadIds']);
export function scopedId(tenantId, id) { return typeof id === 'string' && id && !id.includes(separator) ? `${tenantId}${separator}${id}` : id; }
export function splitId(value) { if(typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}~[A-Za-z0-9_-]{1,128}$/.test(value))return null;const index=value.indexOf(separator);return index>0?{tenantId:value.slice(0,index),id:value.slice(index+1)}:null; }
export function scopeValue(value, tenantId, key='', depth=0) {
  if(Array.isArray(value))return value.map(item=>idArrays.has(key)?scopedId(tenantId,item):scopeValue(item,tenantId,'',key==='rows'?0:depth+1));
  if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,k==='id' && depth===0?scopedId(tenantId,v):scopeValue(v,tenantId,k,depth+1)]));
  return key!=='id' && idFields.has(key)?scopedId(tenantId,value):value;
}
export function requestContext(value, fallbackTenantId) {
  const tenants=new Set();
  const decode=(v,key='')=>{if(Array.isArray(v))return v.map(item=>decode(item,idArrays.has(key)?'id':key));if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,item])=>[k,decode(item,k)]));const parsed=idFields.has(key)?splitId(v):null;if(parsed){tenants.add(parsed.tenantId);return parsed.id;}return v;};
  const data=decode(value || {});if(tenants.size>1)throw new Error('An action must target one client.');
  const tenantId=[...tenants][0] || data.tenantId || data.organization_id || fallbackTenantId;
  if(!tenantId)throw new Error('Choose the client on this record before saving.');
  if(data.tenantId && data.tenantId!==tenantId)throw new Error('Record and client do not match.');
  return {tenantId,data};
}
