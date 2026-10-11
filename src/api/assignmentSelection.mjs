export function selectActiveAssignment(assignments, storedTenantId, defaultInitialized) {
  const activeAssignments = (assignments || []).filter(item => item.status === 'active' && item.tenantStatus !== 'disabled');
  const preferred = activeAssignments.find(item => item.defaultWorkspace === true);
  const stored = activeAssignments.find(item => item.tenantId === storedTenantId);
  const selected = (!defaultInitialized && preferred) || stored || preferred || activeAssignments[0] || null;
  return { activeAssignments, selected };
}
