import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ShoppingCart, Users, LogOut, Bot, Menu, X, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

export default function VendedorLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      toast.error('Erro ao sair.');
    }
  };

  const navItems = [
    { to: '/vendedor/vendas', icon: ShoppingCart, label: 'Minhas Vendas' },
    { to: '/vendedor/clientes', icon: Users, label: 'Meus Clientes' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0a0b0f', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Sidebar Desktop */}
      <aside style={{
        width: '240px', flexShrink: 0, backgroundColor: '#111318',
        borderRight: '1px solid #1e2028', display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
      }} className="hidden md:flex">
        {/* Logo */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #1e2028', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #d6006e, #9b0054)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bot style={{ width: '18px', height: '18px', color: '#fff' }} />
          </div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', margin: 0 }}>Agente IA</p>
            <p style={{ fontSize: '11px', color: '#d6006e', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vendedor</p>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '10px', textDecoration: 'none',
                fontSize: '14px', fontWeight: isActive ? 600 : 400,
                color: isActive ? '#fff' : '#8b8fa8',
                backgroundColor: isActive ? 'rgba(214,0,110,0.15)' : 'transparent',
                border: isActive ? '1px solid rgba(214,0,110,0.25)' : '1px solid transparent',
                transition: 'all 0.2s',
              })}
            >
              <Icon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User Profile */}
        <div style={{ padding: '16px 12px', borderTop: '1px solid #1e2028' }}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', borderRadius: '10px', border: 'none',
              backgroundColor: profileOpen ? '#1a1d24' : 'transparent',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #d6006e, #9b0054)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 700, color: '#fff',
            }}>
              {user?.displayName?.[0]?.toUpperCase() || 'V'}
            </div>
            <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.displayName}
              </p>
              <p style={{ fontSize: '11px', color: '#8b8fa8', margin: 0 }}>Vendedor</p>
            </div>
            <ChevronDown style={{ width: '14px', height: '14px', color: '#8b8fa8', transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {profileOpen && (
            <button
              onClick={handleLogout}
              style={{
                marginTop: '4px', width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                padding: '9px 12px', borderRadius: '8px', border: 'none',
                backgroundColor: 'rgba(239,68,68,0.1)', cursor: 'pointer',
                fontSize: '13px', color: '#ef4444', fontWeight: 500,
              }}
            >
              <LogOut style={{ width: '14px', height: '14px' }} />
              Sair
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        backgroundColor: '#111318', borderBottom: '1px solid #1e2028',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
      }} className="md:hidden">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #d6006e, #9b0054)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bot style={{ width: '14px', height: '14px', color: '#fff' }} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Painel Vendedor</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b8fa8' }}
        >
          {mobileOpen ? <X style={{ width: '20px', height: '20px' }} /> : <Menu style={{ width: '20px', height: '20px' }} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 40, backgroundColor: 'rgba(0,0,0,0.7)',
        }} onClick={() => setMobileOpen(false)}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: '240px',
            backgroundColor: '#111318', borderRight: '1px solid #1e2028',
            padding: '60px 12px 20px',
          }} onClick={e => e.stopPropagation()}>
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '10px', textDecoration: 'none',
                  fontSize: '14px', fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#fff' : '#8b8fa8',
                  backgroundColor: isActive ? 'rgba(214,0,110,0.15)' : 'transparent',
                  marginBottom: '4px',
                })}
              >
                <Icon style={{ width: '16px', height: '16px' }} />
                {label}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              style={{
                marginTop: '16px', width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                padding: '9px 12px', borderRadius: '8px', border: 'none',
                backgroundColor: 'rgba(239,68,68,0.1)', cursor: 'pointer',
                fontSize: '13px', color: '#ef4444', fontWeight: 500,
              }}
            >
              <LogOut style={{ width: '14px', height: '14px' }} />
              Sair
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'auto', paddingTop: '0px' }} className="md:pt-0 pt-14">
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
