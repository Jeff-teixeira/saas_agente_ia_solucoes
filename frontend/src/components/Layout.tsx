import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Settings, LogOut, Shield, ChevronDown, Bell, CreditCard, Zap,
  FileText, Image, Globe, Star, Heart, BookOpen, MessageCircle, HelpCircle, Sun, Moon, Megaphone,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { useBranding } from '../contexts/BrandingContext';
import { useTheme } from '../contexts/ThemeContext';
import { messagesApi, plansApi, bundlesApi, announcementsApi } from '../api/client';
import ImpersonationBanner from './ImpersonationBanner';
import { useState, useRef, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, Users, Settings, CreditCard, FileText, Image, Globe, Shield, Zap, Star, Heart, BookOpen, MessageCircle, HelpCircle,
};

// Logo com tipografia "Agente" magenta + "IA" cinza
function AppLogo() {
  return (
    <span className="font-semibold text-lg tracking-tight hidden sm:block">
      <span style={{ color: '#d6006e' }}>Agente</span>
      <span style={{ color: '#8a8a8a' }}> IA</span>
    </span>
  );
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, memberships } = useAuth();
  const { activeTenant, setActiveTenant } = useTenant();
  const { branding } = useBranding();
  const { resolvedTheme, setTheme } = useTheme();
  const [showTenantMenu, setShowTenantMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showCredits, setShowCredits] = useState(false);
  const [tenantCredits, setTenantCredits] = useState(0);
  const [hasBundles, setHasBundles] = useState(false);
  const [showTeam, setShowTeam] = useState(true);
  const [latestAnnouncement, setLatestAnnouncement] = useState<{ id: string; title: string } | null>(null);
  const [dismissedAnnouncement, setDismissedAnnouncement] = useState<string>(() =>
    localStorage.getItem('dismissed_announcement') || ''
  );
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    if (isAuthenticated) {
      Promise.allSettled([
        messagesApi.unreadCount(),
        plansApi.list(),
        bundlesApi.list(),
        announcementsApi.list(),
      ]).then(([messagesResult, plansResult, bundlesResult, announcementsResult]) => {
        if (messagesResult.status === 'fulfilled') {
          setUnreadCount(messagesResult.value.count);
        }
        if (plansResult.status === 'fulfilled') {
          const data = plansResult.value;
          const hasCredits = data.plans.some((p: { usageCreditsPerMonth: number; bonusCredits: number }) => p.usageCreditsPerMonth > 0 || p.bonusCredits > 0);
          setShowCredits(hasCredits);
          setTenantCredits(data.tenantSubscriptionCredits + data.tenantPurchasedCredits);
          setShowTeam(data.maxPlanUserLimit !== 1);
        }
        if (bundlesResult.status === 'fulfilled') {
          setHasBundles(bundlesResult.value.bundles.length > 0);
        }
        if (announcementsResult.status === 'fulfilled') {
          const anns = announcementsResult.value.announcements;
          if (anns.length > 0) {
            setLatestAnnouncement({ id: anns[0].id, title: anns[0].title });
          }
        }
      });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowTenantMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Build nav items from branding config or fallback to defaults
  const defaultNavItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ...(showTeam ? [{ path: '/team', icon: Users, label: 'Team' }] : []),
    { path: '/plan', icon: CreditCard, label: 'Plan' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const navItems = branding.navItems.length > 0
    ? branding.navItems
        .filter(item => item.visible)
        .filter(item => {
          if (item.id === 'team' && !showTeam) return false;
          return true;
        })
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(item => ({
          path: item.target,
          icon: iconMap[item.icon] || FileText,
          label: item.label,
        }))
    : defaultNavItems;

  const isImpersonating = localStorage.getItem('lastsaas_impersonating') === 'true';

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f7' }}>
      <ImpersonationBanner />
      {/* Header */}
      <header
        className={`sticky ${isImpersonating ? 'top-10' : 'top-0'} z-40`}
        style={{
          backgroundColor: 'rgba(255,255,255,0.85)',
          backdropFilter: 'saturate(180%) blur(20px)',
          borderBottom: '1px solid #e8e8e8',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo + Nav */}
            <div className="flex items-center gap-8">
              <Link to="/dashboard" className="flex items-center gap-2.5">
                <img
                  src="/logo.png"
                  alt="Agente IA"
                  className="h-7 w-auto object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <AppLogo />
              </Link>

              {isAuthenticated && (
                <nav className="hidden md:flex items-center gap-0.5">
                  {navItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                      style={{
                        color: isActive(item.path) ? '#d6006e' : '#555555',
                        backgroundColor: isActive(item.path) ? 'rgba(214, 0, 110, 0.08)' : 'transparent',
                      }}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                  {memberships.some(m => m.isRoot) && (
                    <Link
                      to="/last"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                      style={{
                        color: location.pathname.startsWith('/last') ? '#d6006e' : '#555555',
                        backgroundColor: location.pathname.startsWith('/last') ? 'rgba(214, 0, 110, 0.08)' : 'transparent',
                      }}
                    >
                      <Shield className="w-4 h-4" />
                      <span>Admin</span>
                    </Link>
                  )}
                </nav>
              )}
            </div>

            {/* Right side */}
            {isAuthenticated && (
              <div className="flex items-center gap-3">
                {/* Tenant Switcher */}
                {memberships.length > 1 && (
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setShowTenantMenu(!showTenantMenu)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                      style={{ color: '#555555', backgroundColor: '#f0f0f0', border: '1px solid #e0e0e0' }}
                    >
                      <span className="max-w-[120px] truncate">{activeTenant?.tenantName}</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    {showTenantMenu && (
                      <div
                        className="absolute right-0 mt-2 w-56 py-1 z-50"
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e8e8e8',
                          borderRadius: '8px',
                          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                        }}
                      >
                        {memberships.map((m) => (
                          <button
                            key={m.tenantId}
                            onClick={() => {
                              setActiveTenant(m);
                              setShowTenantMenu(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                            style={{
                              color: m.tenantId === activeTenant?.tenantId ? '#d6006e' : '#333333',
                              backgroundColor: m.tenantId === activeTenant?.tenantId ? 'rgba(214,0,110,0.06)' : 'transparent',
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="truncate">{m.tenantName}</span>
                              <span className="text-xs capitalize" style={{ color: '#8a8a8a' }}>{m.role}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Credits indicator */}
                {showCredits && (
                  <button
                    onClick={() => navigate(hasBundles ? '/buy-credits' : '/plan')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                    style={{ color: '#555555', backgroundColor: '#f0f0f0', border: '1px solid #e0e0e0' }}
                    title="Usage credits"
                  >
                    <Zap className="w-4 h-4" style={{ color: '#d6006e' }} />
                    <span>{tenantCredits.toLocaleString()}</span>
                  </button>
                )}

                {/* Theme toggle */}
                <button
                  onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                  className="transition-colors"
                  style={{ color: '#8a8a8a' }}
                  title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
                  aria-label="Toggle theme"
                >
                  {resolvedTheme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
                </button>

                {/* Messages */}
                <Link
                  to="/messages"
                  className="relative transition-colors"
                  style={{ color: '#8a8a8a' }}
                  aria-label="Messages"
                >
                  <Bell className="w-4.5 h-4.5" />
                  {unreadCount > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 text-white text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center"
                      style={{ backgroundColor: '#d6006e' }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </Link>

                {/* User info */}
                <span className="text-sm font-medium hidden sm:block" style={{ color: '#555555' }}>
                  {user?.displayName}
                </span>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 transition-colors"
                  style={{ color: '#8a8a8a' }}
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Announcement Banner */}
      {latestAnnouncement && latestAnnouncement.id !== dismissedAnnouncement && (
        <div style={{ backgroundColor: 'rgba(214,0,110,0.06)', borderBottom: '1px solid rgba(214,0,110,0.15)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Megaphone className="w-4 h-4 flex-shrink-0" style={{ color: '#d6006e' }} />
              <span style={{ color: '#d6006e' }}>{latestAnnouncement.title}</span>
            </div>
            <button
              onClick={() => {
                setDismissedAnnouncement(latestAnnouncement.id);
                localStorage.setItem('dismissed_announcement', latestAnnouncement.id);
              }}
              className="text-xs ml-4 transition-colors"
              style={{ color: '#8a8a8a' }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet context={{ setUnreadCount, showTeam }} />
      </main>
    </div>
  );
}
