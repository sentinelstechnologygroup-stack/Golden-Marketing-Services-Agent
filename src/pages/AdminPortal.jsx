import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function AdminPortal() {
  const { user } = useAuth();
  const superAdmin = ['super_admin', 'lms_super_admin'].includes(user?.role);
  const links = [
    ...(superAdmin ? [['/clients', 'Clients', 'Client directory, unified onboarding, connections, campaign approvals and shared files.']] : []),
    ['/brands', 'Brands', 'View client brand configuration.'], ['/campaigns', 'Campaigns', 'Review programs and campaign activity.'],
    ['/lead-sources', 'Lead sources', 'Review acquisition sources.'], ['/scripts', 'Scripts & forms', 'Review agent scripts.'],
    ['/routing-rules', 'Routing rules', 'Review campaign-specific routing.'], ['/phone-numbers', 'Phone numbers', 'Review communications configuration.'],
    ['/business-owners', 'Client contacts', 'People and service recipients, distinct from client organizations.'],
    ['/settings', 'Portal settings', 'Account and communications settings.'], ['/audit-log', 'Audit log', 'Recorded administrative and operational activity.'],
  ];
  return <div className="space-y-6"><header><p className="link-eyebrow">Golden Marketing Services</p><h1 className="mt-2 font-heading text-3xl text-[#001922]">Admin Portal</h1><p className="mt-2 text-sm text-[#647274]">GMS administration lives here. Complete onboarding once under Clients; centrally managed records feed the other screens.</p>{superAdmin && <Link to="/clients?new=1" className="mt-4 inline-block rounded-lg bg-[#001922] px-4 py-3 text-sm font-semibold text-white">Add client</Link>}</header><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{links.map(([to,label,detail]) => <Link key={to} to={to} className="rounded-xl border bg-white p-5 shadow-sm hover:border-[#14857F]"><h2 className="font-semibold text-[#001922]">{label}</h2><p className="mt-2 text-sm text-[#647274]">{detail}</p></Link>)}</section></div>;
}
