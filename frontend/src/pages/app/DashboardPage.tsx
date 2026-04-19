import { LayoutDashboard, Users, Settings, Shield } from 'lucide-react';
import { Link, useOutletContext } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { useBranding } from '../../contexts/BrandingContext';

const cards = [
  {
    path: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
    description: 'Veja a atividade e métricas da sua organização.',
    color: '#d6006e',
    bg: 'rgba(214,0,110,0.07)',
  },
  {
    path: '/team',
    icon: Users,
    label: 'Equipe',
    description: 'Gerencie membros e convites do time.',
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.07)',
    teamOnly: true,
  },
  {
    path: '/settings',
    icon: Settings,
    label: 'Configurações',
    description: 'Gerencie sua conta e preferências.',
    color: '#555555',
    bg: 'rgba(85,85,85,0.07)',
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { activeTenant, role, isRootTenant } = useTenant();
  const { branding } = useBranding();
  const { showTeam } = useOutletContext<{ showTeam: boolean }>();

  return (
    <div>
      {branding.dashboardHtml && (
        <div className="mb-8" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(branding.dashboardHtml) }} />
      )}

      {/* Greeting */}
      <div className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight" style={{ color: '#1a1a1a' }}>
          Olá, {user?.displayName?.split(' ')[0]} 👋
        </h1>
        <p className="mt-1.5 text-sm" style={{ color: '#8a8a8a' }}>
          {activeTenant?.tenantName} &middot; <span className="capitalize">{role}</span>
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards
          .filter(card => !('teamOnly' in card) || showTeam)
          .map((card) => (
            <Link
              key={card.path}
              to={card.path}
              className="group block p-6 transition-all duration-200"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e8e8e8',
                borderRadius: '12px',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = card.color;
                (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px rgba(0,0,0,0.06)`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = '#e8e8e8';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <div
                className="w-10 h-10 flex items-center justify-center mb-4"
                style={{ backgroundColor: card.bg, borderRadius: '8px' }}
              >
                <card.icon className="w-5 h-5" style={{ color: card.color }} />
              </div>
              <h3 className="text-base font-semibold mb-1" style={{ color: '#1a1a1a' }}>
                {card.label}
              </h3>
              <p className="text-sm" style={{ color: '#8a8a8a' }}>
                {card.description}
              </p>
            </Link>
          ))}

        {isRootTenant && (
          <Link
            to="/test-entitlements"
            className="group block p-6 transition-all duration-200"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e8e8e8',
              borderRadius: '12px',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = '#16a34a';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = '#e8e8e8';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            <div
              className="w-10 h-10 flex items-center justify-center mb-4"
              style={{ backgroundColor: 'rgba(22,163,74,0.07)', borderRadius: '8px' }}
            >
              <Shield className="w-5 h-5" style={{ color: '#16a34a' }} />
            </div>
            <h3 className="text-base font-semibold mb-1" style={{ color: '#1a1a1a' }}>
              Test Entitlements
            </h3>
            <p className="text-sm" style={{ color: '#8a8a8a' }}>
              Teste planos e fluxos de upgrade.
            </p>
          </Link>
        )}
      </div>
    </div>
  );
}
