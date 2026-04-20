import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Bot, Zap, AlertCircle, CreditCard, ShieldCheck, Headphones, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { agentApi, billingApi } from '../../api/client';

export default function DashboardPage() {
  const { user } = useAuth();
  const { activeTenant } = useTenant();
  const [agentActive, setAgentActive] = useState(false);
  const [agentConfigured, setAgentConfigured] = useState(false);
  const [agentName, setAgentName] = useState('Agente IA');
  const [toggling, setToggling] = useState(false);
  const [loadingAgent, setLoadingAgent] = useState(true);
  const [error, setError] = useState('');
  
  const [sub, setSub] = useState<any>(null);
  const [loadingSub, setLoadingSub] = useState(true);

  const loadAgent = useCallback(async () => {
    try {
      const data = await agentApi.getConfig();
      setAgentActive(data.active);
      setAgentConfigured(data.configured);
      if (data.agentName) setAgentName(data.agentName);
    } catch { /* sem backend: mantém estado padrão */ }
    finally { setLoadingAgent(false); }
  }, []);

  const loadSubscription = useCallback(async () => {
    try {
      const data = await billingApi.getMySubscription();
      setSub(data);
    } catch { /* ignora erro silencioso se for admin raiz e nao houver subscription */ }
    finally { setLoadingSub(false); }
  }, []);

  useEffect(() => { loadAgent(); loadSubscription(); }, [loadAgent, loadSubscription]);

  const handleToggle = async () => {
    if (!agentConfigured) { setError('Agente não configurado. Entre em contato com o suporte.'); return; }
    setToggling(true);
    setError('');
    try {
      const res = await agentApi.toggle(!agentActive);
      setAgentActive(res.active);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Falha ao comunicar com o agente. Tente novamente.');
    } finally { setToggling(false); }
  };

  const firstName = user?.displayName?.split(' ')[0] ?? 'Usuário';

  return (
    <div className="max-w-2xl mx-auto">
      {/* Saudação */}
      <div className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight" style={{ color: '#1a1a1a' }}>
          Olá, {firstName} 👋
        </h1>
        <p className="mt-1.5 text-sm" style={{ color: '#8a8a8a' }}>{activeTenant?.tenantName}</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-6 px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Card Principal — Agente IA */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e8e8e8', borderRadius: '16px', padding: '32px' }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center rounded-2xl" style={{ backgroundColor: agentActive ? 'rgba(214,0,110,0.08)' : '#f5f5f7' }}>
                <Bot className="w-6 h-6" style={{ color: agentActive ? '#d6006e' : '#8a8a8a' }} />
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: '#1a1a1a' }}>{agentName || 'Agente IA'}</h2>
                <p className="text-sm mt-0.5" style={{ color: '#8a8a8a' }}>
                  {loadingAgent ? 'Verificando status...' : !agentConfigured ? 'Aguardando configuração pela equipe' : agentActive ? 'Ativo e atendendo' : 'Pronto — clique para ativar'}
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              onClick={handleToggle}
              disabled={toggling || loadingAgent || !agentConfigured}
              className="relative flex-shrink-0"
              style={{ cursor: (!agentConfigured || toggling) ? 'not-allowed' : 'pointer', opacity: (!agentConfigured || toggling) ? 0.4 : 1 }}
              aria-label={agentActive ? 'Desativar agente' : 'Ativar agente'}
            >
              <div
                className="transition-all duration-300"
                style={{
                  width: '56px', height: '32px', borderRadius: '16px',
                  backgroundColor: agentActive ? '#d6006e' : '#d0d0d0',
                  position: 'relative',
                  boxShadow: agentActive ? '0 0 12px rgba(214,0,110,0.3)' : 'none',
                }}
              >
                <div
                  className="absolute top-1 transition-all duration-300"
                  style={{
                    width: '24px', height: '24px', borderRadius: '12px',
                    backgroundColor: '#ffffff',
                    left: agentActive ? '28px' : '4px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                  }}
                />
              </div>
            </button>
          </div>

          {/* Status bar */}
          <div className="mt-6 pt-5 flex items-center gap-2" style={{ borderTop: '1px solid #f0f0f0' }}>
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: !agentConfigured ? '#f59e0b' : agentActive ? '#16a34a' : '#d0d0d0' }} />
            <span className="text-sm" style={{ color: '#8a8a8a' }}>
              {toggling ? 'Aguardando resposta do agente...' : !agentConfigured ? 'Seu agente está sendo preparado pela equipe' : agentActive ? 'Respondendo no WhatsApp' : 'Agente pronto — clique no botão para ativar'}
            </span>
          </div>

          {agentActive && (
            <div className="mt-4 flex items-center gap-1.5 text-xs font-medium" style={{ color: '#d6006e' }}>
              <Zap className="w-3.5 h-3.5" />
              Agente em operação
            </div>
          )}
        </div>

        {/* Card — Chat Up */}
        <ChatUpCard chatupEnabled={!!sub?.chatupEnabled} />

        {/* Card — Assinatura & Faturamento */}
        {!loadingSub && sub && (
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e8e8e8', borderRadius: '16px', padding: '24px' }}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 flex items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(214,0,110,0.08)' }}>
                  <CreditCard className="w-6 h-6" style={{ color: '#d6006e' }} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: '#1a1a1a' }}>Plano {sub.setupPlanName || 'Ativo'}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    {sub.subscriptionStatus === 'active' ? (
                      <span className="flex items-center gap-1 text-sm text-green-600 font-medium"><ShieldCheck className="w-4 h-4"/> Assinatura Ativa</span>
                    ) : sub.subscriptionStatus === 'canceled' ? (
                      <span className="flex items-center gap-1 text-sm text-red-600 font-medium"><AlertCircle className="w-4 h-4"/> Assinatura Cancelada</span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-orange-600 font-medium"><AlertCircle className="w-4 h-4"/> Aguardando Pagamento</span>
                    )}
                  </div>
                </div>
              </div>
              
              {sub.subscriptionStatus === 'active' && sub.subscriptionNextDueDate && (
                <div className="text-right">
                  <span className="text-xs block mb-0.5 uppercase tracking-wider font-semibold" style={{ color: '#a8a8a8' }}>Próxima Renovação</span>
                  <span className="text-[15px] font-semibold" style={{ color: '#1a1a1a' }}>{sub.subscriptionNextDueDate.split('-').reverse().join('/')}</span>
                </div>
              )}
            </div>

            {sub.subscriptionStatus !== 'active' && sub.subscriptionLink && (
              <div className="mt-5">
                <a href={sub.subscriptionLink} target="_blank" rel="noopener noreferrer" className="flex justify-center items-center gap-2 w-full py-3 rounded-xl text-white font-semibold transition-all hover:opacity-90" style={{ backgroundColor: '#d6006e' }}>
                  <CreditCard className="w-4 h-4" />
                  Regularizar Assinatura
                </a>
              </div>
            )}
            
            {sub.setupStatus === 'pending' && sub.setupPaymentLink && (
              <div className="mt-5 p-3.5 bg-orange-50 border border-orange-100 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-orange-900">Taxa de Setup Pendente</div>
                  <div className="text-[13px] text-orange-700 mt-0.5">Quitação necessária para liberação total do painel</div>
                </div>
                <a href={sub.setupPaymentLink} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg transition-colors">
                  Pagar Setup
                </a>
              </div>
            )}
          </div>
        )}

        {/* Card — Suporte */}
        <Link
          to="/messages"
          className="flex items-center gap-4 transition-all duration-200"
          style={{ backgroundColor: '#ffffff', border: '1px solid #e8e8e8', borderRadius: '16px', padding: '20px 24px', textDecoration: 'none' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#d6006e'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 16px rgba(0,0,0,0.06)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e8e8e8'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
        >
          <div className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0" style={{ backgroundColor: 'rgba(124,58,237,0.08)' }}>
            <MessageCircle className="w-5 h-5" style={{ color: '#7c3aed' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>Suporte</p>
            <p className="text-xs mt-0.5" style={{ color: '#8a8a8a' }}>Fale com nossa equipe</p>
          </div>
          <div className="ml-auto" style={{ color: '#d0d0d0', fontSize: '18px' }}>›</div>
        </Link>
      </div>
    </div>
  );
}

// ─── Chat Up Card ───────────────────────────────────────────────────────────

const CHATWOOT_URL = import.meta.env.VITE_CHATWOOT_URL as string | undefined;

function ChatUpCard({ chatupEnabled }: { chatupEnabled: boolean }) {
  const CHATWOOT_URL_FINAL = CHATWOOT_URL || 'https://app.chatwoot.com';

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e8e8e8',
        borderRadius: '16px',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      {/* Ícone */}
      <div
        className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-xl"
        style={{ backgroundColor: chatupEnabled ? 'rgba(99,102,241,0.08)' : '#f5f5f7' }}
      >
        <Headphones className="w-5 h-5" style={{ color: chatupEnabled ? '#6366f1' : '#8a8a8a' }} />
      </div>

      {/* Texto */}
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-semibold" style={{ color: '#1a1a1a' }}>Chat Up</h2>
        <p className="text-xs mt-0.5" style={{ color: '#8a8a8a' }}>
          Centralize conversas e atendimento
        </p>
      </div>

      {/* Botão à direita */}
      {chatupEnabled ? (
        <a
          href={CHATWOOT_URL_FINAL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm"
          style={{ backgroundColor: '#6366f1', color: '#ffffff', textDecoration: 'none', transition: 'opacity 0.2s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.85'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1'; }}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Entrar
        </a>
      ) : (
        <Link
          to="/messages"
          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm"
          style={{ backgroundColor: '#1a1a1a', color: '#ffffff', textDecoration: 'none', transition: 'background 0.2s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#2d2d2d'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#1a1a1a'; }}
        >
          Upgrade
        </Link>
      )}
    </div>
  );
}
