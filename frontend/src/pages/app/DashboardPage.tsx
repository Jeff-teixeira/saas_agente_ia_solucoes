import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Bot, Zap, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { agentApi } from '../../api/client';

export default function DashboardPage() {
  const { user } = useAuth();
  const { activeTenant } = useTenant();
  const [agentActive, setAgentActive] = useState(false);
  const [agentConfigured, setAgentConfigured] = useState(false);
  const [agentName, setAgentName] = useState('Agente IA');
  const [toggling, setToggling] = useState(false);
  const [loadingAgent, setLoadingAgent] = useState(true);
  const [error, setError] = useState('');

  const loadAgent = useCallback(async () => {
    try {
      const data = await agentApi.getConfig();
      setAgentActive(data.active);
      setAgentConfigured(data.configured);
      if (data.agentName) setAgentName(data.agentName);
    } catch { /* sem backend: mantém estado padrão */ }
    finally { setLoadingAgent(false); }
  }, []);

  useEffect(() => { loadAgent(); }, [loadAgent]);

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
                <h2 className="text-lg font-semibold" style={{ color: '#1a1a1a' }}>{agentName}</h2>
                <p className="text-sm mt-0.5" style={{ color: '#8a8a8a' }}>
                  {loadingAgent ? 'Verificando status...' : agentConfigured ? (agentActive ? 'Ativo e atendendo' : 'Pausado') : 'Não configurado'}
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              onClick={handleToggle}
              disabled={toggling || loadingAgent || !agentConfigured}
              className="relative flex-shrink-0"
              style={{ cursor: (!agentConfigured || toggling) ? 'not-allowed' : 'pointer', opacity: (!agentConfigured) ? 0.4 : 1 }}
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
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: agentActive ? '#16a34a' : '#d0d0d0' }} />
            <span className="text-sm" style={{ color: '#8a8a8a' }}>
              {toggling ? 'Aguardando resposta do agente...' : agentActive ? 'Respondendo no WhatsApp' : 'Agente pausado — clique no botão para ativar'}
            </span>
          </div>

          {agentActive && (
            <div className="mt-4 flex items-center gap-1.5 text-xs font-medium" style={{ color: '#d6006e' }}>
              <Zap className="w-3.5 h-3.5" />
              Agente em operação
            </div>
          )}
        </div>

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
