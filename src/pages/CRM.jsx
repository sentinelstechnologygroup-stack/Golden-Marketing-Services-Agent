import { useAuth } from '@/lib/AuthContext';
import GoHighLevelConnection from '@/components/GoHighLevelConnection';

export default function CRM() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  return <div className="space-y-6">
    <header><h1 className="font-heading text-3xl">GMS CRM</h1><p className="mt-2 text-muted-foreground">Live CRM resources inside your GMS workspace. Client data remains in its own connected account.</p></header>
    <GoHighLevelConnection key={user?.organization_id} tenantId={user?.organization_id} workspace />
    {isSuperAdmin && user?.organization_id !== 'gms-internal' && <GoHighLevelConnection tenantId="gms-internal" internal workspace />}
    <p className="text-sm text-muted-foreground">These views are read-only. Assigned agents access individual conversations from their lead record; administration does not grant agents access to every client.</p>
  </div>;
}
